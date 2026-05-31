# Landing Page & Marketing Site

Documentación de la web pública de SAFFI en `saffi.app/`.

---

## Estructura de rutas públicas

```
/                   Landing page marketing (ES/EN)
/login              Login
/register           Registro + creación de tenant
/upgrade            Selección de plan Stripe
/privacidad         Política de privacidad
/terminos           Términos de uso
/cookies            Política de cookies
/seguridad          Política de seguridad
```

Todas estas rutas están declaradas como públicas en `middleware.ts` (`isPublicPage`).

---

## Componentes de la landing

```
components/landing/
├── LandingLangContext.tsx   Contexto ES/EN + objeto de traducciones
├── LandingContent.tsx       Secciones: hero, stats, features, how, pricing, CTA, footer
├── LandingNavbar.tsx        Navbar sticky: logo, links, toggle ES/EN, CTAs
└── LegalLayout.tsx          Layout compartido para las 4 páginas legales
```

### `app/page.tsx`

Server component. Solo exporta `metadata` y renderiza el árbol:

```tsx
<LandingLangProvider>   // client — gestiona estado de idioma
  <LandingNavbar />     // client — sticky, blur on scroll, toggle ES/EN
  <LandingContent />    // client — todas las secciones
</LandingLangProvider>
```

Al ser server component, `metadata` se procesa en el servidor para SEO correcto.

---

## Sistema de idiomas (i18n)

### Contexto

`LandingLangContext.tsx` exporta:
- `LandingLangProvider` — wrappea el árbol, gestiona `useState<'es'|'en'>`
- `useLandingLang()` — hook que devuelve `{ lang, setLang, t }`
- `T` — objeto con las dos traducciones completas

### Persistencia

El idioma elegido se guarda en `localStorage` con la clave `saffi-landing-lang`.
Al montar el provider, lee el valor guardado y lo aplica (sin flash).

### Añadir/modificar traducciones

```typescript
// En LandingLangContext.tsx
const T = {
  es: {
    badge: 'Especializado en Car Wash & Detailing a Domicilio',
    // ...todas las claves
  },
  en: {
    badge: 'Specialized in Mobile Car Wash & Detailing',
    // ...todas las claves (deben coincidir)
  },
}
```

Toda clave definida en `es` debe existir en `en` (TypeScript lo garantiza por `typeof T.es`).

### Toggle en el navbar

- **Desktop:** pastilla `ES | EN` con fondo `#F4F6F8`
- **Mobile:** botones con bandera `🇪🇸 Español | 🇺🇸 English`

---

## Secciones de la landing

| Sección | ID ancla | Contenido |
|---------|----------|-----------|
| Navbar | — | Logo + links + toggle ES/EN + CTA |
| Hero | — | Badge, headline (Cyan gradient), sub, CTAs, mockup dashboard CSS |
| Stats | — | 500+ negocios · 2M+ servicios · 98% satisfacción · 12 países |
| Features | `#features` | Grid 3×2: Reservas, CRM, Facturación, Inventario, Analytics, Roles |
| Cómo funciona | `#how` | 3 pasos numerados con conector visual |
| Pricing | `#pricing` | Starter $49 · Pro $99 ⭐ · Enterprise $199 |
| CTA Banner | — | CTA final con doble botón |
| Footer | — | 4 columnas + links legales |

### Pricing — datos reales (sincronizados con Stripe)

```typescript
// En LandingLangContext.tsx — actualizar si cambian los precios en settings
Starter:    $49/mes · $39/año · 2 usuarios
Pro:        $99/mes · $79/año · 5 usuarios
Enterprise: $199/mes · $159/año · ilimitados
Trial:      10 días gratuitos, sin tarjeta
```

Si cambias los precios en Stripe/settings, actualiza también las traducciones en `LandingLangContext.tsx` (`planStarterFeatures`, `planProFeatures`, etc.) y los textos del hero.

---

## Logo — El Destello

### Especificaciones (brand book)

```
Forma:            Diamante asimétrico vertical
Grid base:        32 × 60 px
Ratio H:V:        1 : 1.875
Curvas:           Cubic Bézier cóncavas entre las 4 puntas
Control points:   Todos apuntan hacia el centro → efecto "waist" pronunciado
Cusps:            Tangentes anti-paralelas en cada punta (sharp points)
Highlight:        Cyan 500 (#3DD9D6), 36% del tamaño, centrado en (16,30)
Color símbolo:    Sapphire 700 (#0B2A4A)
```

