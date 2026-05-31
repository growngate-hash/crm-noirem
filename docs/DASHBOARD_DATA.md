# Dashboard — Arquitectura de datos

`app/(dashboard)/dashboard/page.tsx` → ruta `/dashboard`

---

## Estructura de `fetchDashboardData()`

La función carga todos los datos del dashboard. Se ejecuta al montar el componente y cada 5 minutos vía `setInterval`. **Optimizada para paralelismo**: usa `Promise.all` en 5 rondas en lugar de awaits secuenciales.

### Tiempo estimado en producción

| Ronda | Queries | Tiempo aprox |
|---|---|---|
| Invoice KPIs (Promise.all) | 4 | ~250ms |
| Bookings + operacional (Promise.all) | 6 | ~250ms |
| Charts ventas (Promise.all 6 meses) | 6 | ~300ms |
| Charts flujo (Promise.all 7 días) | 7 | ~300ms |
| Charts gastos/productos/clientes (Promise.all) | 3 | ~200ms |
| **Total** | **26** | **~800ms** |

---

## Bloque 1 — Invoice KPIs (paralelo)

```typescript
await Promise.all([
  invoices.select('subtotal, tax, total').eq('status', 'pagada'),          // all-time
  invoices.select('subtotal, tax, total, paid_at').gte/lte(mesActual),     // mes actual
  invoices.select('subtotal, tax, total, paid_at').gte/lte(mesAnterior),   // mes anterior
  inventory_items.select('id, name, stock_qty, min_stock, unit, brand'),   // stock
])
```

Calcula: `totalRevenue`, `revenueMTD`, `vatMTD`, `totalProfit`, `deltaRevenue`, `avgOrderValue`, `lowStockAlerts`.

---

## Bloque 2 — Bookings + operacional (paralelo)

```typescript
const hoy    = tz.getToday()  // Date en Dubai
const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1)

await Promise.all([
  bookings.count.in('status', ['confirmed','in_progress','pending']),  // activos
  bookings.select(...).gte/lte(startHoy, endHoy),                     // hoy
  bookings.select(...).gte/lte(startMana, endMana),                   // mañana
  getMonthlyExpenses(supabase, inicioMesStr, finMesStr),              // gastos mes
  reviews.select('rating').gte(inicioMesUTC),                         // CSAT (tabla no existe → Promise.resolve)
  activities.select(...).order('created_at').limit(10),               // feed
])
```

**Notas importantes:**
- `reviews` no existe en la BD — se usa `Promise.resolve({ count:0, data:null, error:null })`. CSAT siempre muestra "Sin datos".
- Los bookings de hoy/mañana se filtran por `scheduled_at` (no `created_at`).
- El timezone es Dubai (UTC+4) — las fechas se calculan con `tz.dayRange()`.

### Reservas de Hoy y Mañana

El JSX muestra dos grupos separados con `bookingsHoy` y `bookingsManana`. Cada grupo tiene:
- Header con la fecha formateada (`formatearFecha()` usa `toLocaleDateString('es-AE', { timeZone: 'Asia/Dubai' })`)
- Tabla con cliente, servicio, vehículo, monto, estado
- Estado vacío: "Sin reservas para hoy/mañana" si el array está vacío

**Columna `contacts`**: usa `contacts(name)` (no `full_name` — la columna real es `name`).

---

## Bloque 3 — Datos de gráficas (paralelo en 3 sub-rondas)

### Sub-ronda A: Ventas por mes (6 queries paralelas)

```typescript
const meses = Array.from({ length: 6 }, (_, i) => ...)  // últimos 6 meses

await Promise.all(
  meses.map(d => invoices.select('subtotal')
    .gte(start).lte(end).in('status', ['pagada','paid'])
  )
)
```

Nota: usa `subtotal` (excl. VAT), no `total`.

### Sub-ronda B: Flujo de reservas (7 queries paralelas)

```typescript
const dias = Array.from({ length: 7 }, (_, i) => ...)  // últimos 7 días

await Promise.all(
  dias.map(d => bookings.select('id', { count: 'exact', head: true })
    .gte(start).lte(end)
  )
)
```

### Sub-ronda C: Gastos, productos, clientes (3 queries paralelas)

