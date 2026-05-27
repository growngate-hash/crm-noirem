# Sistema de Zona Horaria — Documentación Técnica

## 1. RESUMEN DEL SISTEMA

```
Supabase (PostgreSQL)
  └── Todos los timestamps almacenados en UTC (timestamptz)
           │
           │  conversión al mostrar / al leer
           ▼
  utils/timezone.ts
  ├── toLocalTimeWithTz(utcDate, timezone)   → Date con valores locales de la empresa
  ├── formatHoraWithTz(utcDate, timezone)   → "HH:MM" en hora local
  ├── localToUTCWithTz(fecha, hora, timezone) → UTC ISO para guardar en BD
  ├── getTodayWithTz(timezone)              → hoy en hora local
  └── dayRangeWithTz(date, timezone)        → { start, end } UTC para queries de día completo
           │
           │  timezone viene de
           ▼
  CompanyContext.tsx
  └── business_settings.timezone (IANA string, ej. 'Asia/Dubai')
           │
           │  consumido por componentes via
           ▼
  hooks/useTimezone.ts
  └── funciones pre-configuradas sin pasar timezone manualmente
```

**Archivos principales:**
- Librería: [utils/timezone.ts](../utils/timezone.ts)
- Contexto: [contexts/CompanyContext.tsx](../contexts/CompanyContext.tsx)
- Hook: [hooks/useTimezone.ts](../hooks/useTimezone.ts)
- API disponibilidad: [app/api/availability/route.ts](../app/api/availability/route.ts)
- Migración: [supabase/migrations/20260524_business_settings_timezone.sql](../supabase/migrations/20260524_business_settings_timezone.sql)

---

## 2. PRINCIPIO FUNDAMENTAL

**La base de datos almacena siempre en UTC.** La zona horaria solo existe en la capa de presentación y en los filtros de queries. Nunca se guarda un timestamp en hora local.

```
Al guardar una reserva:
  Formulario: "2026-06-01 09:00" (hora empresa, ej. Dubai UTC+4)
      │
      │  localToUTCWithTz('2026-06-01', '09:00', 'Asia/Dubai')
      ▼
  BD: "2026-06-01T05:00:00.000Z"  ← siempre UTC

Al mostrar una reserva:
  BD: "2026-06-01T05:00:00.000Z"
      │
      │  toLocalTimeWithTz('2026-06-01T05:00:00.000Z', 'Asia/Dubai')
      ▼
  UI: "09:00"  ← hora local de la empresa
```

---

## 3. `utils/timezone.ts` — LIBRERÍA DE HELPERS

### Funciones nuevas (con timezone dinámico)

Todas usan `Intl.DateTimeFormat` internamente, por lo que manejan DST correctamente
para cualquier zona horaria IANA válida.

#### `toLocalTimeWithTz(utcDate, timezone)`

```typescript
toLocalTimeWithTz('2026-06-01T05:00:00.000Z', 'Asia/Dubai')
// → Date cuyo getHours() = 9, getDate() = 1, getMonth() = 5
```

Devuelve un `Date` cuyas propiedades locales (`getHours()`, `getDate()`, etc.)
corresponden a la hora en `timezone`. Este "truco de fecha local" permite usar las
APIs estándar de `Date` sin depender de la zona horaria del navegador.

#### `formatHoraWithTz(utcDate, timezone)`

```typescript
formatHoraWithTz('2026-06-01T05:00:00.000Z', 'Asia/Dubai')
// → "09:00"
formatHoraWithTz(null, 'Asia/Dubai')
// → "—"
```

#### `getHoraDecimalWithTz(utcDate, timezone)`

```typescript
getHoraDecimalWithTz('2026-06-01T05:30:00.000Z', 'Asia/Dubai')
// → 9.5   (09:30 como decimal, usado en el Gantt)
```

#### `localToUTCWithTz(fecha, hora, timezone)`

```typescript
localToUTCWithTz('2026-06-01', '09:00', 'Asia/Dubai')
// → "2026-06-01T05:00:00.000Z"

localToUTCWithTz('2026-06-01', '00:00:00', 'Europe/London')
// → "2026-05-31T23:00:00.000Z"  (BST = UTC+1)
```

