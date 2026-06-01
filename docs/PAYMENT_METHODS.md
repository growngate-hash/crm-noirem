# Métodos de Pago — Documentación Técnica

## 1. RESUMEN

`payment_methods` almacena los métodos de cobro que el negocio ofrece a sus clientes
(transferencia bancaria, billeteras digitales, Stripe). Se usa en tres lugares:

1. **Settings UI** (`PaymentsSection`) — el staff crea, edita y elimina métodos
2. **Booking page** (`/booking/[slug]`) — se muestran en la pantalla de éxito tras reservar con "Other methods"
3. **WhatsApp bot** (`whatsapp-bot` Edge Function) — se inyectan en el system prompt de OpenAI

---

## 2. TABLA `payment_methods`

### Migración
`supabase/migrations/20260531_payment_methods.sql`

### Estructura
```sql
create table if not exists payment_methods (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null,
  type         text not null check (type in ('bank', 'wallet', 'stripe')),
  label        text not null,
  details      jsonb not null default '{}',
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz default now()
);
```

### Columnas

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK | Generado automáticamente |
| `company_id` | uuid | **Debe coincidir con `business_settings.user_id`** del tenant |
| `type` | text | `'bank'` \| `'wallet'` \| `'stripe'` |
| `label` | text | Nombre visible (ej. `"NEQUI"`, `"Bancolombia"`) |
| `details` | jsonb | Datos específicos según el tipo (ver abajo) |
| `is_active` | boolean | `false` = eliminado lógicamente |
| `sort_order` | int | Orden de aparición |
| `created_at` | timestamptz | |

### `details` por tipo

**`type = 'bank'`**
```json
{
  "bank_name": "Bancolombia",
  "account_number": "123-456789-00",
  "account_holder": "Noirem SAS"
}
```

**`type = 'wallet'`**
```json
{
  "wallet_name": "Nequi",
  "phone_number": "+57 300 123 4567"
}
```

**`type = 'stripe'`**
```json
{}
```
Los datos de Stripe (claves API) se gestionan en `stripe_configs`, no aquí.
Este tipo solo indica que el negocio acepta pago online — el bot lo menciona
como opción sin exponer claves.

### Identificador de tenant — punto crítico
`company_id` debe ser igual a `business_settings.user_id` (el UUID del usuario
de Supabase Auth del staff principal). **No** corresponde a ningún UUID de la
tabla `tenants`.

UUID en producción (noirem): `afe5c9b1-d3b4-4617-80c0-73743cf92b33`

---

## 3. RLS

```sql
alter table payment_methods enable row level security;

-- Permite lectura pública de métodos activos (necesario para booking page sin sesión)
create policy "public read active methods" on payment_methods
  for select using (is_active = true);

-- Nota: existe también "anon_read_active_payment_methods" con la misma condición (legacy)
```

La escritura (INSERT/UPDATE/DELETE) requiere el cliente de servicio (`SUPABASE_SERVICE_ROLE_KEY`)
o una sesión autenticada con los permisos adecuados. El Settings UI usa el cliente
autenticado del staff.

---

## 4. CÓMO SE USA EN CADA CONTEXTO

### 4.1 Settings UI — `PaymentsSection`

**Archivo:** `app/(dashboard)/settings/page.tsx` → función `PaymentsSection`

**Carga al montar:**
```typescript
supabase.from('payment_methods')
  .select('*')
  .eq('company_id', tenantId)
  .eq('is_active', true)
  .order('sort_order')
  .then(({ data }) => setMethods(data ?? []))
```

**Crear método:**
```typescript
await supabase.from('payment_methods').insert({
  company_id: tenantId,
  type: newMethod.type,       // 'bank' | 'wallet'
  label: newMethod.label,
  details: newMethod.details,
  is_active: true,
  sort_order: methods.length,
})
```

**Eliminar método (soft delete):**
```typescript
await supabase.from('payment_methods')
  .update({ is_active: false })
  .eq('id', id)
```

**Tipos soportados en el formulario:** `bank` y `wallet`. El tipo `stripe`
se gestiona exclusivamente desde la sub-sección de Stripe (tabla `stripe_configs`).

---

### 4.2 Booking Page — pantalla de éxito

**Archivo:** `app/booking/[slug]/page.tsx`

La pantalla de éxito se muestra cuando el cliente completa una reserva con
`paymentMethod = 'cash'` (botón "Other methods"). El flujo online (Stripe)
redirige a Checkout y nunca llega a esta pantalla.

**Carga:**
```typescript
// Dentro del useEffect([ownerId]) — usa el cliente anon (página pública)
createClient()
  .from('payment_methods')
  .select('type, label, details')
  .eq('company_id', ownerId)   // ownerId = business_settings.user_id
  .eq('is_active', true)
  .order('sort_order')
  .then(({ data }) => setPaymentMethods(data ?? []))
```

