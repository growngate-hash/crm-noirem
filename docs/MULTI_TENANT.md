# Multi-Tenant Architecture

## Modelo de aislamiento

Este proyecto usa un **único proyecto Supabase** con aislamiento por `user_id` (no proyectos separados por cliente). Cada empresa (tenant) corresponde a un `auth.uid()` — el usuario que la creó (owner). El aislamiento se garantiza a nivel de base de datos mediante Row Level Security (RLS).

```
auth.users
    │
    └── owner_id ──► tenants (una fila por empresa)
                         │
                         ├── business_settings
                         ├── company_settings (key-value)
                         ├── services
                         ├── contacts
                         ├── bookings
                         ├── invoices
                         ├── expenses
                         ├── chart_of_accounts
                         └── ... (todas las tablas de datos)
```

---

## Función crítica: `get_owner_id()`

Definida originalmente en `supabase/migrations/20260526_team_rls.sql`. Reescrita en `supabase/migrations/20260527_fix_get_owner_id.sql` para corregir el error `"more than one row returned by a subquery"` que ocurría en entornos multi-tenant cuando PostgreSQL evalúa la función como subquery escalar dentro de los `WITH CHECK` de RLS.

**Versión activa (desde 2026-05-27):**

```sql
CREATE OR REPLACE FUNCTION public.get_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.team_members WHERE member_id = auth.uid()
    )
    THEN (
      SELECT owner_id FROM public.team_members
      WHERE member_id = auth.uid()
      ORDER BY created_at ASC
      LIMIT 1
    )
    ELSE auth.uid()
  END;
$$;
```

- Si el usuario autenticado es **staff** (está en `team_members`), retorna el `owner_id` de su jefe.
- Si es el **owner** directamente, retorna su propio `auth.uid()`.
- Todas las políticas RLS usan esta función — permite que el staff del tenant acceda a los datos de su empresa sin cambios en el frontend.
- El patrón `CASE/EXISTS` garantiza retorno escalar incluso cuando PostgreSQL evalúa la función como subquery dentro de `WITH CHECK`.

**Reglas críticas:**
- `SECURITY DEFINER` es necesario — permite que la función lea `team_members` independientemente del contexto RLS del caller.
- NO eliminar — rompe el RLS de todas las tablas del sistema.
- NO simplificar de vuelta a `COALESCE` sin `LIMIT 1` explícito en el outer select — causa error 21000 en RLS.

---

## Políticas RLS estándar

Toda tabla de datos del sistema usa esta plantilla:

```sql
ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;
ALTER TABLE nombre_tabla FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON nombre_tabla;
CREATE POLICY "tenant_isolation" ON nombre_tabla
  FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());
```

`FORCE ROW LEVEL SECURITY` es obligatorio — sin él el owner bypasea RLS y ve todos los datos de todos los tenants.

---

## Checklist para tablas nuevas

Toda tabla nueva que almacene datos de negocio debe seguir este proceso:

```sql
-- 1. Columna de aislamiento
ALTER TABLE nueva_tabla
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Activar y forzar RLS
ALTER TABLE nueva_tabla ENABLE ROW LEVEL SECURITY;
ALTER TABLE nueva_tabla FORCE ROW LEVEL SECURITY;

-- 3. Política de aislamiento
CREATE POLICY "tenant_isolation" ON nueva_tabla
  FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());

-- 4. Backfill de datos existentes (SIEMPRE antes de activar RLS en producción)
UPDATE nueva_tabla
  SET user_id = 'afe5c9b1-d3b4-4617-80c0-73743cf92b33'
  WHERE user_id IS NULL;
```

**Noirem owner_id:** `afe5c9b1-d3b4-4617-80c0-73743cf92b33` — usar en todos los backfills de datos de producción existentes.

---

## `company_settings` — regla de upsert

Esta tabla usa una clave compuesta `(user_id, key)`. Siempre usar `onConflict: 'user_id,key'`:

```typescript
// ✅ CORRECTO — aísla por tenant
await supabase.from('company_settings').upsert(
  { user_id: user.id, key: 'company_name', value: 'Mi Empresa' },
  { onConflict: 'user_id,key' }
)

// ❌ INCORRECTO — sobrescribe datos de otros tenants
await supabase.from('company_settings').upsert(
  { key: 'company_name', value: 'Mi Empresa' },
  { onConflict: 'key' }
)
```

Y siempre filtrar por `user_id` en los SELECTs:

```typescript
// ✅ CORRECTO
const { data: { user } } = await sb.auth.getUser()
sb.from('company_settings').select('key, value').eq('user_id', user.id)

// ❌ INCORRECTO — devuelve datos de todos los tenants
sb.from('company_settings').select('key, value')
```

---

## Registro de nuevos tenants (`/api/register`)

Al registrarse un nuevo usuario, `app/api/register/route.ts` crea en paralelo con service role:

| Tabla | Datos creados |
|---|---|
| `tenants` | Registro de la empresa con `status: 'trial'`, `trial_ends_at: now() + 10 días` |
| `business_settings` | `timezone` y `currency` según el país seleccionado |
| `company_settings` | `company_name` y `company_subtitle` base |
| `user_permissions` | Rol `admin` con permisos completos |
| `chart_of_accounts` | 31 cuentas contables base (activos, pasivos, patrimonio, ingresos, gastos) |

El frontend (`app/(auth)/register/page.tsx`) llama a esta API después de `supabase.auth.signUp()`. Si el usuario ya existe en producción sin tenant (legacy Noirem), el middleware lo deja pasar sin redirigir.

### Fuente de países: `lib/countries.ts`

`lib/countries.ts` es la única fuente de verdad para la lista de países con sus `timezone` y `currency`. Es consumida por:

- `app/(auth)/register/page.tsx` — selector de país en el registro (reemplaza array local eliminado)
- `app/(dashboard)/settings/page.tsx` — selector de país en ajustes de empresa; al cambiar el país, `timezone` y `currency` se auto-completan desde este archivo

Los códigos de país usan **ISO 3166-1 alpha-2** (`AE`, `SA`, `CO`, etc.). El código no estándar `UAE` que existía en `settings/page.tsx` fue corregido a `AE`.

Los selectores de `timezone` y `currency` en Settings son dinámicos — se generan deduplicando los valores del array `COUNTRIES` (via `new Set`), por lo que agregar un país al archivo actualiza automáticamente los tres selectores.

---

## Tabla `tenants`

Una fila por empresa. El middleware la lee en cada request autenticado.

```sql
CREATE TABLE tenants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid UNIQUE REFERENCES auth.users(id),
  name          text NOT NULL,
  slug          text UNIQUE,
  plan_id       uuid REFERENCES plans(id),
  status        text CHECK (status IN ('trial', 'active', 'expired', 'suspended')),
  trial_ends_at timestamptz DEFAULT now() + INTERVAL '10 days',
  country       text,
  timezone      text,
  currency      text,
  is_superadmin boolean NOT NULL DEFAULT false  -- agregado en 20260527_admin_panel.sql
);
```

**Estados y redirecciones del middleware:**

| Status | Condición | Redirección |
|---|---|---|
| `trial` | `trial_ends_at < now()` | `/upgrade` |
| `expired` | Siempre | `/upgrade` |
| `suspended` | Siempre | `/suspended` |
| `active` | — | Sin redirección |
| Sin fila en `tenants` | Legacy Noirem | Sin redirección (deja pasar) |

---

## Middleware (`middleware.ts`)

Usa `createClient` con `SUPABASE_SERVICE_ROLE_KEY` para leer `tenants` — necesario porque el anon key no puede leer filas de otros usuarios en esa tabla.

```typescript
const supabaseAdmin = createClient(URL, SUPABASE_SERVICE_ROLE_KEY)
const { data: tenant } = await supabaseAdmin
  .from('tenants')
  .select('status, trial_ends_at')
  .eq('owner_id', user.id)
  .maybeSingle()
```

### Protección de rutas `/admin`

Las rutas `/admin/**` tienen un bloque de guardia propio que se evalúa **antes** de la lógica general de tenants. Retorna early para no interferir con el resto del middleware:

