# Flujo Booking → Contactos — Documentación Técnica

## 1. RESUMEN DEL FLUJO

```
Usuario en /booking
        │
        │  INSERT (anon key, RLS permissive)
        ▼
 booking_requests
        │
        │  AFTER INSERT trigger (SECURITY DEFINER)
        ▼
 sync_booking_request_to_bookings()
        │
        ├─── 1. FIND OR CREATE ──► contacts
        │                          (by customer_phone)
        │
        ├─── 2. FIND OR CREATE ──► vehicles (client)
        │                          contact_id = contact.id
        │                          Para historial del cliente
        │
        ├─── 3. FIND ────────────► vehicles (empresa)
        │                          contact_id IS NULL
        │                          Menor carga ese día
        │
        └─── 4. INSERT ──────────► bookings
                                   vehicle_id = empresa vehicle
                                   contact_id = contact.id
```

---

## 2. TABLA `booking_requests`

### Propósito
Cola de entrada pública. Recibe reservas de clientes anónimos desde `/booking`.
No es la reserva definitiva — el trigger la procesa y crea la reserva real en `bookings`.

### Columnas importantes

| Columna | Tipo | Propósito |
|---|---|---|
| `id` | uuid PK | Identificador |
| `service_id` | uuid FK | Referencia a `services` |
| `service_name` | text | Nombre del servicio (denormalizado) |
| `scheduled_at` | timestamptz NOT NULL | Fecha y hora de la reserva (UTC) |
| `customer_name` | text NOT NULL | Nombre del cliente |
| `customer_phone` | text NOT NULL | Teléfono — clave para find-or-create de contacto |
| `vehicle_make_model` | text | Marca y modelo combinados ("Toyota Land Cruiser 2023") |
| `plate` | text | Matrícula (alias de plate_number) |
| `plate_number` | text | Matrícula — clave para find-or-create de vehículo cliente |
| `address` | text | Dirección completa construida |
| `area` | text | Área de Dubai |
| `community` | text | Comunidad/urbanización |
| `villa_flat` | text | Número de villa o apartamento |
| `address_notes` | text | Notas adicionales de acceso |
| `price` | numeric | Precio base del servicio |
| `vat` | numeric | IVA (5%) |
| `total_amount` | numeric | Precio + IVA |
| `payment_method` | text | `'cash'` o `'online'` |
| `status` | text | `'pending'`, `'confirmed'`, `'cancelled'` |

### Política RLS
```sql
-- Anon puede insertar (página pública /booking)
CREATE POLICY "anon_insert_booking_requests"
  ON booking_requests FOR INSERT TO anon
  WITH CHECK (true);

-- Anon puede leer scheduled_at (para verificar disponibilidad de slots)
CREATE POLICY "anon_read_booking_times"
  ON booking_requests FOR SELECT TO anon
  USING (status != 'cancelled');

-- Staff autenticado puede gestionar todo
CREATE POLICY "auth_manage_booking_requests"
  ON booking_requests FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

---

## 3. TRIGGER `sync_booking_request_to_bookings`

### Metadatos
- **Función:** `sync_booking_request_to_bookings()`
- **Trigger:** `trg_booking_request_to_bookings`
- **Evento:** `AFTER INSERT ON booking_requests FOR EACH ROW`
- **Seguridad:** `SECURITY DEFINER` — corre como el dueño de la función (postgres), ignorando RLS
- **Archivo activo:** `20260524_trigger_add_end_at.sql` (reescribió la función completa para añadir cálculo de `end_at`)

### Paso a paso

**Paso 1 — Find or create contact por teléfono**
```sql
SELECT id INTO v_contact_id FROM contacts
WHERE phone = NEW.customer_phone LIMIT 1;

IF v_contact_id IS NULL THEN
  INSERT INTO contacts (name, phone, tipo)
  VALUES (customer_name, customer_phone, 'cliente')
  RETURNING id INTO v_contact_id;
END IF;
```
- Si el cliente ya reservó antes, reutiliza el mismo contacto.
- Los contactos creados aquí tienen `user_id = NULL` (no pertenecen a ningún usuario del staff).

**Paso 2 — Find or create vehículo del cliente**
```sql
v_plate := COALESCE(NULLIF(NEW.plate_number,''), NULLIF(NEW.plate,''));
v_make  := COALESCE(NULLIF(NEW.vehicle_make_model,''), v_plate, 'Unknown');

