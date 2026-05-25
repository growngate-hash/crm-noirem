# Sistema de Disponibilidad — Documentación Técnica

## 1. RESUMEN DEL SISTEMA

```
Cliente en /booking
       │
       ▼
Selecciona fecha + servicio
       │
       ▼
GET /api/availability?date=YYYY-MM-DD&service_id=uuid
       │
       ├─── business_hours      → ¿está abierto ese día? ¿de qué hora a qué hora?
       ├─── company_settings    → ¿cuánto tiempo de traslado entre servicios?
       ├─── vehicles            → ¿cuántos vehículos de empresa activos hay?
       ├─── services            → ¿cuánto dura el servicio solicitado?
       └─── bookings (del día)  → ¿qué bloques ya están ocupados por vehículo?
                │
                ▼
         Clasificar cada slot de 30 min
                │
         ┌──────┴──────┐
         ▼             ▼
     available[]    blocked[{ slot, reason }]
         │
         ▼
UI /booking muestra slots en verde (disponible) o gris (bloqueado)
```

**Archivos principales:**
- API: [app/api/availability/route.ts](../app/api/availability/route.ts)
- UI: [app/booking/page.tsx](../app/booking/page.tsx) — funciones `generateTimeSlots`, `slotKey`
- Acceso público: [middleware.ts](../middleware.ts) — excluye `/api/availability` del guard de auth

---

## 2. API /api/availability

**Endpoint:** `GET /api/availability?date=YYYY-MM-DD&service_id=uuid`

**Autenticación:** Ninguna. La ruta está excluida del middleware de autenticación (ver §10).

### Parámetros de entrada

| Parámetro    | Tipo   | Requerido | Descripción                              |
|--------------|--------|-----------|------------------------------------------|
| `date`       | string | Sí        | Fecha en formato `YYYY-MM-DD`            |
| `service_id` | uuid   | No        | ID del servicio para obtener su duración |

Si `date` no cumple el patrón `^\d{4}-\d{2}-\d{2}$` devuelve `400 { error: 'Invalid date' }`.

### Estructura de respuesta

```json
{
  "available": ["08:00", "08:30", "09:00"],
  "blocked": [
    { "slot": "10:00", "reason": "Todos los vehículos ocupados (2/2)" },
    { "slot": "17:30", "reason": "Fuera de horario (cierre 18:00)" }
  ],
  "requestedDurMin": 120,
  "bufferMin": 30
}
```

**Caso especial — día cerrado:**
```json
{ "available": [], "blocked": [], "closed": true }
```

### Headers de respuesta

Todas las respuestas llevan cabeceras anti-caché para evitar que browsers de WhatsApp
u otros clientes cacheen la disponibilidad:

```
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
```

---

## 3. FUENTES DE DATOS

La API lanza **5 queries en paralelo** con `Promise.all`:

### `business_hours`
```sql
SELECT is_open, start_time, end_time
FROM business_hours
WHERE day_of_week = $dayOfWeek
```
- Determina si el negocio está abierto ese día.
- Define el rango horario (`start_time` → `end_time`) del que se generan los slots.
- `day_of_week`: `0` = Lunes … `6` = Domingo (ver §4 para la conversión).

### `company_settings`
```sql
SELECT travel_time_minutes FROM company_settings LIMIT 1
```
- Columna directa (no clave-valor): `travel_time_minutes INTEGER`.
- Define el buffer de traslado que se aplica antes y después de cada reserva.
- Fallback si la columna es NULL: `FALLBACK_BUFFER = 30` minutos.

### `business_settings`
```sql
SELECT timezone FROM business_settings LIMIT 1
```
- Zona horaria IANA de la empresa (ej. `'Asia/Dubai'`, `'America/Bogota'`).
- Usada para convertir los límites del día a UTC y para interpretar las horas de los bookings existentes.
- Fallback si la fila no existe: `FALLBACK_TZ = 'Asia/Dubai'`.
- Se configura desde el panel de Ajustes → Configuración (ver §8).