```typescript
if (path.startsWith('/admin')) {
  if (!user) redirect('/login')

  const supabaseAdmin = createClient(URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: adminTenant } = await supabaseAdmin
    .from('tenants')
    .select('is_superadmin')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!adminTenant?.is_superadmin) redirect('/dashboard')
  return supabaseResponse  // superadmin → dejar pasar
}
```

El layout `app/admin/layout.tsx` hace una segunda verificación de sesión vía `createClient()` (cookie-based), pero **no** verifica `is_superadmin` — esa responsabilidad recae en el middleware.

---

## Panel de administración (`/admin`)

Accesible solo para `is_superadmin = true`. Permite a Noirem gestionar todos los tenants del sistema.

### Archivos

| Archivo | Descripción |
|---|---|
| `app/admin/layout.tsx` | Layout con topbar Saffi, logo y email del superadmin. Verifica sesión con cookie-based client |
| `app/admin/page.tsx` | Dashboard: KPIs + tabla de todos los tenants con emails resueltos |
| `app/admin/tenants/[id]/page.tsx` | Detalle de tenant: info, acciones y audit log. Params como `Promise<{ id }>` (Next.js 15) |
| `app/admin/tenants/[id]/TenantActions.tsx` | Client component con botones Activar, Suspender y Extender trial. Llama a `POST /api/admin/tenant` |
| `app/api/admin/tenant/route.ts` | API de acciones administrativas. Verifica superadmin via cookies antes de ejecutar |

### Patrón: resolver emails de `auth.users`

Supabase no permite joins directos a `auth.users` desde el SDK cliente. El panel admin resuelve emails así:

```typescript
// 1. Fetch de tenants con service role
const { data: tenants } = await supabaseAdmin
  .from('tenants')
  .select('id, owner_id, ...')

// 2. Fetch de todos los usuarios de Auth
const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()

// 3. Map owner_id → email
const ownerEmail: Record<string, string> = {}
for (const u of users) {
  if (u.email) ownerEmail[u.id] = u.email
}

// 4. En el render
ownerEmail[t.owner_id] ?? t.owner_id  // fallback al UUID si no hay email
```

Este mismo patrón se usa en `/api/team` para resolver emails de miembros del equipo.

### `POST /api/admin/tenant` — acciones administrativas

Endpoint exclusivo para superadmins. `TenantActions.tsx` lo llama con `{ action, tenantId, payload }`.

**Verificación:** `verifySuperAdmin(req)` lee las cookies de sesión via `createServerClient` de `@supabase/ssr` para obtener el usuario, luego confirma `is_superadmin = true` en `tenants` con service role. Devuelve el `user.id` del admin o `null`.

**Acciones soportadas:**

| `action` | Efecto en `tenants` | `payload` |
|---|---|---|
| `activate` | `status = 'active'` | — |
| `suspend` | `status = 'suspended'` | — |
| `extend_trial` | `status = 'trial'`, `trial_ends_at += days` | `{ days: number }` (default 7) |

Tras cada acción exitosa inserta un registro en `admin_audit_log` con `performed_by`, `action`, `affected_tenant_id` y `payload`.

**Seguridad:** La ruta no está excluida del middleware — el bloque `/admin` del middleware ya bloquea el acceso a no-superadmins antes de que llegue al handler. La API hace su propia verificación de forma independiente como segunda capa.

### `admin_audit_log`

Tabla para registrar acciones administrativas (activar, suspender, extender trial, notas). Solo accesible para superadmins vía RLS:

```sql
CREATE POLICY "superadmin_all" ON admin_audit_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tenants
      WHERE tenants.owner_id = auth.uid()
      AND tenants.is_superadmin = true
    )
  );
```

Columnas: `performed_by`, `action`, `affected_tenant_id`, `payload (jsonb)`, `note`, `created_at`.

Rutas excluidas del matcher (no pasan por middleware):
`_next/static`, `_next/image`, `favicon.ico`, `api/availability`, `api/whatsapp/webhook`, `api/register`, `booking`, `auth`, imágenes.