IF v_plate IS NOT NULL THEN
  SELECT id INTO v_client_vehicle_id FROM vehicles
  WHERE license_plate = v_plate LIMIT 1;

  IF v_client_vehicle_id IS NULL THEN
    INSERT INTO vehicles (make, license_plate, status, contact_id)
    VALUES (v_make, v_plate, 'libre', v_contact_id);
  END IF;
END IF;
```
- Solo se crea si se proporcionó matrícula.
- `vehicle_make_model` del formulario va completo en `make` (ej. "Toyota Land Cruiser 2023").
- Vinculado al contacto con `contact_id = v_contact_id`.
- **Este vehículo es solo para historial — NO se usa en el booking.**

**Paso 3 — Asignar vehículo de empresa (el que hace el trabajo)**
```sql
SELECT v.id INTO v_company_vehicle_id
FROM vehicles v
LEFT JOIN bookings b
  ON b.vehicle_id = v.id
  AND b.scheduled_at::date = NEW.scheduled_at::date
  AND b.status != 'cancelled'
WHERE v.contact_id IS NULL        -- solo vehículos de empresa
  AND v.status != 'inactivo'
GROUP BY v.id
ORDER BY COUNT(b.id) ASC, v.created_at ASC
LIMIT 1;
```
- Selecciona el vehículo de empresa con **menos bookings ese día** (balanceo de carga).
- Si hay empate, prioriza el creado primero.

**Paso 4 — Insertar booking**
```sql
INSERT INTO bookings (contact_id, vehicle_id, service_id, scheduled_at, end_at, address, notes, price, status)
VALUES (
  v_contact_id,
  v_company_vehicle_id,
  ...,
  NEW.scheduled_at,
  NEW.scheduled_at + (COALESCE(v_duration_minutes, 60) * interval '1 minute'),
  ...
);
```
- `vehicle_id` apunta al **vehículo de empresa**, no al del cliente.
- `contact_id` apunta al contacto del cliente.
- `end_at` se calcula automáticamente desde `duration_minutes` del servicio (fallback: 60 min). La API de disponibilidad depende de este valor para calcular bloques ocupados — si es NULL, usa el fallback de 60 min.

### Manejo de errores
```sql
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_booking_request_to_bookings failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN NEW;  -- falla silenciosa: no bloquea el INSERT en booking_requests
```
Los errores aparecen en los logs de Supabase como `WARNING`, no como errores fatales.
Para depurar, revisar **Supabase Dashboard → Logs → Postgres**.

---

## 4. TABLA `vehicles` — ESTRUCTURA DUAL

La misma tabla `vehicles` almacena dos tipos de registros completamente distintos:

### Vehículos de empresa (flota propia)
```sql
contact_id IS NULL
```
Ejemplos: MOVIL 01, MOVIL 02. Son los vehículos que realizan el servicio.
- Creados manualmente desde el CRM en `/vehicles`.
- Aparecen en el **calendario Gantt** de bookings.
- El trigger los asigna a los bookings.

### Vehículos de clientes
```sql
contact_id = <uuid del cliente>
```
El carro del cliente que va a ser lavado.
- Creados automáticamente por el trigger al procesar un booking.
- Vinculados al contacto mediante `contact_id`.
- Tienen `user_id = NULL` — creados por el trigger con `SECURITY DEFINER`, no pertenecen a ningún usuario del staff.
- Aparecen en la tabla de **Contactos** → columna VEHÍCULOS.
- **NO aparecen en el Gantt** (filtrado por `.is('contact_id', null)`).

### RLS en `vehicles`

La policy principal `team_access_vehicles` filtra por `user_id = get_owner_id()`. Esto excluye los vehículos de clientes (`user_id = NULL`), causando que la columna VEHÍCULOS en Contactos muestre `—`. Se requiere una policy adicional (aplicada en `20260527_fix_vehicles_rls.sql`):

```sql
CREATE POLICY "auth_see_unowned_vehicles"
  ON vehicles FOR SELECT TO authenticated
  USING (user_id IS NULL);
```

Patrón idéntico a `auth_see_unowned_contacts` para contactos del trigger. Ver `docs/MULTI_TENANT.md § Casos especiales`.

### Columnas relevantes

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `contact_id` | uuid FK | NULL = empresa, UUID = cliente |
| `make` | text | Marca o texto completo "Toyota Land Cruiser 2023" |
| `model` | text | Modelo (puede ser 'N/A' si no se proporcionó separado) |
| `license_plate` | text | Matrícula |
| `status` | text | `'libre'`, `'en_ruta'`, `'inactivo'` |
| `name` | text | Nombre del vehículo (ej. "MOVIL 01") |

### Filtro en el Gantt
```typescript
// app/(dashboard)/bookings/page.tsx
sb.from('vehicles')
  .select('id, name, license_plate, status, technician, technicians')
  .is('contact_id', null)  // solo vehículos de empresa
  .order('created_at')