**Render (si `paymentMethods.length > 0`):**
- Card con borde gold titulada "Payment details"
- Cada método muestra `label` y los datos de `details` según el tipo
- Footer: "Once payment is made, send us the receipt on WhatsApp..."

**Por qué usa anon key:** La página `/booking/[slug]` es pública — no requiere
login. El cliente anon puede leer `payment_methods` gracias a la policy
`"public read active methods"` (`is_active = true`).

---

### 4.3 WhatsApp Bot — system prompt

**Archivo:** `supabase/functions/whatsapp-bot/index.ts`

**Secret requerido:** `COMPANY_ID` (= `business_settings.user_id` del tenant)

**Query (dentro del Promise.all de processMessage):**
```typescript
supabase.from('payment_methods')
  .select('type, label, details')
  .eq('company_id', COMPANY_ID)
  .eq('is_active', true)
  .order('sort_order')
```

**Formato en el system prompt:**
```
MÉTODOS DE PAGO DISPONIBLES:
- NEQUI (Nequi): +57 300 123 4567
- Bancolombia (Bancolombia): cuenta 123-456789-00, titular Noirem SAS
```

Si no hay métodos activos, la sección `paymentSection` está vacía y no aparece en el prompt.

**Instrucción al bot (sección 5 del prompt):**
El bot muestra los datos completos cuando el cliente pregunta por pagos, y al
confirmar una reserva nueva incluye los métodos proactivamente.

---

## 5. DEPLOYMENT — CONFIGURAR `COMPANY_ID`

Al migrar a un nuevo proyecto o nuevo tenant:

```bash
# 1. Obtener el user_id correcto
npx supabase db query --linked "select user_id, slug from business_settings where slug = 'tu-slug';"

# 2. Actualizar el secret de la Edge Function
npx supabase secrets set COMPANY_ID=<user_id> --project-ref <project-ref>

# 3. Verificar que los payment_methods tienen el company_id correcto
npx supabase db query --linked "select id, company_id, label from payment_methods;"

# 4. Si company_id no coincide, corregirlo
npx supabase db query --linked "
  update payment_methods
  set company_id = '<user_id correcto>'
  where company_id = '<uuid incorrecto>';
"

# 5. Redesplegar la Edge Function para que tome el nuevo secret
npx supabase functions deploy whatsapp-bot --project-ref <project-ref> --no-verify-jwt
```

---

## 6. COLUMNA `payment_method` EN `bookings`

Añadida en `supabase/migrations/20260531_bookings_payment_method.sql`. El trigger
`sync_booking_request_to_bookings` la copia automáticamente desde `booking_requests`:

```sql
alter table bookings
  add column if not exists payment_method      text default 'cash',
  add column if not exists booking_request_id  uuid;
```

| Valor | Origen | Significado |
|---|---|---|
| `'cash'` | booking_requests | "Other methods" — cliente paga por transferencia, wallet, etc. |
| `'online'` | booking_requests | Stripe — se confirma automáticamente tras el pago |
| `'deferred'` | booking_requests | "Pay after service" — el técnico cobra al finalizar |

`booking_request_id` vincula el booking con su `booking_request` de origen.
Bookings creados manualmente desde el CRM no tienen este vínculo (`NULL`).

---

## 7. MODO DE PAGO (`payment_mode`)

Independiente de `payment_methods`, el campo `payment_mode` en `company_settings`
controla el comportamiento de confirmación de reservas:

| Valor | Comportamiento |
|---|---|
| `'informative'` | El bot comparte los datos; el equipo confirma manualmente |
| `'transactional'` | Stripe auto-confirma la reserva tras el pago |

Se configura desde `PaymentsSection` → "Modo de pago" y se guarda en:
```typescript
supabase.from('company_settings')
  .upsert({ company_id: tenantId, payment_mode: paymentMode }, { onConflict: 'company_id' })
```

El bot **no lee** `payment_mode` — solo usa el contenido de `payment_methods`
para saber qué datos mostrar.

---

## 7. PUNTOS CRÍTICOS

1. **`company_id` ≠ `tenants.id`**. En este proyecto, `payment_methods.company_id`
   es el `user_id` de Supabase Auth, no un UUID de la tabla `tenants` (que en
   producción no tiene filas vinculadas al tenant principal).

2. **RLS permite lectura pública.** La policy `"public read active methods"` es
   necesaria para que la booking page (sin sesión de usuario) pueda leer los métodos.
   Cualquier persona con la URL puede ver los métodos de pago del negocio — esto
   es intencional (son datos públicos que se comparten con los clientes).

3. **El tipo `stripe` no almacena claves aquí.** Las claves de Stripe van en
   `stripe_configs`. En `payment_methods`, un registro con `type = 'stripe'`
   solo sirve para que el bot mencione la opción de pago online.

4. **Soft delete.** Los métodos "eliminados" tienen `is_active = false`.
   Todas las queries filtran por `is_active = true`. No se borran filas.
