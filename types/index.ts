// ── Stripe / Subscription types ───────────────────────────────────────────────
export type Plan             = 'trial' | 'starter' | 'pro' | 'enterprise'
export type PlanInterval     = 'monthly' | 'annual'
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'

export interface TenantSubscription {
  plan:                 Plan
  planInterval:         PlanInterval
  subscriptionStatus:   SubscriptionStatus
  stripeCustomerId?:    string
  stripeSubscriptionId?:string
  trialEndsAt?:         string
  subscriptionEndsAt?:  string
}

// ── CRM types ─────────────────────────────────────────────────────────────────
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

// ─── RRHH / Nómina ───────────────────────────────────────

export type EmployeeRole = 'technician' | 'admin' | 'supervisor'
export type EmployeeStatus = 'active' | 'inactive'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'holiday' | 'permission'
export type PayrollPeriodStatus = 'draft' | 'approved' | 'paid'
export type SalaryPeriod = 'monthly' | 'weekly'

export interface Employee {
  id: string
  user_id: string
  full_name: string
  email: string | null
  phone: string | null
  role: EmployeeRole
  status: EmployeeStatus
  salary_base: number
  salary_period: SalaryPeriod
  start_date: string
  end_date: string | null
  notes: string | null
  avatar_url: string | null
  commission_type: CommissionType
  commission_value: number
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  user_id: string
  employee_id: string
  date: string
  status: AttendanceStatus
  check_in: string | null
  check_out: string | null
  notes: string | null
  created_at: string
}

export interface PayrollPeriod {
  id: string
  user_id: string
  name: string
  start_date: string
  end_date: string
  status: PayrollPeriodStatus
  total_amount: number
  paid_at: string | null
  notes: string | null
  created_at: string
}

export interface PayrollLine {
  id: string
  user_id: string
  payroll_period_id: string
  employee_id: string
  days_worked: number
  days_absent: number
  salary_base: number
  deductions: number
  bonuses: number
  total: number
  notes: string | null
  created_at: string
  employee?: Employee
}

// ─── Bookings ─────────────────────────────────────────────

export interface Booking {
  id: string
  user_id: string
  contact_id: string | null
  vehicle_id: string | null
  service_id: string | null
  status: string
  scheduled_at: string
  end_at: string | null
  price: number
  discount: number
  address: string | null
  notes: string | null
  progress: number
  payment_method: string | null
  payment_status: string | null
  vat_pct: number | null
  cancellation_reason: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  completed_at: string | null
  created_at: string
  contacts?: { name: string }
  vehicles?: { name: string; license_plate: string }
  services?: { name: string; duration_minutes: number }
}

// ─── Comisiones ───────────────────────────────────────────

export type CommissionType = 'none' | 'percentage' | 'fixed'
export type CommissionStatus = 'pending' | 'included' | 'paid'

export interface BookingCommission {
  id: string
  user_id: string
  employee_id: string
  booking_id: string
  payroll_period_id: string | null
  service_amount: number
  commission_type: CommissionType
  commission_value: number
  commission_amount: number
  status: CommissionStatus
  created_at: string
  employee?: Employee
  booking?: Booking
}