```

---

## 5. TABLA `contacts`

### Cómo se crean
- **Desde el trigger:** find-or-create por `customer_phone`. Tienen `user_id = NULL`.
- **Desde el CRM:** staff autenticado los crea manualmente con `user_id = auth.uid()`.

### Columnas relevantes

| Columna | Notas |
|---|---|
| `id` | uuid PK |
| `name` | Nombre del cliente |
| `phone` | Teléfono — clave de búsqueda en find-or-create |
| `email` | Email (opcional) |
| `tipo` | `'cliente'` o `'proveedor'` |
| `tier` | `'VIP'`, `'Platinum'`, `'Black Diamond'` |
| `address` | Dirección directa del contacto (puede ser NULL para clientes del trigger) |
| `user_id` | NULL para clientes del trigger, UUID para clientes creados por staff |

### RLS
- Política original: `auth.uid() = user_id` (solo ve los propios).
- Política adicional (`20260524_contacts_rls_allow_trigger_contacts.sql`): authenticated puede ver contactos donde `user_id IS NULL`.
- El trigger corre con `SECURITY DEFINER`, evita RLS.

### Vínculos
```
contacts (1) ──── (N) vehicles    via vehicles.contact_id
contacts (1) ──── (N) bookings    via bookings.contact_id
```

### Dirección
Los contactos creados por el trigger NO tienen `address` en la tabla `contacts`.
La dirección está en `bookings.address`. Al mostrar o editar, se busca así:
```typescript
const resolvedAddress = c.address
  || [...c.bookings].sort(byScheduledAtDesc).find(b => b.address)?.address
  || ''
```

---

## 6. PÁGINA `/booking`

### Campos del formulario

| Campo UI | Campo en `CustomerForm` | Columna en `booking_requests` | Obligatorio |
|---|---|---|---|
| Full Name | `full_name` | `customer_name` | Sí |
| WhatsApp Number | `whatsapp` | `customer_phone` | Sí |
| Vehicle Plate Number | `plate_number` | `plate`, `plate_number` | Sí |
| Vehicle Make & Model | `vehicle_model` | `vehicle_make_model`, `vehicle_model` | No |
| Search Location | `address` | `address` (via `buildAddress()`) | Sí |
| Area Name | `area` | `area` | Sí |
| Community Name | `community` | `community` | Sí |
| Villa / Flat Number | `villa_flat` | `villa_flat` | Sí |
| Other Address Details | `address_notes` | `address_notes` | No |

> **Nota:** `plate_number` se envía duplicado como `plate` y `plate_number` por compatibilidad con versiones anteriores del trigger.

### Submit
```typescript
// insert directo con anon key — no pasa por API route
const { error } = await createClient().from('booking_requests').insert({ ... })
```
- Usa la `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- La política RLS `anon_insert_booking_requests` permite el insert.
- No requiere `SUPABASE_SERVICE_ROLE_KEY`.
- `app/api/booking/route.ts` existe pero es un stub vacío — no se usa.

### Disponibilidad de slots
```typescript
fetch(`/api/availability?date=${toYMD(selDate)}&service_id=${selService.id}`, { cache: 'no-store' })
```
Consulta `app/api/availability/route.ts` para obtener los slots bloqueados del día.
`cache: 'no-store'` es obligatorio: browsers de WhatsApp y algunos móviles cachean agresivamente las respuestas fetch, lo que causaría que el cliente vea slots obsoletos. La API también devuelve cabeceras `Cache-Control: no-store` por el mismo motivo.

---

## 7. SECCIÓN CONTACTOS EN EL CRM

### Query principal
```typescript
// app/(dashboard)/contacts/page.tsx
sb.from('contacts')
  .select(`
    id, name, email, phone, address, notes, tier, tipo,
    vehicle_type, license_plate, supplier_type,
    user_id, company_id, created_at, updated_at,
    vehicles(id, make, model, license_plate),
    bookings(id, price, address, scheduled_at)
  `)
  .eq('tipo', 'cliente')   // en tab clientes
  .order('created_at', { ascending: false })
```

