import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const COUNTRIES: Record<string, { timezone: string; currency: string }> = {
  AE: { timezone: 'Asia/Dubai',          currency: 'AED' },
  CO: { timezone: 'America/Bogota',      currency: 'COP' },
  US: { timezone: 'America/New_York',    currency: 'USD' },
  SA: { timezone: 'Asia/Riyadh',         currency: 'SAR' },
  MX: { timezone: 'America/Mexico_City', currency: 'MXN' },
  ES: { timezone: 'Europe/Madrid',       currency: 'EUR' },
  GB: { timezone: 'Europe/London',       currency: 'GBP' },
}

export async function POST(request: Request) {
  const { userId, businessName, country, email } = await request.json()

  if (!userId || !businessName || !country || !email) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const countryData = COUNTRIES[country] ?? { timezone: 'UTC', currency: 'USD' }
  const slug = businessName.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  // Obtener plan Trial
  const { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('name', 'Trial')
    .single()

  // Crear todas las filas con service role (sin restricción de RLS)
  const [tenantResult] = await Promise.all([
    supabase.from('tenants').insert({
      owner_id:      userId,
      name:          businessName.trim(),
      slug:          slug,
      plan_id:       plan?.id ?? null,
      status:        'trial',
      trial_ends_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      country:       country,
      timezone:      countryData.timezone,
      currency:      countryData.currency,
    }),
    supabase.from('business_settings').insert({
      user_id:  userId,
      timezone: countryData.timezone,
      currency: countryData.currency,
    }),
    supabase.from('company_settings').insert([
      { user_id: userId, key: 'company_name',     value: businessName.trim() },
      { user_id: userId, key: 'company_subtitle', value: 'CAR WASH & DETAILING' },
    ]),
    supabase.from('user_permissions').upsert({
      user_id:     userId,
      role:        'admin',
      permissions: {
        dashboard: { view: true },
        contacts:  { view: true, create: true, edit: true, delete: true },
        services:  { view: true, create: true, edit: true, delete: true },
        vehicles:  { view: true, create: true, edit: true, delete: true },
        bookings:  { view: true, create: true, edit: true, delete: true },
        finance:   { view: true, create: true, edit: true, delete: true },
        reports:   { view: true },
        settings:  { view: true, create: true, edit: true, delete: true },
        _email:    email,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }),
    createDefaultChartOfAccounts(supabase, userId),
  ])

  if (tenantResult.error) {
    return NextResponse.json({ error: tenantResult.error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

async function createDefaultChartOfAccounts(supabase: any, userId: string) {
  const accounts = [
    { code: '1000', name: 'Activos',                    type: 'asset',     level: 1 },
    { code: '1100', name: 'Caja y Bancos',              type: 'asset',     level: 1 },
    { code: '1110', name: 'Caja',                       type: 'asset',     level: 1 },
    { code: '1120', name: 'Banco Principal',            type: 'asset',     level: 1 },
    { code: '1200', name: 'Cuentas por Cobrar',         type: 'asset',     level: 1 },
    { code: '1210', name: 'Facturas por Cobrar',        type: 'asset',     level: 1 },
    { code: '1300', name: 'Inventario',                 type: 'asset',     level: 1 },
    { code: '1400', name: 'IVA Acreditable',            type: 'asset',     level: 1 },
    { code: '2000', name: 'Pasivos',                    type: 'liability', level: 1 },
    { code: '2100', name: 'Cuentas por Pagar',          type: 'liability', level: 1 },
    { code: '2200', name: 'IVA por Pagar',              type: 'vat',       level: 1 },
    { code: '2300', name: 'Ingresos Diferidos',         type: 'liability', level: 1 },
    { code: '3000', name: 'Patrimonio',                 type: 'equity',    level: 1 },
    { code: '3100', name: 'Capital Social',             type: 'equity',    level: 1 },
    { code: '3200', name: 'Utilidades Retenidas',       type: 'equity',    level: 1 },
    { code: '4000', name: 'Ingresos',                   type: 'revenue',   level: 1 },
    { code: '4100', name: 'Ingresos por Servicios',     type: 'revenue',   level: 1 },
    { code: '4110', name: 'Detailing Básico',           type: 'revenue',   level: 1 },
    { code: '4120', name: 'Detailing Premium',          type: 'revenue',   level: 1 },
    { code: '4200', name: 'Otros Ingresos',             type: 'revenue',   level: 1 },
    { code: '5000', name: 'Gastos',                     type: 'expense',   level: 1 },
    { code: '5100', name: 'Costo de Servicios',         type: 'expense',   level: 1 },
    { code: '5110', name: 'Productos Químicos',         type: 'expense',   level: 1 },
    { code: '5111', name: 'Materiales Consumibles',     type: 'expense',   level: 1 },
    { code: '5120', name: 'Mano de Obra',               type: 'expense',   level: 1 },
    { code: '5200', name: 'Gastos Operativos',          type: 'expense',   level: 1 },
    { code: '5210', name: 'Alquiler',                   type: 'expense',   level: 1 },
    { code: '5211', name: 'Combustible Vehículos',      type: 'expense',   level: 1 },
    { code: '5220', name: 'Servicios Públicos',         type: 'expense',   level: 1 },
    { code: '5230', name: 'Marketing',                  type: 'expense',   level: 1 },
    { code: '5300', name: 'Gastos Administrativos',     type: 'expense',   level: 1 },
  ]

  await supabase.from('chart_of_accounts').insert(
    accounts.map(a => ({ ...a, user_id: userId, is_active: true }))
  )
}