Acepta `hora` en formato `"HH:MM"` o `"HH:MM:SS"`.
Calcula el offset real del timezone en esa fecha (incluyendo DST) mediante una
comparación entre lo que `Intl` reporta y el epoch UTC de referencia.

#### `getTodayWithTz(timezone)`

```typescript
getTodayWithTz('Asia/Dubai')
// → Date cuyo getFullYear()/getMonth()/getDate() son los de hoy en Dubai
```

#### `dayRangeWithTz(date, timezone)`

```typescript
const hoy = getTodayWithTz('Asia/Dubai')
dayRangeWithTz(hoy, 'Asia/Dubai')
// → {
//     start: "2026-06-01T20:00:00.000Z",  // medianoche Dubai en UTC
//     end:   "2026-06-02T19:59:59.000Z",  // 23:59:59 Dubai en UTC
//   }
```

`date` debe ser un `Date` cuyas propiedades locales (`getFullYear`, `getMonth`, `getDate`)
correspondan al día deseado en el timezone — es decir, la salida de `getTodayWithTz`
o `toLocalTimeWithTz`. El rango resultante se usa directamente en queries:

```typescript
const { start, end } = dayRangeWithTz(hoy, timezone)
supabase.from('bookings').gte('scheduled_at', start).lte('scheduled_at', end)
```

### Funciones legacy (Dubai hardcodeado)

Siguen exportándose con `@deprecated` para no romper el código existente.
Internamente son alias que llaman a las funciones `*WithTz` con `'Asia/Dubai'`.

| Función legacy | Equivalente nuevo |
|----------------|-------------------|
| `toDubaiTime(utcDate)` | `toLocalTimeWithTz(utcDate, 'Asia/Dubai')` |
| `formatHoraDubai(utcDate)` | `formatHoraWithTz(utcDate, 'Asia/Dubai')` |
| `getHoraDecimalDubai(utcDate)` | `getHoraDecimalWithTz(utcDate, 'Asia/Dubai')` |
| `dubaiToUTC(fecha, hora)` | `localToUTCWithTz(fecha, hora, 'Asia/Dubai')` |
| `getDubaiToday()` | `getTodayWithTz('Asia/Dubai')` |
| `dubaiDayRange(date)` | `dayRangeWithTz(date, 'Asia/Dubai')` |

### Helper interno: `parseTzParts(d, timezone)`

```typescript
// No exportado — usado por todas las funciones *WithTz
function parseTzParts(d: Date, timezone: string): Record<string, number> {
  // Usa Intl.DateTimeFormat para extraer year/month/day/hour/minute/second
  // en el timezone indicado. Normaliza hour=24 → 0 (medianoche en Intl).
}
```

---

## 4. CAMPO `timezone` EN `business_settings`

### Migración aplicada

```sql
-- supabase/migrations/20260524_business_settings_timezone.sql
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Dubai';

UPDATE public.business_settings
  SET timezone = 'Asia/Dubai'
  WHERE timezone IS NULL OR timezone = '';
```

### Columnas relevantes de `business_settings`

| Columna | Tipo | Notas |
|---------|------|-------|
| `user_id` | uuid FK → auth.users | UNIQUE — una fila por usuario |
| `business_name` | text | Nombre del negocio |
| `currency` | text | `'AED'`, `'EUR'`, `'USD'`, etc. |
| `tax_rate` | numeric(5,2) | Porcentaje de IVA (default 5.00) |
| `timezone` | text NOT NULL | **IANA timezone** (default `'Asia/Dubai'`) |

### Valores IANA válidos (ejemplos)

| Zona | Valor IANA |
|------|-----------|
| Dubai / UAE | `'Asia/Dubai'` |
| Riyadh / Arabia Saudí | `'Asia/Riyadh'` |
| Madrid / España | `'Europe/Madrid'` |
| Londres | `'Europe/London'` |
| Nueva York | `'America/New_York'` |
| Ciudad de México | `'America/Mexico_City'` |

La lista completa está disponible en: `Intl.supportedValuesOf('timeZone')`.

---

