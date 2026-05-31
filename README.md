# SAFFI ERP

**Software ERP vertical para negocios de car wash y detailing a domicilio.**
Plataforma SaaS multi-tenant construida con Next.js 16, Supabase y Stripe.

- **Producción:** [www.saffi.app](https://www.saffi.app)
- **Stack:** Next.js 16 · React 19 · TypeScript · Supabase · Stripe · Vercel

---

## Arquitectura general

```
saffi.app/                ← Landing pública (marketing, ES/EN)
saffi.app/login           ← Auth (Supabase)
saffi.app/register        ← Registro + setup de tenant
saffi.app/dashboard       ← App ERP (requiere auth)
saffi.app/[módulo]        ← Módulos ERP (requiere auth)
saffi.app/upgrade         ← Selección de plan Stripe (pública)
saffi.app/admin           ← Superadmin (is_superadmin = true)
saffi.app/privacidad      ← Legal (pública)
saffi.app/terminos        ← Legal (pública)
saffi.app/cookies         ← Legal (pública)
saffi.app/seguridad       ← Legal (pública)
```

---

## Stack técnico

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Framework | Next.js 16.2 (App Router, Turbopack) | Server + Client components |
| UI | React 19 · TypeScript estricto | Inline styles, sin CSS framework de componentes |
| Estilos | Tailwind CSS v4 + CSS global (`globals.css`) | Brand tokens como CSS variables |
| Base de datos | Supabase (PostgreSQL + RLS) | Multi-tenant por `owner_id` |
| Auth | Supabase Auth (JWT + refresh tokens) | Email/contraseña |
| Pagos | Stripe (suscripciones recurrentes) | Webhooks + Customer Portal |
| Email | Resend | Transaccional + cron trial emails |
| Deploy | Vercel Edge Network | CI/CD desde GitHub `main` |
| DNS | Cloudflare | DDoS protection + anycast global |
| Iconos | lucide-react | |
| Charts | Recharts | Dashboard KPIs |

---

## Sistema de marca (Brand System)

```
Color       Hex        Uso
─────────────────────────────────────────────────
Sapphire    #0B2A4A    Color principal, texto, fondos oscuros
Cyan        #3DD9D6    Acento, highlights, links
Amber       #F5B544    CTAs, botones primarios, alertas positivas
Cream       #FAFAF7    Fondos de secciones claras
```

**Logo:** El Destello — símbolo de 4 puntas con cubic Bézier cóncavo.
- Grid base: 32×60 px (ratio H:V = 1:1.875)
- Curvas cóncavas entre las 4 puntas (control points hacia el centro)
- Highlight interior en Cyan 500 al 36% del tamaño
- Archivos: `public/saffi-logo.svg` (oscuro) · `public/saffi-logo-light.svg` (blanco para fondos oscuros)

**Tipografía:** Geist (Google Fonts) — variable `--font-geist` en el layout raíz.

---

## Rutas de la aplicación

### Sitio público (sin auth requerida)

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | `app/page.tsx` | Landing marketing (ES/EN) |
| `/login` | `app/(auth)/login/page.tsx` | Login Supabase |
| `/register` | `app/(auth)/register/page.tsx` | Registro + creación de tenant |
| `/upgrade` | `app/upgrade/` | Selección/upgrade de plan Stripe |
| `/booking` | `app/booking/` | Reservas públicas del cliente |
| `/privacidad` | `app/privacidad/page.tsx` | Política de privacidad |
| `/terminos` | `app/terminos/page.tsx` | Términos de uso |
| `/cookies` | `app/cookies/page.tsx` | Política de cookies |
| `/seguridad` | `app/seguridad/page.tsx` | Política de seguridad |

### App ERP (requiere auth + tenant activo)

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | KPIs, Gantt reservas, actividad, charts |
| `/contacts` | CRM clientes con tiers VIP |
| `/services` | Catálogo de servicios + inventario |
| `/vehicles` | Flota de móviles + Gantt tiempo real |
| `/bookings` | Calendario semanal tipo Gantt |
| `/hr` | Empleados, nómina, asistencia, comisiones |
| `/finance` | Facturas, gastos, compras, bancos, VAT |
| `/accounting` | Libro diario, balance, plan de cuentas |
| `/reports` | Cuentas por cobrar/pagar, exportables |
| `/settings` | Empresa, equipo, integraciones, planes |
| `/admin` | Panel superadmin (`is_superadmin = true`) |

---

## Estructura del proyecto

```
saffi-erp/
├── app/
│   ├── page.tsx                    # Landing pública (server component)
│   ├── layout.tsx                  # Root layout (Geist font, metadata)
│   ├── globals.css                 # CSS variables brand + utilidades globales
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login Supabase
│   │   └── register/page.tsx       # Registro + setup tenant
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Shell: Sidebar + TopBar
│   │   ├── dashboard/page.tsx      # Dashboard principal
│   │   ├── contacts/               # CRM
│   │   ├── bookings/               # Reservas
│   │   ├── services/               # Catálogo e inventario
│   │   ├── vehicles/               # Flota
│   │   ├── hr/                     # RRHH
│   │   ├── finance/                # Finanzas
│   │   ├── accounting/             # Contabilidad
│   │   ├── reports/                # Reportes
│   │   └── settings/               # Configuración
│   ├── admin/                      # Panel superadmin
│   ├── api/
│   │   ├── register/               # Setup tenant post-signup
│   │   ├── stripe/                 # webhook, checkout, portal
│   │   └── cron/                   # trial-emails (Vercel Cron)
│   ├── upgrade/                    # Checkout Stripe público
│   ├── booking/                    # Reservas públicas
│   ├── privacidad/                 # Legal
│   ├── terminos/                   # Legal
│   ├── cookies/                    # Legal
│   └── seguridad/                  # Legal
│
├── components/
│   ├── landing/
│   │   ├── LandingLangContext.tsx  # Contexto i18n ES/EN + traducciones
│   │   ├── LandingContent.tsx      # Secciones landing (hero, features, pricing…)
│   │   ├── LandingNavbar.tsx       # Navbar público con toggle ES/EN
│   │   └── LegalLayout.tsx         # Layout compartido páginas legales
│   ├── layout/
│   │   ├── Sidebar.tsx             # Sidebar ERP con navegación
│   │   └── Topbar.tsx              # Topbar ERP
│   └── ui/                         # Componentes reutilizables (badges, skeletons…)
│
├── public/
│   ├── saffi-logo.svg              # Logo El Destello (fondo claro)
│   ├── saffi-logo-light.svg        # Logo El Destello (fondo oscuro, blanco)
│   └── favicon.svg                 # Favicon (rounded rect Sapphire + logo blanco)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Cliente browser
│   │   └── server.ts               # Cliente server (SSR)
│   └── countries.ts                # Lista de países para registro
│
├── middleware.ts                   # Auth guard + redirecciones + rutas públicas
├── vercel.json                     # Cron jobs Vercel
└── docs/                           # Documentación técnica detallada
```

---

## Desarrollo local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear variables de entorno
cp .env.example .env.local
# Completar con valores reales (ver sección Variables de entorno)

# 3. Arrancar servidor de desarrollo
npm run dev
# → http://localhost:3000
```

> El servidor de desarrollo usa Turbopack por defecto (Next.js 16).

---

## Variables de entorno

```env
# ── Supabase ──────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Solo server-side (API routes, middleware)
SUPABASE_ACCESS_TOKEN=                  # Para supabase CLI (migraciones)

# ── App ───────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Stripe ────────────────────────────────────────────────────────────
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Stripe Price IDs ──────────────────────────────────────────────────
NEXT_PUBLIC_STRIPE_STARTER_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_STARTER_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_PRO_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRO_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL=price_...
STRIPE_STARTER_MONTHLY=price_...
STRIPE_STARTER_ANNUAL=price_...
STRIPE_PRO_MONTHLY=price_...
STRIPE_PRO_ANNUAL=price_...
STRIPE_ENTERPRISE_MONTHLY=price_...
STRIPE_ENTERPRISE_ANNUAL=price_...

# ── Resend (email) ────────────────────────────────────────────────────
RESEND_API_KEY=re_...

# ── WhatsApp / Facebook ───────────────────────────────────────────────
NEXT_PUBLIC_FACEBOOK_APP_ID=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
```

---

## Middleware de autenticación

El middleware en `middleware.ts` intercepta todas las rutas excepto assets estáticos y APIs públicas.

**Lógica:**

```
Petición entrante
    │
    ├── /admin       → requiere is_superadmin = true
    │
    ├── Rutas públicas (sin auth):
    │   /, /login, /register, /upgrade, /suspended,
    │   /privacidad, /terminos, /cookies, /seguridad
    │
    ├── Usuario NO autenticado + ruta privada → redirect /login
    │
    ├── Usuario autenticado en / → redirect /dashboard
    ├── Usuario autenticado en /login o /register → redirect /dashboard
    │
    └── Usuario autenticado en ruta privada:
        ├── Trial expirado → redirect /upgrade
        └── Suspendido    → redirect /suspended
```

---

## Arquitectura multi-tenant

Un único proyecto Supabase. Aislamiento por `owner_id` + Row Level Security (RLS).

```
auth.users (Supabase Auth)
    └── owner_id ──► tenants
                         ├── plan: 'trial' | 'starter' | 'pro' | 'enterprise'
                         ├── status: 'trial' | 'active' | 'expired' | 'suspended'
                         ├── subscription_status: Stripe status
                         ├── stripe_customer_id
                         └── trial_ends_at
```

Función clave: `get_owner_id()` — resuelve el `owner_id` para cualquier miembro del equipo.
Ver [`docs/MULTI_TENANT.md`](docs/MULTI_TENANT.md).

---

## Planes y Stripe

| Plan | Mensual | Anual | Usuarios | Destacado |
|------|---------|-------|----------|-----------|
| **Starter** | $49 | $39 | 2 | CRM básico + WhatsApp |
| **Pro** | $99 | $79 | 5 | CRM completo + RRHH + Reportes |
| **Enterprise** | $199 | $159 | Ilimitados | Onboarding + SLA + Backup |

**Trial:** 10 días gratuitos, sin tarjeta de crédito.

Webhook de Stripe en producción:
```
URL: https://www.saffi.app/api/stripe/webhook
Eventos: checkout.session.completed
         customer.subscription.updated
         customer.subscription.deleted
         invoice.payment_failed
```

Ver [`docs/STRIPE_INTEGRATION.md`](docs/STRIPE_INTEGRATION.md).

---

## Infraestructura en producción

| Capa | Proveedor | Detalle |
|------|-----------|---------|
| Frontend / API | Vercel Edge Network | CI/CD automático desde `main` |
| Base de datos | Supabase (AWS us-east-1) | PostgreSQL + backups diarios |
| DNS + CDN | Cloudflare | Anycast global, DDoS protection |
| Pagos | Stripe | PCI DSS Level 1 |
| Email | Resend | Transaccional |
| Dominio | saffi.app | Registrado + SSL automático |

**Flujo de deploy:**
```
git push origin main
    └── GitHub → Vercel webhook → build → deploy en ~60s
```

---

## Landing page y i18n

La landing pública (`/`) soporta dos idiomas: **Español (ES)** y **Inglés (EN)**.

- El contexto `LandingLangContext` gestiona el idioma y lo persiste en `localStorage`.
- El toggle ES/EN está en el navbar (desktop: pastilla, mobile: botones con bandera).
- Todas las secciones (hero, features, pricing, footer) se traducen en tiempo real.

Ver [`docs/LANDING_MARKETING.md`](docs/LANDING_MARKETING.md).

---

## Páginas legales

Las 4 páginas legales son públicas y comparten el layout `LegalLayout.tsx`:

| Ruta | Contenido |
|------|-----------|
| `/privacidad` | Política de privacidad (RGPD, datos, derechos) |
| `/terminos` | Términos de uso (SLA, pagos, trial, uso aceptable) |
| `/cookies` | Política de cookies (Stripe, Supabase, Vercel) |
| `/seguridad` | Política de seguridad (TLS, RLS, PCI DSS, incidentes) |

---

## Migraciones SQL

```
supabase/migrations/
├── 001_initial.sql                      # Tablas base CRM
├── 002–005_...                          # Fixes iniciales
├── 20260520_whatsapp.sql                # WhatsApp configs
├── 20260521_*.sql                       # Reservas públicas
├── 20260522_*.sql                       # Fixes reservas y notificaciones
├── 20260524_*.sql                       # Triggers y timezone
├── 20260526_tenants.sql                 # Multi-tenant: planes + tenants
├── 20260526_team_rls.sql                # get_owner_id() + RLS equipo
├── 20260526_user_permissions.sql        # Permisos granulares por módulo
├── 20260527_*.sql                       # RLS finanzas, fixes, admin
└── 20260529_stripe_subscriptions.sql    # Columnas Stripe en tenants
```

```bash
# Aplicar migraciones en Supabase
npx supabase link --project-ref <ref>
npx supabase db push
```

---

## Documentación técnica

| Documento | Contenido |
|-----------|-----------|
| [`docs/LANDING_MARKETING.md`](docs/LANDING_MARKETING.md) | Arquitectura landing, i18n ES/EN, componentes, páginas legales |
| [`docs/MULTI_TENANT.md`](docs/MULTI_TENANT.md) | RLS, get_owner_id(), middleware, admin panel |
| [`docs/STRIPE_INTEGRATION.md`](docs/STRIPE_INTEGRATION.md) | Checkout, webhook, portal, sincronización de estados |
| [`docs/DASHBOARD_DATA.md`](docs/DASHBOARD_DATA.md) | Queries paralelas, KPIs, gráficas, timezone |
| [`docs/WHATSAPP_INTEGRATION.md`](docs/WHATSAPP_INTEGRATION.md) | Bot WhatsApp Business, horarios, zonas |
| [`docs/INVOICES_LOGIC.md`](docs/INVOICES_LOGIC.md) | Facturación, VAT, generación de PDF |
| [`docs/BOOKING_CONTACTS_LOGIC.md`](docs/BOOKING_CONTACTS_LOGIC.md) | Reservas públicas, sincronización contactos |
| [`docs/AVAILABILITY_LOGIC.md`](docs/AVAILABILITY_LOGIC.md) | Disponibilidad con buffer de traslado |
| [`docs/EMAIL_CRON.md`](docs/EMAIL_CRON.md) | Emails transaccionales y cron jobs |
| [`docs/HR_MODULE.md`](docs/HR_MODULE.md) | Nómina, asistencia, comisiones |
| [`docs/TIMEZONE_LOGIC.md`](docs/TIMEZONE_LOGIC.md) | Manejo de zonas horarias |
