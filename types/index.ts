export type Tier = 'Black Diamond' | 'Platinum' | 'VIP'
export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task' | 'deal_moved' | 'deal_created' | 'contact_created'

export interface Company {
  id: string
  user_id: string
  name: string
  industry: string | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  user_id: string
  company_id: string | null
  name: string
  email: string | null
  phone: string | null
  tier: Tier
  vehicle: string | null
  plate: string | null
  address: string | null
  notes: string | null
  lifetime_value: number
  total_bookings: number
  created_at: string
  updated_at: string
  company?: Company
}

export interface DealStage {
  id: string
  user_id: string
  name: string
  color: string
  position: number
}

export interface Deal {
  id: string
  user_id: string
  contact_id: string | null
  company_id: string | null
  stage_id: string | null
  title: string
  value: number
  currency: string
  probability: number
  close_date: string | null
  notes: string | null
  position: number
  created_at: string
  updated_at: string
  contact?: Contact
  company?: Company
  stage?: DealStage
}

export interface Activity {
  id: string
  user_id: string
  contact_id: string | null
  deal_id: string | null
  company_id: string | null
  type: ActivityType
  title: string
  description: string | null
  created_at: string
  contact?: Contact
  deal?: Deal
}

export interface BusinessSettings {
  id: string
  user_id: string
  business_name: string
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  currency: string
  tax_rate: number
  deposit_pct: number
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  totalContacts: number
  totalDeals: number
  totalRevenue: number
  activeDeals: number
  wonDeals: number
  conversionRate: number
  recentActivities: Activity[]
}