```typescript
await Promise.all([
  expenses.select('amount, category').gte/lte(mesStart, mesEnd),
  bookings.select('price, services(name)').eq('status','completed'),
  bookings.select('price, contacts(name)').eq('status','completed'),
])
```

**Notas:**
- `services(name)` — join por FK `service_id` → tabla `services.name`
- `contacts(name)` — join por FK `contact_id` → tabla `contacts.name` (**no** `full_name`)
- Si los arrays están vacíos o todos los valores son 0, el `ChartWidget` muestra "Sin información suficiente" en lugar de la gráfica

---

## Estados de las gráficas (chart states)

```typescript
const [salesData,    setSalesData]    = useState<any[]>([])  // DEMO eliminado
const [flowData,     setFlowData]     = useState<any[]>([])
const [expensesData, setExpensesData] = useState<any[]>([])
const [productsData, setProductsData] = useState<any[]>([])
const [clientsData,  setClientsData]  = useState<any[]>([])
```

Inicializan vacíos — las gráficas muestran "Sin información suficiente" hasta que llegan datos reales. No hay DEMO data.

---

## Componente `ChartWidget`

```typescript
function ChartWidget({ id, onRemove, salesData, flowData, expensesData, productsData, clientsData }) {}
```

Recibe todos los datos como props desde `DashboardPage`. El helper interno:
```typescript
const hasData = (arr: any[], key: string) => arr.length > 0 && arr.some(d => (d[key] ?? 0) > 0)
```

Si `hasData` es false para la gráfica activa → muestra `<EmptyChart/>` (📊 + texto).

### Gráficas y librería

Todas usan **Recharts**:

| ID | Componente | Datos | Color fill |
|---|---|---|---|
| `sales` | `BarChart` + gradiente SVG | `salesData[].{m,v}` | Gradiente `#0B2A4A→#1a4a7a` |
| `flow` | `AreaChart` + área | `flowData[].{d,n}` | `#3DD9D6` |
| `expenses` | `PieChart` donut | `expensesData[].{name,value}` | `CHART_COLORS` |
| `products` | `BarChart` horizontal + gradiente | `productsData[].{name,v}` | Gradiente horizontal navy |
| `clients` | Barras CSS custom | `clientsData[].{name,v}` | `#0B2A4A` |

---

## Timezone — Dubai UTC+4

El hook `useTimezone()` provee:
- `tz.getToday()` → Date representando hoy en Dubai
- `tz.dayRange(date)` → `{ start: ISO, end: ISO }` en UTC
- `tz.timezone` → `'Asia/Dubai'`

Todos los filtros de fecha usan `tz.dayRange()` para garantizar que las 00:00–23:59 de Dubai se conviertan correctamente a UTC.

---

## KPI Cards

### Row 1 (4 cards grandes)

| KPI | Fuente | Color |
|---|---|---|
| Ganancia Neta MTD | `totalRevenue - totalExpenses` | `#1F8F5C` (pos) / `#D9533D` (neg) |
| Ingresos Totales MTD | `calcRevenue(invoicesMes)` | `#1F5A9B` |
| Gastos Totales MTD | `getMonthlyExpenses()` | `#D9533D` |
| Stock Bajo | `lowItems.length` | `var(--gold)` |

### Row 2 (4 cards pequeñas)

| KPI | Fuente |
|---|---|
| Revenue MTD | `revenueMTD` con `%` vs mes anterior |
| Reservas Activas | `bookingsActivosResult.count` |
| Ticket Promedio | `totalRevenue / invoicesPagadas.length` |
| CSAT | Sin datos (tabla `reviews` no existe) |

---

## Tabla `contacts` — columna correcta

La tabla `contacts` usa `name` (no `full_name`). Todas las queries del dashboard usan:
```typescript
.select('contacts(name)')          // join correcto
b.contacts?.name ?? 'Cliente'      // acceso correcto
```

La columna `full_name` no existe en esta tabla — causaba errores 400.

---

## Actividad reciente

El feed de actividad usa la tabla `activities` (no `activity_log` — no existe):

```typescript
activities.select('id, type, description, created_at, contact_id')
  .order('created_at', { ascending: false }).limit(10)
```

Si no hay actividades → fallback a `buildActivityFromBookings(todasReservas)`.