### Path SVG

```svg
<!-- Outer star — Sapphire 700 -->
<path d="M16,0 C16,14 28,30 32,30 C28,30 16,46 16,60 C16,46 4,30 0,30 C4,30 16,14 16,0Z"
      fill="#0B2A4A"/>
<!-- Inner diamond — Cyan 500 (36%: ±5.76 × ±10.8 from center) -->
<polygon points="16,19.2 21.76,30 16,40.8 10.24,30" fill="#3DD9D6"/>
```

### Archivos

| Archivo | Uso |
|---------|-----|
| `public/saffi-logo.svg` | Fondos claros (navbar landing, login, register) |
| `public/saffi-logo-light.svg` | Fondos oscuros (footer, hero) — outer star en blanco |
| `public/favicon.svg` | Pestaña browser — rounded rect Sapphire + logo blanco |

---

## Páginas legales

Todas usan el componente `LegalLayout.tsx`.

### `LegalLayout` — props

```typescript
interface LegalLayoutProps {
  title:    string       // Título de la página
  subtitle: string       // Subtítulo / descripción corta
  updated:  string       // Fecha de última actualización
  sections: Section[]    // Array de secciones
}

interface Section {
  id:      string        // ID para ancla y ToC
  title:   string        // Título de la sección
  content: ReactNode     // JSX del contenido
}
```

### Estructura de cada página legal

```
Navbar minimal
  └── Logo saffi + "← Volver al inicio"

Header (fondo Sapphire)
  └── "LEGAL · SAFFI ERP" + título + subtítulo + fecha

Body (grid 2 columnas)
  ├── Sidebar sticky: índice numerado con hover Cyan
  └── Main: cards blancas por sección

Banner de contacto
  └── Fondo Sapphire + CTA Amber → legal@saffi.app

Footer minimal
  └── Logo + copyright + links cruzados entre las 4 páginas legales
```

### CSS en LegalLayout

```css
.legal-body p        → margin-bottom: 14px
.legal-body h3       → font-size: 15px, color: Sapphire
.legal-body ul/ol    → padding-left: 20px
.legal-body strong   → color: Sapphire
.legal-body a        → color: Cyan, font-weight: 700
.legal-body .highlight → box con borde Cyan, fondo rgba(Cyan, 0.08)
```

### Añadir una sección

```tsx
// En app/privacidad/page.tsx (o cualquier página legal)
{
  id: 'nueva-seccion',
  title: 'Título de la sección',
  content: (
    <>
      <p>Párrafo del contenido.</p>
      <div className="highlight">Caja destacada.</div>
      <ul>
        <li><strong>Item:</strong> descripción</li>
      </ul>
    </>
  ),
}
```

---

## Auth pages (login / register)

Ambas páginas comparten el mismo diseño para coherencia de marca:

```
Fondo:   Gradiente Sapphire (linear-gradient 160deg, #0B2A4A → #0d3660 → #0a2240)
Blobs:   Radial gradients decorativos (Cyan top-right, Amber bottom-left)
Card:    Blanca, border-radius: 20, box-shadow profunda
Logo:    saffi-logo-light.svg + wordmark "saffi" en blanco (sobre fondo oscuro)
CTA:     Botón Amber (#F5B544) con box-shadow dorada
Links:   Color Cyan (#3DD9D6)
Inputs:  Fondo #F4F6F8, borde #E8EDF2, texto Sapphire
```

**Flujo de registro:**
1. `/register` → usuario completa form (negocio, país, email, contraseña)
2. `supabase.auth.signUp()` con metadata `{ business_name, country, pending_setup: true }`
3. `POST /api/register` → crea el tenant en Supabase con service role
4. Pantalla step 2: "Revisa tu email" (confirmación)
5. Click en link de email → `/auth/callback` → redirect a `/dashboard`

---

## Redirecciones del middleware (resumen)

```
/ (sin auth)         → mostrar landing
/ (con auth)         → redirect /dashboard
/login (con auth)    → redirect /dashboard
/register (con auth) → redirect /dashboard
/ruta-privada (sin auth) → redirect /login
trial expirado       → redirect /upgrade
suspendido           → redirect /suspended
/admin (no superadmin) → redirect /dashboard
```
