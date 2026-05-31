import type { Plan } from '@/types'

export type Feature = 'hr' | 'reports' | 'crmTiers' | 'brandCustomization' | 'accounting'

// What each plan includes
export const PLAN_FEATURES: Record<Plan, Record<Feature, boolean>> = {
  trial:      { hr: true,  reports: true,  crmTiers: true,  brandCustomization: true,  accounting: true  },
  starter:    { hr: false, reports: false, crmTiers: false, brandCustomization: false, accounting: false },
  pro:        { hr: true,  reports: true,  crmTiers: true,  brandCustomization: false, accounting: true  },
  enterprise: { hr: true,  reports: true,  crmTiers: true,  brandCustomization: true,  accounting: true  },
}

// Minimum plan required to unlock each feature (for upgrade prompts)
export const FEATURE_MIN_PLAN: Record<Feature, string> = {
  hr:                 'Pro',
  reports:            'Pro',
  crmTiers:           'Pro',
  brandCustomization: 'Enterprise',
  accounting:         'Pro',
}

export const FEATURE_LABEL: Record<Feature, string> = {
  hr:                 'RRHH y Nómina',
  reports:            'Reportes completos',
  crmTiers:           'CRM con tiers',
  brandCustomization: 'Personalización de marca',
  accounting:         'Contabilidad y Finanzas',
}

export const PLAN_LABELS: Record<Plan, string> = {
  trial:      'Trial',
  starter:    'Starter',
  pro:        'Pro',
  enterprise: 'Enterprise',
}

export function hasFeature(plan: Plan, feature: Feature): boolean {
  return PLAN_FEATURES[plan]?.[feature] ?? false
}

// Route prefixes and the plans allowed to access them
export const PLAN_ROUTE_RULES: { prefix: string; allowedPlans: Plan[] }[] = [
  { prefix: '/hr',         allowedPlans: ['trial', 'pro', 'enterprise'] },
  { prefix: '/reports',    allowedPlans: ['trial', 'pro', 'enterprise'] },
  { prefix: '/finance',    allowedPlans: ['trial', 'pro', 'enterprise'] },
  { prefix: '/accounting', allowedPlans: ['trial', 'pro', 'enterprise'] },
]