---

## Staff e invitaciones (`team_members`)

```sql
CREATE TABLE team_members (
  owner_id   uuid REFERENCES auth.users(id),
  member_id  uuid REFERENCES auth.users(id),
  UNIQUE (owner_id, member_id)
);
```

### `/api/invite` — flujo de invitación

Al invitar un staff, la API:

1. Comprueba si el email ya existe en Supabase Auth via `auth.admin.listUsers()`.
   - **Usuario existente**: usa su `id` directamente, sin enviar email de invitación.
   - **Usuario nuevo**: llama a `auth.admin.inviteUserByEmail()` y envía el email.
2. Hace upsert en `user_permissions` con el rol y permisos base.
3. Hace upsert en `team_members` con `{ owner_id, member_id }` para que `get_owner_id()` retorne el `owner_id` del staff y RLS le dé acceso automático a los datos de la empresa.

El `owner_id` del invitante se obtiene desde las cookies de sesión (via `@supabase/ssr`), no desde el header `Authorization` — el frontend no lo enviaba.

### `/api/team` — listado del equipo

`GET /api/team` devuelve todos los miembros del tenant autenticado:

```typescript
// 1. Lee team_members filtrando por owner_id = auth.uid() (anon client, RLS activa)
// 2. Construye allIds = [owner, ...miembros]
// 3. Lee user_permissions con supabaseAdmin (service role — bypasea RLS para leer permisos de todos)
// 4. Resuelve emails via auth.admin.getUserById() por cada id
```

**Crítico**: la query a `user_permissions` usa `supabaseAdmin` (service role), no el cliente anon. La tabla `user_permissions` tiene RLS que filtra por `user_id = auth.uid()`, lo que haría invisible los permisos de los miembros staff al owner si se usara el cliente anon.

---

## Vistas contables (`v_trial_balance`, `v_income_statement`, `v_vat_report`)

Estas vistas deben filtrar por `user_id` internamente:

```sql
-- Patrón obligatorio en la definición de cada vista contable
WHERE ca.user_id = auth.uid()
```

Si se recrean o modifican estas vistas, **siempre mantener este filtro**. Sin él, Balance de Comprobación, Estado de Resultados y Reporte VAT muestran datos consolidados de todos los tenants.

---

## Tablas con problemas conocidos (pendiente de backfill)

Las siguientes tablas fueron creadas antes de la arquitectura multi-tenant y requieren backfill y activación de RLS en producción:

| Tabla | Migración de fix | Estado |
|---|---|---|
| `services` | `20260527_services_rls.sql` | Migración creada, **pendiente aplicar** |
| `invoices` | `20260527_finance_rls.sql` | RLS aplicada — frontend corregido (user_id en inserts) |
| `expenses` | `20260527_finance_rls.sql` | Migración creada, **pendiente aplicar** |
| `purchase_invoices` | `20260527_finance_rls.sql` | RLS aplicada — frontend corregido (user_id en inserts) |
| `purchase_invoice_lines` | `20260527_finance_rls.sql` | RLS aplicada — frontend corregido (user_id en inserts) |
| `bank_accounts` | `20260527_finance_rls.sql` | Migración creada, **pendiente aplicar** |
| `bookings` | — | RLS activa con `USING (true)` — **requiere nueva migración** |
| `booking_requests` | — | Columna `owner_id` **pendiente de agregar** — sin ella el INSERT desde `/booking/[slug]` falla y el trigger no se dispara |
| `journal_entries` | — | Sin RLS definida — **requiere nueva migración** |
| `chart_of_accounts` | — | Sin RLS definida — queries del frontend ya filtran por `user_id` |

> Antes de aplicar cualquier migración de RLS en producción, ejecutar el backfill con el owner_id de Noirem (`afe5c9b1-d3b4-4617-80c0-73743cf92b33`) para no perder datos existentes.

---

## Casos especiales

### Página pública de booking por tenant (`/booking/[slug]`)

La ruta pública de reservas es ahora dinámica y por tenant:

