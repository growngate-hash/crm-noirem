---
name: plan-feature-gates
description: Sistema de feature gates por plan (starter/pro/enterprise) — archivos clave, matriz de features y cómo extenderlo
metadata:
  type: project
---

Sistema de feature gates implementado el 2026-05-30. Última actualización: 2026-05-31.

**Por qué:** Los usuarios de todos los planes podían acceder a todas las rutas y módulos sin restricción. Se implementó para que cada plan solo vea lo que incluye su suscripción.

**Archivos clave:**
- `lib/plan-features.ts` — fuente de verdad: matriz `PLAN_FEATURES`, `PLAN_ROUTE_RULES`, helper `hasFeature()`
- `contexts/PlanContext.tsx` — contexto React que carga el plan del tenant desde Supabase; expone `usePlan()` → `{ plan, tenantId, loaded, hasFeature }`
- `middleware.ts` — bloqueo server-side: redirige a `/upgrade?tenant_id=X` si el plan no tiene acceso a la ruta
- `components/layout/Sidebar.tsx` — items bloqueados se muestran en gris con candado, no son clickables
- `app/(dashboard)/layout.tsx` — monta `<PlanProvider>` para toda la app

**Matriz de acceso actual (features):**

| Feature | starter | pro | enterprise | trial |
|---|---|---|---|---|
| `hr` (RRHH + Nómina) | ✗ | ✓ | ✓ | ✓ |
| `reports` (Reportes completos) | ✗ | ✓ | ✓ | ✓ |
| `crmTiers` (CRM con tiers VIP) | ✗ | ✓ | ✓ | ✓ |
| `accounting` (Contabilidad y Finanzas) | ✗ | ✓ | ✓ | ✓ |
| `brandCustomization` (Personalización de marca) | ✗ | ✗ | ✓ | ✓ |

**Rutas bloqueadas por plan (PLAN_ROUTE_RULES):**
- `/hr` — requiere pro o enterprise
- `/reports` — requiere pro o enterprise
- `/finance` — requiere pro o enterprise
- `/accounting` — requiere pro o enterprise

**Contenido del plan Starter:**
- 1 usuario
- 2 vehículos / técnicos
- Reservas y CRM básico
- WhatsApp Bot incluido
- NO incluye: Contabilidad y finanzas, RRHH + Nómina, Reportes completos, Soporte prioritario

**Cómo extender:** Añadir nueva feature en `PLAN_FEATURES` y `FEATURE_MIN_PLAN` en `lib/plan-features.ts`. Para bloquear una ruta nueva, añadir entrada en `PLAN_ROUTE_RULES` (mismo archivo). Para bloquear un ítem de sidebar, añadir `feature: 'nombreFeature'` al array `NAV` en `Sidebar.tsx`.

**How to apply:** Cuando el usuario pida agregar restricciones de plan a nuevas rutas o features, seguir el patrón de `lib/plan-features.ts` — no crear nuevos sistemas paralelos.