### `formatVehicle()` — mostrar vehículo
```typescript
const INVALID = ['', 'N/A', 'Unknown', 'null', 'undefined']
function formatVehicle(v: { make?, model?, license_plate? }) {
  const hasMake  = v.make  && !INVALID.includes(v.make.trim())
  const hasModel = v.model && !INVALID.includes(v.model.trim())
  const plate    = v.license_plate ?? '—'
  if (hasMake && hasModel) return `${v.make} ${v.model} · ${plate}`
  if (hasMake)             return `${v.make} · ${plate}`
  return `· ${plate}`
}
```

### Modal de edición — cargar datos
```typescript
function openEdit(c: any) {
  // Vehículo desde el join vehicles
  const v0 = c.vehicles?.[0]
  const vehicleType = v0
    ? [v0.make, v0.model].filter(x => !['','N/A','Unknown'].includes(x)).join(' ')
    : ''

  // Dirección: contacts.address o booking más reciente
  const resolvedAddress = c.address
    || [...c.bookings].sort(byDesc).find(b => b.address)?.address
    || ''

  setEditForm({
    vehicle_type: vehicleType,
    license_plate: v0?.license_plate ?? '',
    vehicle_id: v0?.id ?? null,  // para saber si UPDATE o INSERT
    address: resolvedAddress,
    ...
  })
}
```

### Modal de edición — guardar datos
```typescript
async function saveEdit() {
  // 1. Actualizar contacts
  await sb.from('contacts').update({ name, phone, email, address, notes, tier })
    .eq('id', editContact.id)

  // 2. Actualizar o crear vehículo
  const make  = parts[0] || 'N/A'
  const model = parts.slice(1).join(' ') || 'N/A'

  if (editForm.vehicle_id) {
    // Existe → UPDATE
    await sb.from('vehicles').update({ make, model, license_plate })
      .eq('id', editForm.vehicle_id)
  } else if (plate) {
    // No existe y hay placa → INSERT
    await sb.from('vehicles').insert({ contact_id, make, model, license_plate, status: 'libre' })
  }
}
```

---

## 8. PUNTOS CRÍTICOS A TENER EN CUENTA

1. **El trigger falla silenciosamente.** El `EXCEPTION WHEN OTHERS THEN RAISE WARNING` hace que los errores no rompan el INSERT en `booking_requests`, pero el contacto/vehículo/booking no se crea. Siempre revisar los logs de Postgres en Supabase si algo no aparece.

2. **Las migraciones `.sql` del repo no se aplican automáticamente.** Deben ejecutarse manualmente en Supabase Dashboard → SQL Editor, o con `supabase db push` si hay CLI configurada. La versión activa del trigger puede ser diferente a la del repo.

3. **`SECURITY DEFINER` es esencial.** Sin él, el trigger correría como el usuario anónimo y RLS bloquearía los inserts en `contacts`, `vehicles` y `bookings`. No eliminar esta cláusula.

4. **Columna `model` en vehicles.** Si se hace un INSERT a `vehicles` omitiendo `model` y la columna tiene `NOT NULL`, fallará silenciosamente. Siempre enviar al menos `'N/A'`.

5. **No confundir los dos `vehicle_id`.** El trigger guarda el vehículo del cliente en `vehicles` para historial, pero el `bookings.vehicle_id` apunta al vehículo de **empresa**. Son diferentes registros.

6. **`user_id IS NULL` en contacts y vehicles del trigger.** Tanto los contactos como los vehículos de clientes creados por el trigger tienen `user_id = NULL`. Las políticas `auth_see_unowned_contacts` y `auth_see_unowned_vehicles` permiten que el staff autenticado los vea. Si se modifica la RLS de cualquiera de estas tablas, verificar que ambas políticas siguen activas. Sin `auth_see_unowned_vehicles`, la columna VEHÍCULOS en Contactos muestra `—` aunque los registros existan en la BD.

7. **`NEXT_PUBLIC_SUPABASE_ANON_KEY` vs `SUPABASE_SERVICE_ROLE_KEY`.** El flujo de `/booking` solo necesita la anon key (política RLS pública). La service role key se necesita solo para operaciones admin. Actualmente `SUPABASE_SERVICE_ROLE_KEY` está vacío en `.env.local` — no es un problema para el flujo de booking.

8. **`company_settings` tiene estructura mixta.** La tabla se usa de dos formas distintas en el mismo proyecto:
   - **Columna directa:** `travel_time_minutes INTEGER` — leída por la API de disponibilidad con `SELECT travel_time_minutes`.
   - **Filas clave-valor:** columnas `key TEXT, value TEXT` — leídas por la Edge Function de WhatsApp para company_name, company_phone, company_email, company_address.

