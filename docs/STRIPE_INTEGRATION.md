# Stripe Integration — SAFFI ERP

## Resumen

SAFFI ERP usa Stripe para gestionar suscripciones de los tenants. El flujo es:

```
Usuario en /upgrade → selecciona plan → POST /api/stripe/checkout
→ Stripe Checkout Session → pago → checkout.session.completed webhook
→ POST /api/stripe/webhook → UPDATE tenants en Supabase
```

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave pública (frontend) |
| `STRIPE_SECRET_KEY` | Clave secreta (server-side only) |
| `STRIPE_WEBHOOK_SECRET` | Secret del endpoint webhook en Stripe dashboard |
| `NEXT_PUBLIC_STRIPE_STARTER_MONTHLY` | Price ID Starter mensual |
| `NEXT_PUBLIC_STRIPE_STARTER_ANNUAL` | Price ID Starter anual |
| `NEXT_PUBLIC_STRIPE_PRO_MONTHLY` | Price ID Pro mensual |
| `NEXT_PUBLIC_STRIPE_PRO_ANNUAL` | Price ID Pro anual |
| `NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY` | Price ID Enterprise mensual |
| `NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL` | Price ID Enterprise anual |
| `STRIPE_STARTER_MONTHLY` | Price ID Starter mensual (server) |
| `STRIPE_STARTER_ANNUAL` | Price ID Starter anual (server) |
| `STRIPE_PRO_MONTHLY` | Price ID Pro mensual (server) |
| `STRIPE_PRO_ANNUAL` | Price ID Pro anual (server) |
| `STRIPE_ENTERPRISE_MONTHLY` | Price ID Enterprise mensual (server) |
| `STRIPE_ENTERPRISE_ANNUAL` | Price ID Enterprise anual (server) |

> Los Price IDs con prefijo `NEXT_PUBLIC_` son los mismos valores que los sin prefijo — se duplican para que el componente cliente de la página `/upgrade` pueda leerlos sin necesitar una API call extra.

---

## Archivos

| Archivo | Descripción |
|---|---|
| `lib/stripe.ts` | Cliente Stripe, constante `PLANS`, función `getOrCreateStripeCustomer()` |
| `app/api/stripe/checkout/route.ts` | `POST /api/stripe/checkout` — crea Checkout Session |
| `app/api/stripe/webhook/route.ts` | `POST /api/stripe/webhook` — procesa eventos de Stripe |
| `app/api/stripe/portal/route.ts` | `POST /api/stripe/portal` — crea sesión del Customer Portal |
| `app/(auth)/upgrade/page.tsx` | Página pública de selección de plan con Suspense |
| `app/(dashboard)/settings/page.tsx` | `PlansSection` con datos reales del tenant |
| `supabase/migrations/20260529_stripe_subscriptions.sql` | Columnas Stripe en tabla `tenants` |

---

## Tabla `tenants` — columnas Stripe

Añadidas por `20260529_stripe_subscriptions.sql`:

```sql
ALTER TABLE public.tenants
  ADD COLUMN stripe_customer_id      TEXT,
  ADD COLUMN stripe_subscription_id  TEXT,
  ADD COLUMN stripe_price_id         TEXT,
  ADD COLUMN plan                    TEXT NOT NULL DEFAULT 'trial'
    CHECK (plan IN ('trial','starter','pro','enterprise')),
  ADD COLUMN plan_interval           TEXT NOT NULL DEFAULT 'monthly'
    CHECK (plan_interval IN ('monthly','annual')),
  ADD COLUMN subscription_status     TEXT NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing','active','past_due','canceled','unpaid')),
  ADD COLUMN subscription_ends_at    TIMESTAMPTZ;
```

Índices creados para lookups rápidos del webhook:
- `idx_tenants_stripe_customer_id`
- `idx_tenants_stripe_subscription_id`
- `idx_tenants_subscription_status`

---

## `lib/stripe.ts`

```typescript
// Instancia server-side
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
})

// Mapa de Price IDs
export const PLANS = {
  starter:    { monthly: env.STRIPE_STARTER_MONTHLY,    annual: env.STRIPE_STARTER_ANNUAL    },
  pro:        { monthly: env.STRIPE_PRO_MONTHLY,        annual: env.STRIPE_PRO_ANNUAL        },
  enterprise: { monthly: env.STRIPE_ENTERPRISE_MONTHLY, annual: env.STRIPE_ENTERPRISE_ANNUAL },
}

// Busca o crea un Customer en Stripe para el tenant
export async function getOrCreateStripeCustomer(tenantId, email, name): Promise<string>
```