### `vehicles`
```sql
SELECT id FROM vehicles
WHERE contact_id IS NULL
  AND status != 'inactivo'
```
- Solo vehículos de empresa (`contact_id IS NULL`).
- Excluye vehículos inactivos.
- La disponibilidad se calcula por vehículo individualmente (ver §6).

### `bookings` (query posterior, no en el Promise.all inicial)
```sql
-- Los límites se calculan con localToUTCWithTz():
--   dayStart = localToUTCWithTz(date, '00:00:00', timezone)
--   dayEnd   = localToUTCWithTz(date, '23:59:59', timezone)
SELECT vehicle_id, scheduled_at, end_at,
       services(duration_minutes, duration, duration_hrs)
FROM bookings
WHERE scheduled_at >= dayStart
  AND scheduled_at <= dayEnd
  AND status != 'cancelled'
  AND vehicle_id IS NOT NULL
```
- Reservas del día en la zona horaria de la empresa (leída de `business_settings.timezone`).
- Incluye el servicio asociado para calcular la duración si falta `end_at`.

### `services`
```sql
SELECT duration_minutes, duration, duration_hrs
FROM services
WHERE id = $service_id
```
- Solo se consulta si se pasa `service_id`.
- `duration_minutes` es la fuente primaria (entero en minutos).
- `duration` y `duration_hrs` son texto legacy; se parsean como fallback.
- Fallback si todo es NULL: `FALLBACK_DUR = 60` minutos.

---

## 4. LÓGICA DE SLOTS

### Generación de slots (API)

```typescript
// Slots cada 30 minutos desde apertura hasta cierre
for (let min = OPEN_MIN; min < CLOSE_MIN; min += 30) {
  const h = Math.floor(min / 60)
  const m = min % 60
  BASE_SLOTS.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
}
// Ejemplo con horario 08:00-18:00 → 20 slots:
// ["08:00","08:30","09:00",...,"17:00","17:30"]
```

### Generación de slots (UI — booking page)

```typescript
// app/booking/page.tsx — generateTimeSlots()
for (let hour = 8; hour < 18; hour += 0.5) {
  slots.push({ start: hour, startLabel: formatHour(hour), endLabel: formatHour(hour + 0.5) })
}
// formatHour convierte a 12h: 8 → "8:00 AM", 8.5 → "8:30 AM", 13.5 → "1:30 PM"
```

La UI genera siempre los mismos 20 slots (8:00–17:30) y los marca según la respuesta
de la API. La API genera los slots dinámicamente desde `business_hours`, por lo que
pueden diferir si el horario configurado no es 8:00–18:00.

### slotKey — clave de coincidencia UI ↔ API

```typescript
// Convierte slot.start (número flotante) al formato "HH:MM" que usa la API
const slotKey = `${String(Math.floor(slot.start)).padStart(2,'0')}` +
                `:${String(Math.round((slot.start % 1) * 60)).padStart(2,'0')}`
// 8   → "08:00"
// 8.5 → "08:30"
// 13  → "13:00"
```

### Conversión de zona horaria: UTC → minutos locales

```typescript
// localMinutes() en availability/route.ts — DST-safe, cualquier timezone IANA
function localMinutes(isoStr: string, timezone: string): number {
  const d = new Date(isoStr)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const h = parseInt(parts.find(p => p.type === 'hour')?.value   ?? '0')
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0')
  return (h === 24 ? 0 : h) * 60 + m
}
// "2026-05-24T06:00:00Z" en 'Asia/Dubai' (UTC+4) → 10:00 → 600 minutos
// Reemplaza la antigua dubaiMinutes() que usaba offset fijo (d.getUTCHours() + 4)
```

### Conversión de día de semana

`business_hours` usa `day_of_week = 0` para Lunes (igual que el panel de Settings del CRM).  
JavaScript `Date.getUTCDay()` devuelve `0` para Domingo.

```typescript
const jsDay     = new Date(date).getUTCDay()   // 0=Dom, 1=Lun … 6=Sáb
const dayOfWeek = (jsDay + 6) % 7              // 0=Lun … 6=Dom  ✓
```

