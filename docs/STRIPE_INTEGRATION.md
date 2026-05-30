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
| `app/(auth)/upgrade/page.tsx` | Página pública de selección de plan |
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
Actualiza `subscription_status: 'canceled'`, `plan: 'trial'`.

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
2. **Webhook endpoint**: `https://tu-dominio.com/api/stripe/webhook`
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