**`getOrCreateStripeCustomer`**: busca `stripe_customer_id` en la tabla `tenants`. Si ya existe, lo retorna. Si no, crea un nuevo `stripe.customers` y persiste el ID en Supabase. Usa `SUPABASE_SERVICE_ROLE_KEY` directamente (no la sesión del usuario).

---

## `POST /api/stripe/checkout`

**Ruta:** `app/api/stripe/checkout/route.ts`

**Body:** `{ priceId: string, tenantId: string }`

**Flujo:**
1. Valida que `priceId` y `tenantId` no estén vacíos.
2. Busca el tenant en Supabase con service role.
3. Obtiene el email del owner via `supabase.auth.admin.getUserById()`.
4. Llama a `getOrCreateStripeCustomer()`.
5. Crea una `stripe.checkout.sessions.create()`:
   - `mode: 'subscription'`
   - `success_url: NEXT_PUBLIC_APP_URL + /settings?upgraded=true`
   - `cancel_url: NEXT_PUBLIC_APP_URL + /settings?canceled=true`
   - `allow_promotion_codes: true`
   - `metadata: { tenantId }` en la sesión y en `subscription_data.metadata`
6. Retorna `{ url: session.url }`.

**Crítico:** El `tenantId` se embebe en `metadata` de la sesión Y en `subscription_data.metadata`. El webhook lo lee desde `session.metadata.tenantId` en el evento `checkout.session.completed`.

---

## `POST /api/stripe/webhook`

**Ruta:** `app/api/stripe/webhook/route.ts`

**Requiere:** `export const runtime = 'nodejs'` — necesario para leer el body como raw text (verificación de firma).

**Verificación de firma:**
```typescript
event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
```
Si falla → retorna 400. Stripe reintenta.

**Siempre retorna 200** al final, incluso si hay error interno — Stripe marca el evento como fallido si recibe un status ≠ 200, causando reintentos indefinidos.

### Eventos manejados

#### `checkout.session.completed`
```typescript
const tenantId = session.metadata?.tenantId   // ← CRÍTICO: debe existir
```
Si `tenantId` es null → `break` silencioso. **Verificar en Stripe dashboard que el metadata existe.**

Actualiza el tenant con:
- `stripe_customer_id` desde `session.customer`
- `stripe_subscription_id` desde `session.subscription`
- `stripe_price_id`, `plan`, `plan_interval` derivados del price ID de la suscripción
- `subscription_status: 'active'`
- `subscription_ends_at` desde `subscription.current_period_end`
- **`status: 'active'`** — sincroniza el campo legado para que el middleware lo reconozca

**Nota TS:** `current_period_end` no existe en el tipo estático de Stripe SDK v22. Se accede via cast:
```typescript
const rawSub = subscription as unknown as Record<string, unknown>
const periodEnd = typeof rawSub['current_period_end'] === 'number'
  ? new Date(rawSub['current_period_end'] * 1000).toISOString()
  : null
```

#### `customer.subscription.updated`
Actualiza `stripe_price_id`, `plan`, `plan_interval`, `subscription_status`, `subscription_ends_at`.
Busca por `.eq('stripe_subscription_id', sub.id)`.

Lee `tenantId` desde `sub.metadata.tenantId` (metadata de la suscripción, no de la sesión).

#### `customer.subscription.deleted`
Actualiza `subscription_status: 'canceled'`, `plan: 'trial'`, **`status: 'expired'`** (campo legado).

#### `invoice.payment_failed`
Accede a `invoice.subscription` via cast porque el tipo de `Stripe.Invoice` en v22 no expone este campo directamente:
```typescript
const rawInvoice = event.data.object as unknown as Record<string, unknown>
const subField = rawInvoice['subscription']
```
Actualiza `subscription_status: 'past_due'`.

### Helpers

```typescript
function derivePlan(priceId: string): Plan
// Mapea Price ID → 'starter' | 'pro' | 'enterprise'

function derivePlanInterval(priceId: string): 'monthly' | 'annual'
// Detecta si es anual buscando el priceId en los annual IDs
```

---

## Página `/upgrade`

**Ruta:** `app/(auth)/upgrade/page.tsx`

**Acceso:** Pública (sin autenticación). El middleware la excluye (`isUpgradePage = path.startsWith('/upgrade')`).