---

## 5. LÓGICA DE BLOQUEO

Cada reserva existente genera un **bloque** que cubre:

```
blockStart = scheduled_at (Dubai) − travel_time_minutes
blockEnd   = end_at (Dubai) + travel_time_minutes
             [excepto si end_at >= CLOSE_MIN → no se agrega buffer al final]
```

### Ejemplo

- Servicio de **2 horas** reservado a las **08:00 AM**
- `end_at` = 10:00 AM (calculado por trigger)
- `travel_time_minutes` = 30 min
- Cierre = 18:00

```
blockStart = 08:00 − 30min = 07:30  (480 − 30 = 450 min)
blockEnd   = 10:00 + 30min = 10:30  (600 + 30 = 630 min)

Bloque ocupado: [450, 630] = 07:30 → 10:30
```

Un slot se **bloquea** si `slotStart < blockEnd && blockStart < slotEnd`:

| Slot  | slotStart | slotEnd (+ 2h) | ¿Solapa [450,630]? |
|-------|-----------|-----------------|---------------------|
| 07:30 | 450       | 570             | Sí (450 < 630 ✓)    |
| 08:00 | 480       | 600             | Sí                  |
| 08:30 | 510       | 630             | Sí                  |
| 09:00 | 540       | 660             | Sí                  |
| 09:30 | 570       | 690             | Sí                  |
| 10:00 | 600       | 720             | Sí (600 < 630 ✓)    |
| **10:30** | **630** | **750**       | **No → disponible** |

**Primer slot disponible: 10:30 AM**

### Implementación

```typescript
// bookingToBlock() en availability/route.ts
function bookingToBlock(scheduled_at, end_at, svc, bufferMin, closeMin, timezone): Block {
  const startMin  = localMinutes(scheduled_at, timezone)
  let   durMin    = FALLBACK_DUR  // 60
  if (end_at) {
    const diff = localMinutes(end_at, timezone) - startMin
    durMin = diff > 0 ? diff : FALLBACK_DUR
  } else if (svc) {
    durMin = parseDuration(svc.duration_minutes ?? svc.duration ?? svc.duration_hrs)
  }
  const serviceEnd = startMin + durMin
  const blockEnd   = serviceEnd >= closeMin ? serviceEnd : serviceEnd + bufferMin
  return { startMin: startMin - bufferMin, endMin: blockEnd }
}
```

---

## 6. VEHÍCULOS MÚLTIPLES

Con varios vehículos de empresa, un slot está **disponible** si **al menos uno** no tiene
bloque solapado en ese momento.

```typescript
const freeVehicle = vehicleIds.find(vid =>
  !(vehicleBlocks[vid] ?? []).some(b => overlaps(b, slotStart, slotEnd))
)

if (freeVehicle) {
  available.push(slot)
} else {
  const busyCount = vehicleIds.filter(vid =>
    (vehicleBlocks[vid] ?? []).some(b => overlaps(b, slotStart, slotEnd))
  ).length
  blocked.push({ slot, reason: `Todos los vehículos ocupados (${busyCount}/${vehicleIds.length})` })
}
```

### Ejemplo con 2 vehículos

```
09:00 AM — MOVIL 01: OCUPADO (reserva 8:00-10:00 + buffer 30min)
           MOVIL 02: LIBRE
           → Resultado: DISPONIBLE (MOVIL 02 asignará)

10:00 AM — MOVIL 01: OCUPADO
           MOVIL 02: OCUPADO (otra reserva 10:00-12:00)
           → Resultado: BLOQUEADO "Todos los vehículos ocupados (2/2)"
```

Los bloques se calculan por `vehicle_id`. Si un booking no tiene `vehicle_id` asignado,
se ignora en el cálculo (no consume ningún vehículo).

---

## 7. CASOS ESPECIALES

