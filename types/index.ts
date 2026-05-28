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