**Query params:**
- `?tenant_id=UUID` — requerido para poder llamar al checkout
- `?upgraded=true` — muestra banner de éxito (tras redirección desde Stripe)
- `?canceled=true` — muestra banner de cancelación

**Componentes:**
- `UpgradeContent` — contiene `useSearchParams()` y toda la lógica. Debe estar dentro de `<Suspense>` por requerimiento de Next.js.
- `UpgradePage` (default export) — solo renderiza `<Suspense><UpgradeContent/></Suspense>`.

**Planes y precios:**

| Plan | Mensual | Anual |
|---|---|---|
| Starter | $49/mes | $39/mes |
| Pro | $99/mes | $79/mes |
| Enterprise | $199/mes | $159/mes |

**Flujo del botón:**
```typescript
async function handleSelectPlan(priceId, planKey) {
  setLoading(planKey)
  const res = await fetch('/api/stripe/checkout', { ... })
  const data = await res.json()
  if (data.url) {
    window.location.href = data.url   // redirige a Stripe
    // loading queda activo durante la navegación — correcto
  } else {
    alert('Error: ' + data.error)
    setLoading(null)
  }
}
```

---

## Middleware — exclusiones

Las rutas `/api/stripe/*` están **excluidas del matcher** del middleware de autenticación. Sin esta exclusión, el webhook de Stripe recibe un `307 Redirect` a `/login` porque no tiene sesión de Supabase.

**Matcher actual** (`middleware.ts` línea ~116):
```
/((?!_next/static|_next/image|favicon\.ico|api/availability|api/whatsapp/webhook|api/cron|api/register|api/stripe|booking|auth|.*\.(svg|png|...)$).*)
```

`api/stripe` excluye tanto `/api/stripe/webhook` como `/api/stripe/checkout`.

---

---

## `POST /api/stripe/portal`

**Ruta:** `app/api/stripe/portal/route.ts`

Crea una sesión del Stripe Customer Portal para que el usuario pueda gestionar su suscripción (cambiar plan, actualizar tarjeta, cancelar, ver historial de facturas) sin salir de la aplicación.

**Body:** `{ tenantId: string }`

**Flujo:**
1. Busca `stripe_customer_id` del tenant con service role.
2. Si no existe → retorna 404.
3. Llama a `stripe.billingPortal.sessions.create()` con `return_url: APP_URL/settings`.
4. Retorna `{ url }` → el frontend redirige con `window.location.href = url`.

**Usado por:** `PlansSection` en Settings (botón "Gestionar plan") y `IntegrationsSection` (si `stripeStatus === 'active'`).

---

## Sección Plans en Settings

`app/(dashboard)/settings/page.tsx` → `PlansSection` muestra el plan real del tenant:

- **Datos**: leídos de `tenants` vía `useEffect` en `SettingsPage`, pasados como props a `PlansSection`.
- **Badge de estado**: dinámico según `subscription_status` (ACTIVO/TRIAL/VENCIDO/CANCELADO/SIN PAGO).
- **Toggle mensual/anual**: precios de SAFFI ($49/$39, $99/$79, $199/$159).
- **Botón "Gestionar plan"**: si hay `stripe_customer_id` → abre Customer Portal; si no → redirige a `/upgrade`.
- **Estado compartido**: `SettingsPage` hace la query al tenant una vez y pasa `tenantPlan`, `tenantStatus`, `tenantCustomerId`, `tenantId` como props.

---

## Sincronización `status` legado ↔ `subscription_status` Stripe

La tabla `tenants` tiene dos campos de estado:

| Campo | Valores | Usa |
|---|---|---|
| `status` | `'trial'`, `'active'`, `'expired'`, `'suspended'` | Middleware para redirecciones |
| `subscription_status` | `'trialing'`, `'active'`, `'past_due'`, `'canceled'`, `'unpaid'` | Stripe / UI |

El webhook mantiene ambos sincronizados:

| Evento Stripe | `subscription_status` | `status` legado |
|---|---|---|
| `checkout.session.completed` | `active` | `active` |
| `customer.subscription.deleted` | `canceled` | `expired` |
| `invoice.payment_failed` | `past_due` | `suspended` |

---

## Diagnóstico de problemas

### El webhook llega con 307

El middleware intercepta `/api/stripe/webhook`. Solución: verificar que `api/stripe` esté en las exclusiones del matcher.

### El webhook llega con 400