### Día cerrado
Si `business_hours.is_open = false` para ese día:
```json
{ "available": [], "blocked": [], "closed": true }
```
La UI en `/booking` debería tratar este caso mostrando el día como no seleccionable.

### Sin vehículos activos
Si no hay ningún vehículo con `contact_id IS NULL` y `status != 'inactivo'`:
```typescript
const effectiveIds = vehicleIds.length > 0 ? vehicleIds : null
// ...
if (!effectiveIds) {
  available.push(slot)  // fallback: todos los slots disponibles
  continue
}
```
Todos los slots dentro del horario se devuelven como disponibles.

### Servicio no cabe antes del cierre
Si `slotStart + requestedDurMin > CLOSE_MIN`:
```json
{ "slot": "17:30", "reason": "Fuera de horario (cierre 18:00)" }
```
Ejemplo: servicio de 90 min a las 17:30 terminaría a las 19:00, después del cierre.

### `end_at` NULL en un booking
La columna `end_at` en `bookings` se calcula por trigger cuando se procesa una
`booking_request`. Si por alguna razón es NULL, la función `bookingToBlock` usa:
1. `duration_minutes` del servicio asociado al booking
2. Si también es NULL → `FALLBACK_DUR = 60` minutos

### `duration_minutes` NULL en el servicio solicitado
`parseDuration()` intenta parsear en este orden:
1. `duration_minutes` (integer, fuente primaria)
2. `duration` (texto, ej. `"2h"`, `"90m"`, `"1.5"`)
3. `duration_hrs` (texto legacy)
4. Fallback final: `FALLBACK_DUR = 60`

Valores numéricos menores de 24 se interpretan como horas y se convierten a minutos.

---

## 8. CONFIGURACIÓN DESDE EL CRM

### Tiempo de traslado entre servicios

**Dónde:** Módulo **Reservas** → control "⏱ Traslado: [N] min" en la cabecera del Gantt  
**Tabla:** `company_settings.travel_time_minutes` (columna INTEGER directa)  
**Efecto:** Cambia el buffer antes/después de cada bloque de reserva  
**Rango recomendado:** 15–60 minutos. Default fallback en la API: 30 min.

### Horarios de atención

**Dónde:** Configuración → Integraciones → WhatsApp Business → Horario  
**Tabla:** `business_hours`

| Columna      | Tipo    | Descripción                           |
|--------------|---------|---------------------------------------|
| `day_of_week`| integer | 0=Lunes … 6=Domingo                   |
| `start_time` | time    | Hora de apertura, ej. `"08:00"`       |
| `end_time`   | time    | Hora de cierre, ej. `"18:00"`         |
| `is_open`    | boolean | `false` → día cerrado                 |

### Zona horaria

**Dónde:** Ajustes → Configuración → campo **Zona Horaria**  
**Tabla:** `business_settings.timezone` (texto IANA, ej. `'Asia/Dubai'`, `'Europe/Madrid'`)  
**Efecto:** Determina en qué timezone se interpretan los horarios de atención y se generan los slots  
**Fallback en la API:** `'Asia/Dubai'` si la fila no existe  
**No requiere reiniciar** el servidor — la API lee el valor en cada request

### Estado de vehículos

**Dónde:** Módulo **Vehículos** → columna `status`  
**Valores relevantes:**
- `'inactivo'` → excluido de la disponibilidad
- Cualquier otro valor (`'activo'`, etc.) → incluido si `contact_id IS NULL`

Solo los vehículos de empresa (`contact_id IS NULL`) participan en el cálculo.
Los vehículos de clientes (`contact_id = uuid`) se ignoran.

---

## 9. CÓMO HACER CAMBIOS COMUNES

### Cambiar el intervalo de slots (30 min → 15 min)

**Archivo:** [app/api/availability/route.ts](../app/api/availability/route.ts) — línea del loop de BASE_SLOTS

```typescript
// Cambiar:
for (let min = OPEN_MIN; min < CLOSE_MIN; min += 30)
// Por:
for (let min = OPEN_MIN; min < CLOSE_MIN; min += 15)
```