9. **Multi-tenant y `company_settings`.** Todos los SELECTs a `company_settings` desde el frontend deben incluir `.eq('user_id', user.id)` y todos los upserts deben usar `onConflict: 'user_id,key'`. Sin esto, un tenant puede ver o sobrescribir datos de otro. Ver `docs/MULTI_TENANT.md`.

10. **`user_id IS NULL` en contacts y multi-tenancy.** Los contactos del trigger (`user_id = NULL`) son visibles para todos los tenants autenticados mediante la política `auth_see_unowned_contacts`. Esto es intencional para el flujo de reservas públicas, pero implica que un tenant puede ver clientes que reservaron desde `/booking` sin estar asociados a su empresa.
   El control "Traslado" del Gantt guarda via upsert key-value (`{ key: 'travel_time_minutes', value: '30' }`), pero la API lee la columna directa `travel_time_minutes`. **Ambos mecanismos no se sincronizan** — si el guardado desde el CRM no actualiza la columna directa, el cambio no tendrá efecto en la disponibilidad. Verificar qué schema está activo en Supabase.

9. **El Gantt solo muestra vehículos de empresa.** Filtro `.is('contact_id', null)` en `app/(dashboard)/bookings/page.tsx`. Si un vehículo de empresa accidentalmente tiene `contact_id` asignado, desaparecerá del Gantt.

---

## 9. CÓMO HACER CAMBIOS COMUNES

### Agregar un nuevo campo al formulario `/booking`

1. Agregar el campo al tipo `CustomerForm` en `app/booking/page.tsx`:
   ```typescript
   interface CustomerForm {
     // ... campos existentes ...
     nuevo_campo: string
   }
   ```
2. Agregar el input en el JSX del paso 4 (formulario de cliente).
3. Agregar la columna a `booking_requests` vía migración SQL:
   ```sql
   ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS nuevo_campo text;
   ```
4. Incluirlo en el `insert` del `submit()`.
5. Si el trigger debe usarlo, actualizar la función en una nueva migración.

### Agregar una nueva columna a `contacts`

1. Crear migración:
   ```sql
   ALTER TABLE contacts ADD COLUMN IF NOT EXISTS nueva_col text;
   ```
2. Actualizar el `select` en `fetchContacts()` para incluirla.
3. Si el trigger debe popularia, actualizar `sync_booking_request_to_bookings`.
4. Actualizar `openEdit` y `saveEdit` para mostrarla y guardarla.

### Agregar un nuevo vehículo de empresa (MOVIL 02, etc.)

1. Desde el CRM → sección Vehículos → botón "Agregar vehículo".
2. Rellenar nombre (ej. "MOVIL 02"), matrícula, etc.
3. Dejar `contact_id` sin asignar (campo vacío) — esto lo convierte en vehículo de empresa.
4. El trigger lo incluirá automáticamente en la rotación de asignación.

> **Alternativa SQL:**
> ```sql
> INSERT INTO vehicles (name, license_plate, make, model, status)
> VALUES ('MOVIL 02', 'XYZ-002', 'Ford', 'Transit', 'libre');
> -- contact_id queda NULL por defecto
> ```

### Cambiar la lógica de asignación de vehículos

La lógica está en el Paso 3 del trigger. Para cambiarla, crear una nueva migración que reescriba la función. Ejemplo — asignar por zona en lugar de por carga:

```sql
-- Nueva migración: 20260525_trigger_assign_by_zone.sql
DROP TRIGGER IF EXISTS trg_booking_request_to_bookings ON booking_requests;
DROP FUNCTION IF EXISTS sync_booking_request_to_bookings();

CREATE OR REPLACE FUNCTION sync_booking_request_to_bookings()
...
  -- Paso 3 modificado: asignar vehículo por zona
  SELECT v.id INTO v_company_vehicle_id
  FROM vehicles v
  WHERE v.contact_id IS NULL
    AND v.assigned_zone = NEW.area  -- nueva columna hypothética
    AND v.status != 'inactivo'
  LIMIT 1;
  
  -- Fallback si no hay vehículo para esa zona
  IF v_company_vehicle_id IS NULL THEN
    SELECT v.id INTO v_company_vehicle_id
    FROM vehicles v WHERE v.contact_id IS NULL AND v.status != 'inactivo'
    LIMIT 1;
  END IF;
...
```

> Siempre incluir un fallback por si la condición principal no encuentra vehículo.