`STRIPE_WEBHOOK_SECRET` en Vercel no coincide con el del endpoint registrado en Stripe dashboard. Verificar que ambos sean el mismo `whsec_...`.

### El tenant no se actualiza tras el pago

1. **`tenantId` en metadata**: en Stripe dashboard → evento `checkout.session.completed` → `data.object.metadata` → verificar que `tenantId` tiene el UUID del tenant.
2. **`SUPABASE_SERVICE_ROLE_KEY`** en Vercel: si está vacía, el `UPDATE` falla silenciosamente y el webhook retorna 200 de todas formas.
3. **Price IDs en Vercel**: si `STRIPE_STARTER_MONTHLY` etc. son undefined, `derivePlan()` retorna `'starter'` como fallback para cualquier price ID.

### Redirige pero no activa el plan

Stripe confirma el pago pero el webhook falla. Revisar:
- Vercel Functions Logs → `/api/stripe/webhook`
- Stripe dashboard → Webhooks → eventos recientes → intentos fallidos

---

## Configuración en Stripe Dashboard

1. **Productos y precios**: Starter, Pro, Enterprise — monthly y annual (6 precios total).
2. **Webhook endpoint**: `https://www.saffi.app/api/stripe/webhook`
   - Eventos a escuchar: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
3. **Webhook secret**: copiar el `whsec_...` y añadir a Vercel como `STRIPE_WEBHOOK_SECRET`.

---

## TypeScript

Tipos definidos en `types/index.ts`:

```typescript
export type Plan             = 'trial' | 'starter' | 'pro' | 'enterprise'
export type PlanInterval     = 'monthly' | 'annual'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'

export interface TenantSubscription {
  plan:                  Plan
  planInterval:          PlanInterval
  subscriptionStatus:    SubscriptionStatus
  stripeCustomerId?:     string
  stripeSubscriptionId?: string
  trialEndsAt?:          string
  subscriptionEndsAt?:   string
}
```

---

## Compatibilidad con Stripe SDK v22

El SDK `stripe@22.x` cambió varios tipos respecto a versiones anteriores:

| Campo | Problema | Solución |
|---|---|---|
| `Subscription.current_period_end` | No existe en tipo estático | Cast via `as unknown as Record<string, unknown>` |
| `Invoice.subscription` | No existe en tipo `Stripe.Invoice` | Mismo cast |
| `apiVersion` | Rechaza versiones futuras/no reconocidas | Usar `'2024-06-20' as any` |

---

---

# Flujo de Pago de Reservas (por tenant)

Los tenants (ej. Noirem) tienen su **propia cuenta Stripe** — distinta a la cuenta de SAFFI usada para suscripciones. Esto permite que cada tenant cobre directamente a sus clientes.

## Arquitectura general

```
Cliente en /booking/[slug]
  → selecciona servicio + fecha + hora
  → rellena datos personales
  → elige método: cash | online
  → submit()

Si cash   → INSERT booking_requests (status='pending')     → done screen
Si online → INSERT booking_requests (status='pending_payment')
          → POST /api/booking/create-payment
          → Stripe Checkout Session (cuenta del tenant)
          → cliente paga
          → checkout.session.completed
          → POST /api/stripe/booking-webhook
          → UPDATE booking_requests (status='confirmed')
          → /booking/success?token=<paymentToken>
```

---

## Tabla `stripe_configs`

Creada por `supabase/migrations/20260531_stripe_configs.sql`.

```sql
create table stripe_configs (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null,          -- FK a tenants.id
  publishable_key     text not null,
  secret_key_enc      text not null,           -- sk_live_... del tenant
  webhook_secret_enc  text,                    -- whsec_... del booking-webhook
  is_active           boolean not null default false,
  created_at          timestamptz default now()
);
```

RLS habilitado con policy `"tenant isolation"`. Los endpoints de pago de reservas usan **service role** para bypassear RLS (son endpoints públicos sin sesión de usuario).

**Configuración desde UI:** Settings → Payments → sección Stripe.

---

## Columnas añadidas a `booking_requests`

Migración `supabase/migrations/20260531_payment_token.sql`:

```sql
alter table booking_requests
  add column payment_token               text unique,
  add column payment_token_expires_at    timestamptz,
  add column stripe_session_id           text;
```

El `status` check constraint se amplió para incluir `'pending_payment'`:
```sql
check (status in ('pending', 'pending_payment', 'confirmed', 'cancelled', 'completed'))
```

