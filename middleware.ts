import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresca la sesión — no agregar lógica entre createServerClient y getUser()
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // ── Rutas /admin — requieren is_superadmin = true ─────────────────────────
  if (path.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: adminTenant } = await supabaseAdmin
      .from('tenants')
      .select('is_superadmin')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!adminTenant?.is_superadmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  const isLoginPage     = path.startsWith('/login')
  const isRegisterPage  = path.startsWith('/register')
  const isUpgradePage   = path.startsWith('/upgrade')
  const isSuspendedPage = path.startsWith('/suspended')
  const isPublicPage    = isLoginPage || isRegisterPage || isUpgradePage || isSuspendedPage

  // No autenticado → solo puede ver páginas públicas
  if (!user && !isPublicPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Autenticado en login/register → redirigir al dashboard
  if (user && (isLoginPage || isRegisterPage)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Autenticado — verificar estado del tenant
  if (user && !isPublicPage) {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, status, trial_ends_at, subscription_status, plan')
      .eq('owner_id', user.id)
      .maybeSingle()

    // Si no tiene tenant todavía (Noirem legacy o error) — dejar pasar
    if (tenant) {
      const now = new Date()

      // Trial expirado — campo legado
      const trialExpired = tenant.status === 'trial' &&
        tenant.trial_ends_at &&
        new Date(tenant.trial_ends_at) < now

      // Suscripción activa por Stripe — desbloquea acceso
      const stripeActive = tenant.subscription_status === 'active'

      // Expirado si: trial venció Y no tiene Stripe activo
      const isExpired = (tenant.status === 'expired' || trialExpired) && !stripeActive

      // Suspendido si: status=suspended Y no tiene Stripe activo
      const isSuspended = tenant.status === 'suspended' && !stripeActive

      // Trial expirado → upgrade (con tenant_id para pre-fill)
      if (isExpired && !isUpgradePage) {
        const url = request.nextUrl.clone()
        url.pathname = '/upgrade'
        if (tenant.id) url.searchParams.set('tenant_id', tenant.id)
        return NextResponse.redirect(url)
      }

      // Suspendido → suspended
      if (isSuspended && !isSuspendedPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/suspended'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/availability|api/whatsapp/webhook|api/cron|api/register|api/stripe|booking|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}