## 5. `CompanyContext.tsx` — EXPOSICIÓN DEL TIMEZONE

### Interface

```typescript
interface CompanyContextType {
  companyName:     string
  companySubtitle: string
  logoUrl:         string | null
  timezone:        string          // ← IANA timezone de la empresa
  loaded:          boolean         // ← true una vez que business_settings fue leído
  setCompanyName:     (name: string) => void
  setCompanySubtitle: (sub: string) => void
  setLogoUrl:         (url: string | null) => void
  setTimezone:        (tz: string) => void
}
```

### Cómo se carga

El `CompanyProvider` lanza **dos queries en paralelo** al montar:

```typescript
// 1. key-value: company_settings (nombre, subtítulo, logo)
sb.from('company_settings')
  .select('key, value')
  .in('key', ['company_name', 'company_subtitle', 'logo_url'])

// 2. business_settings: timezone de la empresa (pertenece al usuario autenticado)
sb.from('business_settings')
  .select('timezone')
  .maybeSingle()
  .then(({ data }) => {
    if (data?.timezone) setTimezone(data.timezone)
    setLoaded(true)   // siempre se llama; Supabase resuelve con { data, error }
  })
```

El valor por defecto mientras carga (y si no existe la fila) es `'Asia/Dubai'`,
garantizando que el sistema funcione correctamente para Noirem sin configuración extra.
`loaded` pasa a `true` en cuanto el fetch resuelve (con o sin datos).

### Cómo consumirlo directamente

```typescript
import { useCompany } from '@/contexts/CompanyContext'

function MiComponente() {
  const { timezone } = useCompany()
  // timezone = 'Asia/Dubai' (o lo configurado en business_settings)
}
```

---

## 6. `hooks/useTimezone.ts` — HOOK DE CONVENIENCIA

### Propósito

Evita que cada componente tenga que importar helpers Y `useCompany()` por separado
para pasarles el timezone manualmente. El hook los une:

```typescript
import { useTimezone } from '@/hooks/useTimezone'

function BookingRow({ booking }) {
  const tz = useTimezone()

  // Sin el hook: toLocalTimeWithTz(booking.scheduled_at, useCompany().timezone)
  // Con el hook:
  const hora = tz.formatHora(booking.scheduled_at)   // → "09:00"
  const fecha = tz.toLocalTime(booking.scheduled_at)  // → Date local
}
```

### API completa

```typescript
const tz = useTimezone()

tz.ready                            // boolean — true una vez que business_settings cargó
tz.timezone                         // string — 'Asia/Dubai' (la zona activa)
tz.toLocalTime(utcDate)             // → Date con valores locales de la empresa
tz.formatHora(utcDate | null)       // → "HH:MM" o "—"
tz.getHoraDecimal(utcDate)          // → number (9.5 = 09:30)
tz.localToUTC(fecha, hora)          // → UTC ISO string para guardar en BD
tz.getToday()                       // → Date de hoy en hora de la empresa
tz.dayRange(date)                   // → { start: string, end: string } UTC
```

`tz.ready` es útil para inicializar estado que depende del timezone correcto:

```typescript
// Inicializar fechas solo cuando el timezone esté disponible
useEffect(() => {
  if (!tz.ready) return
  const today = tz.getToday()
  setSelectedDay(today)
  setWeekRef(today)
}, [tz.ready])
```

### Restricción: solo en Client Components

`useTimezone` depende de `useCompany` que a su vez usa `createContext`.
Solo puede usarse en componentes con `'use client'`.

Para Server Components o API Routes, usar las funciones `*WithTz` directamente
pasando el timezone leído de Supabase:

```typescript
// En una API Route (Server):
const { data: settings } = await sb.from('business_settings').select('timezone').maybeSingle()
const timezone = settings?.timezone ?? 'Asia/Dubai'
const hoy = getTodayWithTz(timezone)
```

---

## 7. `app/api/availability/route.ts` — ZONA HORARIA DINÁMICA

### Cambio aplicado

La función `dubaiMinutes()` que tenía el offset `+4` hardcodeado fue reemplazada
por `localMinutes(isoStr, timezone)` que usa `Intl.DateTimeFormat`:

```typescript
// Antes (hardcodeado):
function dubaiMinutes(isoStr: string): number {
  const d = new Date(isoStr)
  const h = (d.getUTCHours() + 4) % 24
  return h * 60 + d.getUTCMinutes()
}

// Ahora (dinámico):
function localMinutes(isoStr: string, timezone: string): number {
  const d = new Date(isoStr)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const h = parseInt(parts.find(p => p.type === 'hour')?.value   ?? '0')
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0')
  return (h === 24 ? 0 : h) * 60 + m
}
```

### Query adicional en `Promise.all`

La ruta ahora lanza **5 queries en paralelo** (antes eran 4):

```typescript
const [
  { data: businessHour  },   // horario del día
  { data: travelSetting },   // tiempo de traslado
  { data: tzSetting     },   // ← NUEVO: timezone de business_settings
  { data: svc           },   // duración del servicio
  { data: vehiclesData  },   // vehículos de empresa activos
] = await Promise.all([...])

const timezone = tzSetting?.timezone ?? FALLBACK_TZ  // 'Asia/Dubai' como fallback
```

### Boundaries del día

```typescript
// Antes (hardcodeado):
const dayStart = new Date(`${date}T00:00:00+04:00`).toISOString()
const dayEnd   = new Date(`${date}T23:59:59+04:00`).toISOString()

// Ahora (dinámico):
const dayStart = localToUTCWithTz(date, '00:00:00', timezone)
const dayEnd   = localToUTCWithTz(date, '23:59:59', timezone)
```

---

## 8. BUGS CORREGIDOS (FASE 1)

Estos bugs existían antes del refactor y causaban cálculos incorrectos de fechas.

### Bug 1 — Offset en dirección incorrecta (CRÍTICO)

**Archivos:** `app/(dashboard)/page.tsx` y `app/(dashboard)/finance/page.tsx`

```typescript
// ANTES — INCORRECTO: restaba en lugar de sumar, producía boundaries
// que excluían/incluían transacciones de días adyacentes
const inicioMesUTC = new Date(inicioMes.getTime() - 4 * 3600000).toISOString()
const finMesUTC    = new Date(finMes.getTime()    - 4 * 3600000).toISOString()

// DESPUÉS — usa dubaiDayRange() vía getDubaiToday()
const ahoraDubai = getDubaiToday()
const y = ahoraDubai.getFullYear(), m = ahoraDubai.getMonth()
const { start: inicioMesUTC } = dubaiDayRange(new Date(y, m, 1))
const { end:   finMesUTC }    = dubaiDayRange(new Date(y, m, lastDayMes))
```

**Impacto del bug:** los KPIs de Revenue, Expenses y VAT del dashboard calculaban
el "mes actual" con boundaries incorrectos, pudiendo incluir/excluir hasta 8 horas
de transacciones en los extremos del mes.

### Bug 2 — Parseo de fechas DATE sin timezone

**Archivo:** `app/(dashboard)/finance/page.tsx` (líneas ~521 y ~557)

```typescript
// ANTES — INCORRECTO: new Date('2026-06-01') es medianoche UTC,
// no medianoche Dubai. En navegadores UTC+ se mostraba el día anterior.
new Date(e.date).toLocaleDateString('en-AE', ...)

// DESPUÉS — Dubai midnight explícito
new Date(e.date + 'T00:00:00+04:00').toLocaleDateString('en-AE', ...)
```

Los campos `date`, `issue_date`, `due_date`, `payment_date` se almacenan como tipo
`DATE` (no `TIMESTAMPTZ`) en Postgres. Al parsearlos como `new Date('YYYY-MM-DD')`
el estándar ECMAScript los trata como UTC medianoche, lo que los desplaza un día
en timezones UTC+.

### Bug 3 — Parche `T12:00:00` arbitrario y locale incorrecto

**Archivo:** `app/(dashboard)/finance/page.tsx` (líneas ~1904, ~1908, ~1949, ~1950)

