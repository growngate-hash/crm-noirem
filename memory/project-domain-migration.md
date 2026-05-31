---
name: project-domain-migration
description: Migración de crm-noirem.vercel.app a saffi.app — qué se actualizó, qué queda pendiente en infraestructura
metadata:
  type: project
---

Migración de dominio completada el 2026-05-31.

**Por qué:** El proyecto pasó del subdominio auto-generado de Vercel (`crm-noirem.vercel.app`) al dominio de producción `saffi.app`. El dominio viejo seguía sirviendo la app porque Vercel mantiene ambos activos por defecto.

**Cambios en código (todos en rama main):**
- `app/api/invite/route.ts` — fallback de `redirectTo` en invitaciones: `crm-noirem.vercel.app` → `saffi.app`
- `supabase/functions/whatsapp-bot/index.ts` — fallback de `BOOKING_URL`: `crm-noirem.vercel.app/booking` → `saffi.app/booking`
- `app/api/whatsapp/webhook/route.ts` — cambiado de `process.env.BOOKING_URL` a `process.env.NEXT_PUBLIC_BOOKING_URL` (variable que sí existe en Vercel), fallback actualizado de `saffi.ae/book` → `saffi.app/booking`
- `app/auth/page.tsx` — eliminado (página de login con branding antiguo oscuro); reemplazada por `/login`
- `components/layout/Sidebar.tsx` — logout redirige a `/login` en vez de `/auth`
- `app/accept-invite/page.tsx` — CTA de error redirige a `/login` en vez de `/auth`

**Variables de entorno en Vercel (producción):**
- `NEXT_PUBLIC_APP_URL` = `https://saffi.app`
- `NEXT_PUBLIC_BOOKING_URL` = `https://saffi.app/booking` ← verificar que el valor sea este

**Secret de Supabase Edge Functions:**
- `BOOKING_URL` — no configurado actualmente; el fallback en el código es `https://saffi.app/booking`
- Si se necesita cambiar la URL de booking sin tocar código: `supabase secrets set BOOKING_URL=https://saffi.app/booking`

**Pendiente en Vercel (infraestructura, no código):**
- En Settings → Domains, configurar `crm-noirem.vercel.app` como redirect permanente (308) a `saffi.app` para evitar que el dominio viejo siga activo.

**How to apply:** Si aparece cualquier referencia a `crm-noirem.vercel.app` o `saffi.ae` en el código, es un residuo de la migración y debe actualizarse a `saffi.app`.
