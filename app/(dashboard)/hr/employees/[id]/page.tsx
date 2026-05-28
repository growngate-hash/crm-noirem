import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import EmployeeAttendance from './EmployeeAttendance'

export const revalidate = 0

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!employee) notFound()

  const ROLE_LABELS: Record<string, string> = {
    technician: 'Técnico',
    admin: 'Administrativo',
    supervisor: 'Supervisor',
  }

  const STATUS_CONFIG: Record<string, { label: string, bg: string, color: string }> = {
    active:   { label: 'Activo',   bg: '#E6F5EC', color: '#1F8F5C' },
    inactive: { label: 'Inactivo', bg: '#FBE7E2', color: '#D9533D' },
  }

  const sc = STATUS_CONFIG[employee.status] ?? STATUS_CONFIG.inactive

  return (
    <div style={{ background: '#f5f4ef', minHeight: '100vh', padding: '32px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Breadcrumb */}
        <Link href="/hr" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: '#5A5852', textDecoration: 'none', marginBottom: 24,
          fontFamily: '-apple-system, sans-serif',
        }}>
          <ArrowLeft size={14} /> Volver a equipo
        </Link>

        {/* Header empleado */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #F0EFEA',
          borderRadius: 12, padding: '28px 32px', marginBottom: 20,
          boxShadow: '0 4px 12px rgba(11,42,74,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                color: '#3DD9D6', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6,
              }}>
                Empleado
              </div>
              <h1 style={{
                margin: '0 0 4px', fontSize: 26, fontWeight: 600,
                color: '#0B2A4A', fontFamily: 'Geist, -apple-system, sans-serif',
                letterSpacing: '-0.025em',
              }}>
                {employee.full_name}
              </h1>
              {employee.email && (
                <div style={{ fontSize: 13, color: '#5A5852' }}>{employee.email}</div>
              )}
            </div>
            <span style={{
              background: sc.bg, color: sc.color,
              padding: '5px 14px', borderRadius: 100,
              fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
            }}>
              {sc.label}
            </span>
          </div>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginTop: 24, paddingTop: 24, borderTop: '1px solid #F0EFEA' }}>
            {[
              { label: 'Rol',           value: ROLE_LABELS[employee.role] ?? employee.role },
              { label: 'Salario base',  value: `${employee.salary_base.toLocaleString('es')} / ${employee.salary_period === 'monthly' ? 'mes' : 'sem'}` },
              { label: 'Fecha ingreso', value: new Date(employee.start_date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) },
              { label: 'Teléfono',      value: employee.phone ?? '—' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: 10, color: '#A8A6A0', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 14, color: '#0B2A4A', fontWeight: 500 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Asistencia */}
        <EmployeeAttendance employeeId={id} userId={user.id} />

      </div>
    </div>
  )
}