```typescript
// ANTES — INCORRECTO: el mediodía era un parche que evitaba el off-by-one
// pero no resolvía el problema de fondo. Locale 'es-ES' (España) en un CRM de UAE.
new Date(inv.issue_date + 'T12:00:00').toLocaleDateString('es-ES')

// DESPUÉS — medianoche Dubai explícita y locale correcto
new Date(inv.issue_date + 'T00:00:00+04:00').toLocaleDateString('en-AE')
```

### Bug 4 — Offset inline duplicado en bookings

**Archivo:** `app/(dashboard)/bookings/page.tsx` (líneas ~346-348)

```typescript
// ANTES — duplicaba la lógica de toDubaiTime() con math inline,
// y usaba timeZone:'UTC' para mostrar el mes (que debería ser Dubai)
function formatDubaiDate(isoDate: string): string {
  const d = new Date(new Date(isoDate).getTime() + 4 * 60 * 60 * 1000)
  const month = d.toLocaleString('es', { month: 'short', timeZone: 'UTC' })
  ...
}

// DESPUÉS — usa toDubaiTime() y locale/timezone correctos
function formatDubaiDate(isoDate: string): string {
  const d     = toDubaiTime(isoDate)
  const month = d.toLocaleString('es-AE', { month: 'short', timeZone: 'Asia/Dubai' })
  ...
}
```

### Bug 5 — Función `esMismaFechaDubai()` duplicada en vehicles

**Archivo:** `app/(dashboard)/vehicles/page.tsx` (líneas ~190-217)

```typescript
// ANTES — reimplementaba manualmente el offset de toDubaiTime() con
// 4 * 60 + new Date().getTimezoneOffset() para comparar fechas
function esMismaFechaDubai(utcDate: string, fecha: Date): boolean { ... }
const ahoraDubai = new Date(new Date().getTime() + (4 * 60 + new Date().getTimezoneOffset()) * 60 * 1000)

// DESPUÉS — usa getDubaiToday() y dubaiDayRange() para filtrar por rango UTC
const hoyDubai    = getDubaiToday()
const { start: startHoy, end: endHoy } = dubaiDayRange(hoyDubai)
const serviciosHoy = bookings.filter(b =>
  b.scheduled_at >= startHoy && b.scheduled_at <= endHoy
)
```

### Bug 6 — Locale `es-ES` en contabilidad

**Archivo:** `app/(dashboard)/accounting/page.tsx` (líneas ~277, ~455)

```typescript
// ANTES
new Date(entry.entry_date).toLocaleDateString('es-ES')
new Date(row.period).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

// DESPUÉS — Dubai midnight y locale UAE
new Date(entry.entry_date + 'T00:00:00+04:00').toLocaleDateString('en-AE')
new Date(row.period + '-01T00:00:00+04:00').toLocaleDateString('en-AE', { month: 'long', year: 'numeric' })
// row.period es 'YYYY-MM' → se añade '-01' para construir fecha válida
```

---

## 9. TABLA DE CAMPOS DE FECHA EN LA BASE DE DATOS

### Tipo `TIMESTAMPTZ` (con zona horaria — siempre UTC en Postgres)

| Tabla | Campo | Descripción |
|-------|-------|-------------|
| `bookings` | `scheduled_at` | Fecha y hora de la reserva |
| `bookings` | `end_at` | Fin calculado (trigger) |
| `bookings` | `cancelled_at` | Cuándo se canceló |
| `bookings` | `completed_at` | Cuándo se completó |
| `invoices` | `paid_at` | Cuándo se pagó |
| `invoices` | `voided_at` | Cuándo se anuló |
| `invoices` | `issued_at` | Cuándo se emitió |
| `invoices` | `due_at` | Fecha límite de pago |
| Todas las tablas | `created_at` | Creación del registro |
| Todas las tablas | `updated_at` | Última modificación |

### Tipo `DATE` (sin zona horaria — solo fecha del calendario)

Estos campos deben parsearse con `+ 'T00:00:00+04:00'` para evitar off-by-one:

| Tabla | Campo | Descripción |
|-------|-------|-------------|
| `expenses` | `date` | Fecha del gasto |
| `purchase_invoices` | `issue_date` | Fecha de emisión |
| `purchase_invoices` | `due_date` | Fecha de vencimiento |
| `purchase_invoices` | `payment_date` | Fecha de pago |
| `journal_entries` | `entry_date` | Fecha del asiento contable |

