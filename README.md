# SAFFI ERP — CRM & Operations Platform

Sistema ERP multi-tenant para empresas de servicios a domicilio (detailing de vehículos, etc.). Construido con Next.js 16, Supabase y Stripe.

## Stack

- **Frontend**: Next.js 16 (App Router) · React 19 · TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + RLS) · Next.js API Routes
- **Pagos**: Stripe (suscripciones recurrentes)
- **Deploy**: Vercel
- **UI**: Inline styles — brand system SAFFI (navy `#0B2A4A`, gold `#F5B544`, cyan `#3DD9D6`)

---

## Módulos del sistema

| Módulo | Ruta | Descripción |
|---|---|---|
| Dashboard | `/` | KPIs, Gantt de reservas, actividad reciente |
| Contactos | `/contacts` | CRM con tiers (VIP, Platinum, Black Diamond) |
| Servicios | `/services` | Catálogo + inventario de materiales |
| Vehículos | `/vehicles` | Flota de móviles con Gantt en tiempo real |
| Reservas | `/bookings` | Calendario semanal tipo Gantt |
| RRHH | `/hr` | Empleados, nómina, asistencia, comisiones |
| Finanzas | `/finance` | Facturas, gastos, compras, bancos, VAT |
| Contabilidad | `/accounting` | Libro diario, balance de comprobación, plan de cuentas |
| Reportes | `/reports` | Cuentas por cobrar/pagar, reportes exportables |
| Configuración | `/settings` | Empresa, equipo, integraciones, plantillas, planes |
| Upgrade | `/upgrade` | Selección de plan Stripe (pública) |
| Admin | `/admin` | Panel superadmin (solo `is_superadmin = true`) |

---

## Desarrollo local

```bash
npm install
npm run dev
```

Requiere `.env.local` con las variables de Supabase y Stripe. Ver sección de variables de entorno.

---

## Variables de entorno requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ACCESS_TOKEN=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Stripe Price IDs (público + server)
NEXT_PUBLIC_STRIPE_STARTER_MONTHLY=
NEXT_PUBLIC_STRIPE_STARTER_ANNUAL=
NEXT_PUBLIC_STRIPE_PRO_MONTHLY=
NEXT_PUBLIC_STRIPE_PRO_ANNUAL=
NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY=
NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL=
STRIPE_STARTER_MONTHLY=
STRIPE_STARTER_ANNUAL=
STRIPE_PRO_MONTHLY=
STRIPE_PRO_ANNUAL=
STRIPE_ENTERPRISE_MONTHLY=
STRIPE_ENTERPRISE_ANNUAL=

# Facebook / WhatsApp
NEXT_PUBLIC_FACEBOOK_APP_ID=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
```

---

## Arquitectura multi-tenant

Un único proyecto Supabase. Aislamiento por `user_id` + Row Level Security. Una fila en `tenants` por empresa.

Ver [`docs/MULTI_TENANT.md`](docs/MULTI_TENANT.md) para el modelo completo.

---

## Suscripciones (Stripe)

Tres planes: **Starter** ($49/mes), **Pro** ($99/mes), **Enterprise** ($199/mes). Descuento 20% en facturación anual.

Flujo: `/upgrade?tenant_id=UUID` → Stripe Checkout → webhook actualiza `tenants`.

Ver [`docs/STRIPE_INTEGRATION.md`](docs/STRIPE_INTEGRATION.md) para la integración completa.

---

## Documentación

| Archivo | Contenido |
|---|---|
| [`docs/MULTI_TENANT.md`](docs/MULTI_TENANT.md) | Arquitectura multi-tenant, RLS, middleware, admin panel |
| [`docs/STRIPE_INTEGRATION.md`](docs/STRIPE_INTEGRATION.md) | Integración Stripe: checkout, webhook, planes, troubleshooting |
| [`docs/WHATSAPP_INTEGRATION.md`](docs/WHATSAPP_INTEGRATION.md) | Bot de WhatsApp Business (Embedded Signup, horarios, zonas) |
| [`docs/INVOICES_LOGIC.md`](docs/INVOICES_LOGIC.md) | Lógica de facturación y generación de PDF |
| [`docs/BOOKING_CONTACTS_LOGIC.md`](docs/BOOKING_CONTACTS_LOGIC.md) | Reservas públicas y sincronización de contactos |
| [`docs/AVAILABILITY_LOGIC.md`](docs/AVAILABILITY_LOGIC.md) | Cálculo de disponibilidad con buffer de traslado |
| [`docs/EMAIL_CRON.md`](docs/EMAIL_CRON.md) | Emails transaccionales y cron jobs |
| [`docs/HR_MODULE.md`](docs/HR_MODULE.md) | Módulo RRHH: nómina, asistencia, comisiones |
| [`docs/TIMEZONE_LOGIC.md`](docs/TIMEZONE_LOGIC.md) | Manejo de zonas horarias (Dubai UTC+4) |

---

## Migraciones SQL

```
supabase/migrations/
├── 001_initial.sql                          # Tablas base CRM
├── 002–005_...                              # Fixes iniciales
├── 20260520_whatsapp.sql                    # WhatsApp configs
├── 20260521_*.sql                           # Reservas públicas
├── 20260522_*.sql                           # Fixes reservas y notificaciones
├── 20260524_*.sql                           # Triggers y timezone
├── 20260526_tenants.sql                     # Multi-tenant: plans + tenants
├── 20260526_team_rls.sql                    # get_owner_id() + RLS equipo
├── 20260526_user_permissions.sql            # Permisos granulares por módulo
├── 20260527_*.sql                           # RLS finanzas, fixes, admin panel
└── 20260529_stripe_subscriptions.sql        # Columnas Stripe en tenants
```

Para aplicar migraciones: `npx supabase db push` (requiere `supabase link` previo).

---

## Webhook de Stripe (producción)

```
URL: https://tu-dominio.com/api/stripe/webhook
Eventos: checkout.session.completed
         customer.subscription.updated
         customer.subscription.deleted
         invoice.payment_failed
```

La ruta está excluida del middleware de autenticación. Ver [`docs/STRIPE_INTEGRATION.md`](docs/STRIPE_INTEGRATION.md).