- **URL**: `/booking/[slug]` — el slug se resuelve contra `business_settings.slug`
- **Slug generation**: función SQL `generate_slug(text)` + función TS `generateSlug()` en `app/api/register/route.ts` — ambas producen el mismo resultado (lowercase, sin especiales, guiones)
- **Migración**: `20260527_booking_slug.sql` — agrega columna `slug TEXT UNIQUE` a `business_settings` y crea `generate_slug()`
- **Redirect**: `app/booking/page.tsx` redirige permanentemente a `/booking/noirem` (temporal — Noirem es el único tenant activo)
- **Aislamiento**: al montar, la página resuelve `ownerId` desde `business_settings.slug`. Todas las queries de servicios, categorías y disponibilidad filtran por `owner_id`. El INSERT a `booking_requests` incluye `owner_id`
- **Detección de nuevas reservas** (`bookings/page.tsx`): el polling de 15 segundos a `booking_requests` filtra por `owner_id = auth.uid()` para que el sonido y las notificaciones solo se disparen para las reservas del tenant autenticado

**Migración pendiente crítica**: `booking_requests` no tiene columna `owner_id` aún. Crear y aplicar:
```sql
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
```

### Contactos con `user_id = NULL`
Los contactos creados por el trigger de reservas públicas (`/booking/[slug]`) tienen `user_id = NULL`. La política `auth_see_unowned_contacts` permite que el staff autenticado los vea. Ver `docs/BOOKING_CONTACTS_LOGIC.md §6`.

### Vehículos de clientes con `user_id = NULL`
Los vehículos creados por el trigger `sync_booking_request_to_bookings` (vehículos del cliente, no de la empresa) tienen `user_id = NULL`, igual que los contactos del trigger. La política `team_access_vehicles` filtraba solo por `user_id = get_owner_id()`, dejando fuera estos registros y causando que la columna VEHÍCULOS en Contactos mostrara `—`. Fix aplicado en `20260527_fix_vehicles_rls.sql`:

```sql
CREATE POLICY "auth_see_unowned_vehicles"
  ON vehicles FOR SELECT TO authenticated
  USING (user_id IS NULL);
```

Ver `docs/BOOKING_CONTACTS_LOGIC.md §4`.

### `whatsapp_configs` sin RLS
Esta tabla tiene RLS **desactivada** por diseño — las credenciales de WhatsApp se gestionan con service role desde la Edge Function. Ver `docs/WHATSAPP_INTEGRATION.md §3`.

### `business_settings` con RLS correcta
Esta tabla ya tiene RLS configurada correctamente y filtra por `auth.uid()` sin necesidad de `get_owner_id()`. No requiere cambios.

---

## Migraciones relevantes (orden cronológico)

| Archivo | Contenido |
|---|---|
| `20260526_user_permissions.sql` | Tabla `user_permissions` con roles por usuario |
| `20260526_team_rls.sql` | Tabla `team_members` + función `get_owner_id()` v1 + políticas RLS Grupo A |
| `20260526_tenants.sql` | Tablas `plans` y `tenants` + función `tenant_is_active()` |
| `20260527_services_rls.sql` | `user_id` + RLS para tabla `services` |
| `20260527_finance_rls.sql` | RLS para `invoices`, `expenses`, `purchase_invoices`, `bank_accounts` |
| `20260527_fix_get_owner_id.sql` | Reescritura de `get_owner_id()` con patrón CASE/EXISTS — fix error 21000 |
| `20260527_fix_journal_trigger.sql` | Documentación del fix a `generate_journal_entry_for_invoice()` aplicado directamente en BD |
| `20260527_fix_purchase_journal_triggers.sql` | Documentación del fix a `generate_journal_for_purchase()` y `generate_journal_for_purchase_payment()` aplicado directamente en BD |
| `20260527_fix_vehicles_rls.sql` | Policy `auth_see_unowned_vehicles` — permite ver vehículos de clientes con `user_id = NULL` |
| `20260527_admin_panel.sql` | Columna `is_superadmin` en `tenants` + tabla `admin_audit_log` con RLS para superadmins |