---

## 10. CÓMO HACER CAMBIOS COMUNES

### Cambiar la zona horaria de un cliente

1. En Supabase Dashboard → Table Editor → `business_settings` → fila del cliente:
   ```sql
   UPDATE business_settings SET timezone = 'Europe/Madrid' WHERE user_id = '<uuid>';
   ```
2. En el CRM (cuando se implemente en Settings UI):
   - El campo `timezone` se guardará via `sb.from('business_settings').update({ timezone })`
   - Llamar a `setTimezone(nuevoTz)` del `CompanyContext` para actualizar sin recargar.

### Usar `useTimezone` en un nuevo componente

```typescript
'use client'
import { useTimezone } from '@/hooks/useTimezone'

export function MiComponente({ booking }) {
  const tz = useTimezone()

  return (
    <div>
      {/* Hora en formato HH:MM */}
      <span>{tz.formatHora(booking.scheduled_at)}</span>

      {/* Fecha completa en locale UAE */}
      <span>
        {tz.toLocalTime(booking.scheduled_at)
          .toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' })}
      </span>

      {/* Rango del día para un query */}
      <button onClick={async () => {
        const hoy = tz.getToday()
        const { start, end } = tz.dayRange(hoy)
        const { data } = await supabase.from('bookings')
          .gte('scheduled_at', start).lte('scheduled_at', end)
      }}>
        Ver hoy
      </button>
    </div>
  )
}
```

### Migrar un componente de funciones legacy a `useTimezone`

```typescript
// ANTES:
import { toDubaiTime, getDubaiToday, dubaiDayRange } from '@/utils/timezone'
const hoy = getDubaiToday()
const { start, end } = dubaiDayRange(hoy)
const horaLocal = toDubaiTime(booking.scheduled_at)

// DESPUÉS (con hook):
import { useTimezone } from '@/hooks/useTimezone'
const tz = useTimezone()
const hoy = tz.getToday()
const { start, end } = tz.dayRange(hoy)
const horaLocal = tz.toLocalTime(booking.scheduled_at)
```

### Añadir timezone a una nueva API Route (Server)

```typescript
// En cualquier route handler que necesite fechas por timezone:
import { localToUTCWithTz, getTodayWithTz, dayRangeWithTz } from '@/utils/timezone'

const { data: tzRow } = await sb.from('business_settings').select('timezone').maybeSingle()
const timezone = tzRow?.timezone ?? 'Asia/Dubai'

// Rango del día solicitado:
const { start, end } = dayRangeWithTz(getTodayWithTz(timezone), timezone)

// Convertir hora local a UTC para guardar:
const utcTimestamp = localToUTCWithTz('2026-06-01', '09:00', timezone)
```

### Mostrar una fecha DATE de Postgres sin off-by-one

```typescript
// MAL — puede mostrar el día anterior en timezones UTC+
new Date(row.issue_date).toLocaleDateString('en-AE')

// BIEN — medianoche Dubai explícita
new Date(row.issue_date + 'T00:00:00+04:00').toLocaleDateString('en-AE')

// MEJOR (con el timezone de la empresa):
const tz = useTimezone()
new Date(row.issue_date + 'T00:00:00+04:00')  // sigue siendo correcto para Dubai
// Para timezones distintos a Dubai, construir el string con el offset correcto
// o usar localToUTCWithTz y mostrar vía toLocalTime
```

---

## 11. PUNTOS CRÍTICOS A TENER EN CUENTA

1. **`new Date('YYYY-MM-DD')` es UTC medianoche — no Dubai medianoche.** El estándar
   ECMAScript 2015 define que cadenas sin hora se parsean como UTC. Esto causa que en
   navegadores UTC+ se muestre el día anterior. Siempre añadir `'T00:00:00+04:00'` (o
   el offset correspondiente) al parsear campos tipo `DATE`.

