'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Employee } from '@/types'
import { Users2, UserCheck, UserX, Plus, ChevronRight, DollarSign } from 'lucide-react'
import Link from 'next/link'

const ROLE_LABELS: Record<string, string> = {
  technician: 'Técnico',
  admin: 'Administrativo',
  supervisor: 'Supervisor',
}

const STATUS_CONFIG: Record<string, { label: string, bg: string, color: string }> = {
  active:   { label: 'Activo',   bg: '#E6F5EC', color: '#1F8F5C' },
  inactive: { label: 'Inactivo', bg: '#FBE7E2', color: '#D9533D' },
}

export default function HRPage() {
  const router = useRouter()
  const supabase = createClient()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEmployees()
  }, [])

  async function fetchEmployees() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .order('full_name')
    setEmployees(data ?? [])
    setLoading(false)
  }

  const active   = employees.filter(e => e.status === 'active').length
  const inactive = employees.filter(e => e.status === 'inactive').length
  const technicians = employees.filter(e => e.role === 'technician' && e.status === 'active').length

  const kpis = [
    { label: 'Total empleados', value: employees.length, icon: Users2,    color: '#1F5A9B' },
    { label: 'Activos',         value: active,           icon: UserCheck,  color: '#1F8F5C' },
    { label: 'Inactivos',       value: inactive,         icon: UserX,      color: '#D9533D' },
    { label: 'Técnicos activos',value: technicians,      icon: Users2,     color: '#F5B544' },
  ]

  return (
    <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Recursos Humanos
          </p>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Equipo
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/hr/payroll" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent',
            border: '1.5px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            padding: '10px 20px', borderRadius: 8,
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
            <DollarSign size={16} /> Nómina
          </Link>
          <Link href="/hr/employees/new" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--color-accent)', color: '#000',
            padding: '10px 20px', borderRadius: 8,
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
            <Plus size={16} /> Nuevo empleado
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {kpis.map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} style={{
              background: 'var(--color-card)', border: '1px solid var(--color-border)',
              borderRadius: 12, padding: '20px 24px',
              display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: '0 2px 8px rgba(11,42,74,0.07)',
              transition: 'box-shadow 0.2s',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: k.color + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color={k.color} />
              </div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>
                  {k.value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {k.label}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Lista de empleados */}
      <div style={{
        background: 'var(--color-card)', border: '1px solid var(--color-border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Empleados
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Cargando...
          </div>
        ) : employees.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Users2 size={40} color="var(--color-text-secondary)" style={{ marginBottom: 12 }} />
            <p style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--color-text-secondary)' }}>
              No hay empleados registrados todavía.
            </p>
            <Link href="/hr/employees/new" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--color-accent)', color: '#000',
              padding: '9px 18px', borderRadius: 8,
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>
              <Plus size={14} /> Agregar primer empleado
            </Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Empleado', 'Rol', 'Salario base', 'Ingreso', 'Estado', ''].map(h => (
                  <th key={h} style={{
                    padding: '12px 24px', textAlign: 'left',
                    fontSize: 11, fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => {
                const sc = STATUS_CONFIG[emp.status] ?? STATUS_CONFIG.inactive
                return (
                  <tr
                    key={emp.id}
                    style={{
                      borderBottom: i < employees.length - 1 ? '1px solid var(--color-border)' : 'none',
                      cursor: 'pointer',
                      borderRadius: 8,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F5F4EF'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    onClick={() => router.push(`/hr/employees/${emp.id}`)}
                  >
                    <td style={{ padding: '14px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 3, height: 36, borderRadius: 2,
                          background: 'var(--color-accent, #F5B544)',
                          flexShrink: 0,
                        }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {emp.full_name}
                          </div>
                          {emp.email && (
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                              {emp.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 24px', fontSize: 13, color: 'var(--color-text-primary)' }}>
                      {ROLE_LABELS[emp.role] ?? emp.role}
                    </td>
                    <td style={{ padding: '14px 24px', fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
                      {emp.salary_base.toLocaleString('es', { minimumFractionDigits: 0 })}
                      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 4 }}>
                        /{emp.salary_period === 'monthly' ? 'mes' : 'sem'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 24px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {new Date(emp.start_date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '14px 24px' }}>
                      <span style={{
                        background: sc.bg, color: sc.color,
                        padding: '3px 10px', borderRadius: 100,
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 24px' }}>
                      <ChevronRight size={16} color="var(--color-text-secondary)" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}