**También actualizar** [app/booking/page.tsx](../app/booking/page.tsx) — `generateTimeSlots`:

```typescript
// Cambiar:
for (let hour = 8; hour < 18; hour += 0.5)
// Por:
for (let hour = 8; hour < 18; hour += 0.25)
```

### Cambiar la zona horaria

La zona horaria **no se modifica editando código**. Se gestiona desde la base de datos:

**Desde el panel del CRM:**  
Ajustes → Configuración → Zona Horaria → seleccionar timezone IANA

**Directamente en base de datos:**
```sql
UPDATE business_settings SET timezone = 'America/Bogota';
-- o: 'Europe/Madrid', 'Asia/Riyadh', 'America/New_York', etc.
```

La API lee el nuevo valor en cada request sin reiniciar el servidor.  
El fallback `FALLBACK_TZ = 'Asia/Dubai'` solo aplica si la fila de `business_settings` no existe.

> **Pendiente:** `slotToUTC` en [app/booking/page.tsx](../app/booking/page.tsx) aún usa `+04:00`
> hardcodeado. Hasta que se resuelva, el timezone de la página pública de reservas no sigue
> esta configuración. Ver backlog (Fase 3).

### Cambiar el fallback de duración de servicio

**Archivo:** [app/api/availability/route.ts](../app/api/availability/route.ts)

```typescript
const FALLBACK_DUR = 60  // cambiar a los minutos deseados
```

### Cambiar el fallback de tiempo de traslado

**Archivo:** [app/api/availability/route.ts](../app/api/availability/route.ts)

```typescript
const FALLBACK_BUFFER = 30  // cambiar a los minutos deseados
```

### Agregar un nuevo criterio de filtrado de vehículos

**Archivo:** [app/api/availability/route.ts](../app/api/availability/route.ts) — query de vehicles

```typescript
sb.from('vehicles')
  .select('id')
  .is('contact_id', null)
  .neq('status', 'inactivo')
  // agregar aquí: .eq('zone', 'dubai') o similar
```

---

## 10. MIDDLEWARE — Rutas públicas vs protegidas

**Archivo:** [middleware.ts](../middleware.ts)

El middleware aplica autenticación Supabase a todas las rutas **excepto** las listadas
en el matcher como exclusiones con regex negativo:

### Rutas PÚBLICAS (no requieren autenticación)

| Ruta / patrón                   | Motivo                                              |
|---------------------------------|-----------------------------------------------------|
| `/api/availability`             | La usan clientes en `/booking` sin cuenta           |
| `/api/whatsapp/webhook`         | Meta llama a este endpoint sin auth                 |
| `/booking`                      | Página pública de reservas para clientes finales    |
| `/auth`                         | Callbacks de OAuth (Supabase redirect)              |
| `/_next/static`, `/_next/image` | Assets estáticos de Next.js                         |
| `/favicon.ico`                  | Favicon                                             |
| `*.svg`, `*.png`, `*.jpg`, etc. | Archivos de imagen                                  |

### Rutas PROTEGIDAS (requieren autenticación)

Todo lo demás, incluyendo:
- `/` — dashboard principal
- `/(dashboard)/**` — todas las secciones del CRM (bookings, vehicles, contacts…)
- `/login` — incluido en el matcher para redirigir usuarios **ya autenticados** al dashboard

### Comportamiento del middleware

```
Usuario autenticado + ruta /login  → redirect a /
Usuario NO autenticado + ruta CRM  → redirect a /login
Cualquier usuario + ruta pública   → pasa sin redirección
```

### Implementación

```typescript
// middleware.ts
const { data: { user } } = await supabase.auth.getUser()
const isLoginPage = request.nextUrl.pathname.startsWith('/login')

if (user && isLoginPage)  → redirect '/'
if (!user && !isLoginPage) → redirect '/login'
```

Usa `createServerClient` de `@supabase/ssr` con cookies (no `getSession()` — deprecado)
y `getUser()` que verifica el JWT con el servidor de Supabase en cada request.