2. **Las funciones legacy son aliases — no hacen nada diferente.** `getDubaiToday()`,
   `toDubaiTime()`, etc. internamente llaman a las versiones `*WithTz` con
   `'Asia/Dubai'`. No tienen overhead relevante, pero están marcadas `@deprecated`
   para indicar que en una futura Fase 3 se deben migrar al hook `useTimezone`.

3. **El timezone del servidor de Netlify/Vercel es irrelevante.** Todas las funciones
   `*WithTz` usan `Intl.DateTimeFormat` que opera con el timezone pasado como parámetro,
   no con el timezone del sistema operativo del servidor. El código es correcto en
   cualquier entorno de deploy.

4. **`dayRangeWithTz` requiere un `Date` con propiedades locales correctas.** El
   parámetro `date` debe ser la salida de `getTodayWithTz` o `toLocalTimeWithTz`,
   no un `new Date()` arbitrario. Si se pasa `new Date()`, el año/mes/día extraídos
   serán los del navegador/servidor, que pueden diferir de los de Dubai.

5. **`localToUTCWithTz` usa una aproximación de una sola pasada.** Funciona
   correctamente para todos los timezones sin DST (como Dubai, Riyadh) y con
   precisión de ±1 hora para timezones con DST (Europa, América). Para el caso
   de uso actual (bookings de 09:00 a 18:00) es suficiente. Si se necesita
   precisión absoluta en la transición DST, usar la librería `date-fns-tz`.

6. **`business_settings` tiene `UNIQUE(user_id)` — una fila por empresa.** La
   query `.maybeSingle()` en el availability route (sin filtrar por user_id)
   devuelve la primera fila encontrada. En entornos multi-tenant con múltiples
   empresas, esta query debe filtrarse por el tenant correspondiente.

7. **El setter `setTimezone` en `CompanyContext` es sincrónico en el cliente.**
   Cuando Settings guarde un nuevo timezone, llamar a `setTimezone(nuevoTz)` actualiza
   el contexto inmediatamente para todos los componentes, sin necesidad de recargar la
   página.

8. **Todos los archivos del dashboard han sido migrados a `useTimezone`.** La Fase 3 está
   completa: `bookings/page.tsx`, `finance/page.tsx`, `page.tsx` y `vehicles/page.tsx`
   usan el hook dinámico y respetan el timezone configurado en `business_settings`.

9. **`AVAILABILITY_LOGIC.md` §4 documenta la función `dubaiMinutes()` antigua.** Esa
   sección quedó desactualizada tras este refactor. La función activa ahora es
   `localMinutes(isoStr, timezone)` en `app/api/availability/route.ts`. Si se edita
   la lógica de disponibilidad, referirse a este documento, no a esa sección.

---

## 12. FASE 3 — MIGRACIÓN PENDIENTE

Los componentes del dashboard deben migrar de funciones legacy a `useTimezone` para que
el sistema sea 100% configurable por cliente. Estado actual:

| Archivo | Estado | Funciones pendientes |
|---------|--------|----------------------|
| [app/(dashboard)/bookings/page.tsx](../app/(dashboard)/bookings/page.tsx) | ✅ **Completado** | — |
| [app/(dashboard)/finance/page.tsx](../app/(dashboard)/finance/page.tsx) | ✅ **Completado** | — |
| [app/(dashboard)/page.tsx](../app/(dashboard)/page.tsx) | ✅ **Completado** | — |
| [app/(dashboard)/vehicles/page.tsx](../app/(dashboard)/vehicles/page.tsx) | ✅ **Completado** | — |

Patrón de migración por componente:

```typescript
// 1. Eliminar imports de utils/timezone
// import { getDubaiToday, dubaiDayRange, ... } from '@/utils/timezone'

// 2. Añadir el hook
import { useTimezone } from '@/hooks/useTimezone'

// 3. En el componente:
const tz = useTimezone()

// 4. Sustituir llamadas:
//   getDubaiToday()    → tz.getToday()
//   dubaiDayRange(d)   → tz.dayRange(d)
//   toDubaiTime(iso)   → tz.toLocalTime(iso)
//   formatHoraDubai(x) → tz.formatHora(x)
//   dubaiToUTC(f,h)    → tz.localToUTC(f,h)
```