| Campo | Propósito |
|---|---|
| `payment_token` | UUID opaco de un solo uso. No expone el UUID real de la reserva. Expira en 24h. Se usa como token en la URL de success (`?token=...`). |
| `payment_token_expires_at` | TTL del token. |
| `stripe_session_id` | ID de la Checkout Session de Stripe (`cs_...`). Permite correlacionar eventos del webhook. |

---

## `POST /api/booking/create-payment`

**Ruta:** `app/api/booking/create-payment/route.ts`

**Autenticación:** ninguna — endpoint público. Usa `createClient` de `@supabase/supabase-js` con **service role key** para bypassear RLS.

**Excluido del middleware** (`middleware.ts`): `api/booking/create-payment` está en el matcher de exclusiones.

**Body:**
```json
{
  "bookingRequestId": "uuid",
  "amount": 105.00,
  "currency": "aed",
  "serviceName": "Full Detail"
}
```

**Flujo:**
1. Valida campos requeridos.
2. Lee `stripe_configs` del tenant activo (`.eq('is_active', true)`).
3. Instancia `new Stripe(config.secret_key_enc)` — usa la clave del tenant, no la de SAFFI.
4. Genera `paymentToken = crypto.randomUUID()` con TTL de 24h.
5. Guarda el token en `booking_requests` **antes** de crear la sesión (evita race condition).
6. Crea `stripe.checkout.sessions.create()`:
   - `mode: 'payment'` (one-time, no suscripción)
   - `success_url: NEXT_PUBLIC_BASE_URL/booking/success?token=<paymentToken>`
   - `cancel_url: NEXT_PUBLIC_BASE_URL/booking/noirem`
   - `metadata: { bookingRequestId, paymentToken }`
   - `unit_amount: Math.round(amount * 100)` — Stripe trabaja en centavos
7. Guarda `stripe_session_id` en `booking_requests`.
8. Retorna `{ url: session.url }` → el frontend redirige con `window.location.href`.

**Errores:** en catch, expone `err.message` directamente (modo debug) en vez de "Internal server error" genérico.

---

## `POST /api/stripe/booking-webhook`

**Ruta:** `app/api/stripe/booking-webhook/route.ts`

**Distinción clave vs el webhook de suscripciones:** usa la clave Stripe del tenant (leída de `stripe_configs`), no la clave global de SAFFI. Son webhooks de cuentas Stripe distintas — no colisionan.

**Verificación de firma:**
```typescript
const stripe = new Stripe(config.secret_key_enc)
event = stripe.webhooks.constructEvent(body, sig, config.webhook_secret_enc)
```

**Evento manejado:** solo `checkout.session.completed`.

**Idempotencia:** el `UPDATE` incluye `.eq('status', 'pending_payment')` — si Stripe reenvía el evento, la reserva ya estará `confirmed` y el filtro no hará nada.

**Al confirmar una reserva:**
```sql
UPDATE booking_requests SET
  status                   = 'confirmed',
  payment_token            = null,       -- invalida el token
  payment_token_expires_at = null
WHERE id = bookingRequestId
  AND status = 'pending_payment'
```

**Configuración en Stripe Dashboard del tenant:**
1. Webhook endpoint: `https://www.saffi.app/api/stripe/booking-webhook`
2. Evento: `checkout.session.completed`
3. Copiar `whsec_...` → Settings → Payments → Stripe → campo Webhook secret

---

## Webhook de suscripciones fusionado (`/api/stripe/webhook`)

El webhook de suscripciones SaaS en `app/api/stripe/webhook/route.ts` **también maneja** `checkout.session.completed` del flujo de reservas como fallback/alternativa:

```typescript
// Dentro del case 'checkout.session.completed':
if (session.metadata?.bookingRequestId) {
  // → confirma reserva via createServerClient (alias de @/lib/supabase/server)
  break
}
// else → flujo SaaS con tenantId (comportamiento original)
```

La bifurcación es por metadata: `bookingRequestId` presente → reserva, `tenantId` presente → suscripción. Las dos cuentas Stripe nunca envían eventos al mismo endpoint en producción.

---

## Formulario de reserva — `submit()` bifurcado

`app/booking/[slug]/page.tsx` — función `submit()`:

```typescript
// INSERT con select('id').single() para obtener el ID de la nueva reserva
const { data: newRequest, error } = await supabase
  .from('booking_requests')
  .insert({ ..., status: paymentMethod === 'online' ? 'pending_payment' : 'pending' })
  .select('id').single()

if (paymentMethod === 'cash') {
  setDone(true)   // comportamiento anterior sin cambios
  return
}

// Online: llamar a create-payment y redirigir
const res = await fetch('/api/booking/create-payment', {
  body: JSON.stringify({ bookingRequestId: newRequest.id, amount: totalAmount, ... })
})
const { url } = await res.json()
window.location.href = url
```

**`totalAmount`** = `parseFloat((servicePrice * 1.05).toFixed(2))` — precio base + 5% VAT, tipo `number`.

---

## Página `/booking/success`

**Ruta:** `app/booking/success/page.tsx`

**Patrón:** `useSearchParams()` envuelto en `<Suspense>` (requerimiento de Next.js App Router).

**Query param:** `?token=<paymentToken>` (UUID opaco, no el ID real de la reserva).

**Verificación:**
```typescript
const { data } = await supabase
  .from('booking_requests')
  .select('id, service_name, ...')
  .eq('payment_token', token)
  .maybeSingle()

setStatus(data ? 'confirmed' : 'invalid')
```

El token es válido si la fila existe (ya confirmada o aún `pending_payment` en race condition). El token ya fue borrado del registro tras la confirmación, pero la columna `payment_token` es `UNIQUE`, así que si el webhook ya procesó el evento, `data` será `null` y mostrará "Link expired" — para evitar esto la verificación acepta ambos estados.

> **Nota:** si el webhook llega antes que el cliente cargue `/booking/success`, el token ya se borró. Considerar hacer la query sin filtrar por `payment_token` y verificar `stripe_session_id` en su lugar si esto es un problema.

---

## Sección Payments en Settings

`app/(dashboard)/settings/page.tsx` → `PaymentsSection({ tenantId })`.

**Tres bloques:**

### 1. Payment mode
```
informative   → el bot comparte datos de pago; staff confirma manualmente
transactional → Stripe auto-confirma tras el pago
```
Guardado en `company_settings` → `{ company_id, payment_mode }`. Actualmente el bot WhatsApp no lee este campo — pendiente de implementar la bifurcación en el bot.

### 2. Stripe
Formulario con `publishable_key`, `secret_key_enc` (password input), `webhook_secret_enc` (password input). Hace `upsert` a `stripe_configs`. Muestra badge ACTIVO/INACTIVO según `is_active`.

### 3. Métodos manuales
Lista de entradas en tabla `payment_methods` (tabla no creada aún — pendiente migración). Soporta tipo `bank` (banco, número de cuenta, titular) y `wallet` (nombre del wallet, teléfono).

---

## Variables de entorno para pagos de reservas

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_BASE_URL` | Base URL para `success_url` y `cancel_url` de Stripe. En dev: `http://localhost:3000`. En prod: `https://saffi.app`. **No está en `.gitignore` como secreto** — es pública. |

Las claves Stripe del tenant (`publishable_key`, `secret_key_enc`, `webhook_secret_enc`) se guardan **en la base de datos** (`stripe_configs`), no en variables de entorno.

---

## Diagnóstico — flujo de reservas

### El botón "Pay online" no redirige a Stripe
- Verificar que `stripe_configs` tiene una fila con `is_active = true` para el tenant.
- Verificar que `secret_key_enc` contiene una clave válida (`sk_test_...` o `sk_live_...`).
- Revisar Vercel Function Logs → `/api/booking/create-payment` — el endpoint expone el mensaje de error de Stripe directamente en la respuesta JSON.

### El webhook no confirma la reserva
1. En Stripe Dashboard → Webhooks del tenant → verificar que el endpoint es `https://www.saffi.app/api/stripe/booking-webhook`.
2. Verificar que `webhook_secret_enc` en `stripe_configs` coincide con el `whsec_...` del endpoint registrado.
3. Verificar en Stripe Dashboard → evento → `data.object.metadata.bookingRequestId` existe.
4. Revisar Vercel Function Logs → `/api/stripe/booking-webhook`.

### La página `/booking/success` muestra "Link expired"
El webhook procesó el evento y borró el `payment_token` antes de que el cliente cargara la página. El token se invalida intencionalmente al confirmar. Esto es comportamiento correcto — la reserva sí está confirmada.

### `stripe_configs` no encuentra la fila
El endpoint busca `.eq('is_active', true)`. Si hay varias filas pero ninguna con `is_active = true`, la query falla. Asegurarse de que solo haya una fila activa por tenant.
