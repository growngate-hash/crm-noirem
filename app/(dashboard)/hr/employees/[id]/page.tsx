'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Employee } from '@/types'
import Link from 'next/link'
import { ArrowLeft, Pencil, Check, User, Mail, Phone, Briefcase, DollarSign, Calendar, FileText, ChevronDown } from 'lucide-react'
import EmployeeAttendance from './EmployeeAttendance'

const CYAN = '#3DD9D6'
const CTA  = '#F5B544'

const ROLE_LABELS: Record<string, string> = {
  technician: 'Técnico',
  admin: 'Administrativo',
  supervisor: 'Supervisor',
}

const STATUS_CONFIG: Record<string, { label: string, bg: string, color: string }> = {
  active:   { label: 'Activo',   bg: '#E6F5EC', color: '#1F8F5C' },
  inactive: { label: 'Inactivo', bg: '#FBE7E2', color: '#D9533D' },
}

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#5A5852', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.5px',
}

const ICON_BASE: React.CSSProperties = {
  position: 'absolute', left: 14, top: '50%',
  transform: 'translateY(-50%)', transition: 'color 0.18s', pointerEvents: 'none',
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [userId, setUserId]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [focused, setFocused]   = useState<string | null>(null)

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', role: 'technician',
    salary_base: '', salary_period: 'monthly', start_date: '',
    commission_type: 'none', commission_value: '', notes: '',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/hr'); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('employees').select('*')
        .eq('id', id).eq('user_id', user.id).maybeSingle()
      if (!data) { router.push('/hr'); return }
      setEmployee(data)
      setForm({
        full_name: data.full_name ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        role: data.role ?? 'technician',
        salary_base: String(data.salary_base ?? ''),
        salary_period: data.salary_period ?? 'monthly',
        start_date: data.start_date ?? '',
        commission_type: data.commission_type ?? 'none',
        commission_value: String(data.commission_value ?? ''),
        notes: data.notes ?? '',
      })
      setLoading(false)
    }
    load()
  }, [id])

  async function handleToggleStatus() {
    if (!employee) return
    const newStatus = employee.status === 'active' ? 'inactive' : 'active'

    // 1. Actualizar status del empleado
    await supabase
      .from('employees')
      .update({ status: newStatus })
      .eq('id', id)

    // 2. Actualizar employee_ids en vehículos
    if (newStatus === 'inactive') {
      // Buscar vehículos que tengan al empleado por ID o por nombre
      const { data: vehiclesByIds } = await supabase
        .from('vehicles')
        .select('id, employee_ids, technicians')
        .contains('employee_ids', [id])

      const { data: vehiclesByName } = await supabase
        .from('vehicles')
        .select('id, employee_ids, technicians')
        .contains('technicians', [employee.full_name])

      // Combinar y deduplicar
      const allVehicles = [
        ...(vehiclesByIds ?? []),
        ...(vehiclesByName ?? []),
      ].filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)

      if (allVehicles.length) {
        for (const vehicle of allVehicles) {
          const updatedIds = (vehicle.employee_ids ?? [])
            .filter((eid: string) => eid !== id)
          const updatedTechnicians = (vehicle.technicians ?? [])
            .filter((name: string) => name !== employee.full_name)

          await supabase
            .from('vehicles')
            .update({
              employee_ids: updatedIds,
              technicians: updatedTechnicians,
              technician: updatedTechnicians.join(', '),
            })
            .eq('id', vehicle.id)
        }
      }
    }

    // 3. Actualizar estado local
    setEmployee(prev => prev ? { ...prev, status: newStatus } : prev)
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase.from('employees').update({
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      role: form.role,
      salary_base: parseFloat(form.salary_base) || 0,
      salary_period: form.salary_period,
      start_date: form.start_date,
      commission_type: form.commission_type,
      commission_value: parseFloat(form.commission_value) || 0,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (!error) {
      setEmployee(prev => prev ? { ...prev,
        full_name: form.full_name, email: form.email || null,
        phone: form.phone || null, role: form.role as any,
        salary_base: parseFloat(form.salary_base) || 0,
        salary_period: form.salary_period as any, start_date: form.start_date,
        commission_type: form.commission_type as any,
        commission_value: parseFloat(form.commission_value) || 0,
        notes: form.notes || null,
      } : prev)
      setEditing(false)
    }
    setSaving(false)
  }

  const foc = (name: string) => ({
    onFocus: () => setFocused(name),
    onBlur:  () => setFocused(null),
  })

  function fieldStyle(name: string, withIcon = true): React.CSSProperties {
    const active = focused === name
    return {
      width: '100%', padding: withIcon ? '11px 14px 11px 42px' : '11px 14px',
      background: '#FFFFFF', border: `1.5px solid ${active ? CYAN : '#F0EFEA'}`,
      borderRadius: 8, color: '#0B2A4A', fontSize: 14,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      boxSizing: 'border-box' as const, outline: 'none',
      transition: 'border-color 0.18s, box-shadow 0.18s',
      boxShadow: active ? '0 0 0 3px rgba(61,217,214,0.12)' : 'none',
    }
  }

  if (loading) return (
    <div style={{ background: '#f5f4ef', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 13, color: '#A8A6A0', fontFamily: 'JetBrains Mono, monospace' }}>Cargando...</div>
    </div>
  )

  if (!employee) return null
  const sc = STATUS_CONFIG[employee.status] ?? STATUS_CONFIG.inactive

  return (
    <div style={{ background: '#f5f4ef', minHeight: '100vh', padding: '32px' }}>
      <style>{`.emp-input::placeholder { color: #A8A6A0 }`}</style>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        <Link href="/hr" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5A5852', textDecoration: 'none', marginBottom: 24, fontFamily: '-apple-system, sans-serif' }}>
          <ArrowLeft size={14} /> Volver a equipo
        </Link>

        {/* Header */}
        <div style={{ background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 12, padding: '28px 32px', marginBottom: 20, boxShadow: '0 4px 12px rgba(11,42,74,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: CYAN, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>Empleado</div>
              <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 600, color: '#0B2A4A', fontFamily: 'Geist, -apple-system, sans-serif', letterSpacing: '-0.025em' }}>
                {employee.full_name}
              </h1>
              {employee.email && <div style={{ fontSize: 13, color: '#5A5852' }}>{employee.email}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={handleToggleStatus} style={{ background: sc.bg, color: sc.color, padding: '5px 14px', borderRadius: 100, fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}>
                {sc.label} — click para cambiar
              </button>
              <button onClick={() => setEditing(!editing)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: editing ? '#F0EFEA' : '#0B2A4A', color: editing ? '#5A5852' : '#FFFFFF', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Pencil size={13} /> {editing ? 'Cancelar' : 'Editar'}
              </button>
            </div>
          </div>

          {/* Info grid */}
          {!editing && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginTop: 24, paddingTop: 24, borderTop: '1px solid #F0EFEA' }}>
              {[
                { label: 'Rol',           value: ROLE_LABELS[employee.role] ?? employee.role },
                { label: 'Salario base',  value: `${employee.salary_base.toLocaleString('es')} / ${employee.salary_period === 'monthly' ? 'mes' : 'sem'}` },
                { label: 'Fecha ingreso', value: new Date(employee.start_date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) },
                { label: 'Teléfono',      value: employee.phone ?? '—' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 10, color: '#A8A6A0', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>{item.label}</div>
                  <div style={{ fontSize: 14, color: '#0B2A4A', fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Formulario inline */}
          {editing && (
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #F0EFEA', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={LABEL}>Nombre completo *</label>
                <div style={{ position: 'relative' }}>
                  <User size={15} color={focused === 'full_name' ? CYAN : '#A8A6A0'} style={ICON_BASE} />
                  <input className="emp-input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="ej. Juan Pérez" {...foc('full_name')} style={fieldStyle('full_name')} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={LABEL}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} color={focused === 'email' ? CYAN : '#A8A6A0'} style={ICON_BASE} />
                    <input className="emp-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="juan@empresa.com" {...foc('email')} style={fieldStyle('email')} />
                  </div>
                </div>
                <div>
                  <label style={LABEL}>Teléfono</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={15} color={focused === 'phone' ? CYAN : '#A8A6A0'} style={ICON_BASE} />
                    <input className="emp-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+57 300 000 0000" {...foc('phone')} style={fieldStyle('phone')} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={LABEL}>Rol</label>
                  <div style={{ position: 'relative' }}>
                    <Briefcase size={15} color={focused === 'role' ? CYAN : '#A8A6A0'} style={{ ...ICON_BASE, zIndex: 1 }} />
                    <ChevronDown size={14} color="#A8A6A0" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} {...foc('role')} style={{ ...fieldStyle('role'), appearance: 'none', cursor: 'pointer' }}>
                      <option value="technician">Técnico</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Administrativo</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={LABEL}>Salario base</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={15} color={focused === 'salary_base' ? CYAN : '#A8A6A0'} style={ICON_BASE} />
                    <input className="emp-input" type="number" min="0" step="0.01" value={form.salary_base} onChange={e => setForm(p => ({ ...p, salary_base: e.target.value }))} placeholder="0.00" {...foc('salary_base')} style={fieldStyle('salary_base')} />
                  </div>
                </div>
                <div>
                  <label style={LABEL}>Período</label>
                  <div style={{ position: 'relative' }}>
                    <ChevronDown size={14} color="#A8A6A0" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <select value={form.salary_period} onChange={e => setForm(p => ({ ...p, salary_period: e.target.value }))} {...foc('salary_period')} style={{ ...fieldStyle('salary_period', false), appearance: 'none', cursor: 'pointer' }}>
                      <option value="monthly">Mensual</option>
                      <option value="weekly">Semanal</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label style={LABEL}>Fecha de ingreso</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={15} color={focused === 'start_date' ? CYAN : '#A8A6A0'} style={ICON_BASE} />
                  <input className="emp-input" type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} {...foc('start_date')} style={fieldStyle('start_date')} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={LABEL}>Tipo de comisión</label>
                  <div style={{ position: 'relative' }}>
                    <ChevronDown size={14} color="#A8A6A0" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <select value={form.commission_type} onChange={e => setForm(p => ({ ...p, commission_type: e.target.value }))} {...foc('commission_type')} style={{ ...fieldStyle('commission_type', false), appearance: 'none', cursor: 'pointer' }}>
                      <option value="none">Sin comisión</option>
                      <option value="percentage">Porcentaje del servicio</option>
                      <option value="fixed">Monto fijo por servicio</option>
                    </select>
                  </div>
                </div>
                {form.commission_type !== 'none' && (
                  <div>
                    <label style={LABEL}>{form.commission_type === 'percentage' ? 'Porcentaje (%)' : 'Monto fijo'}</label>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={15} color={focused === 'commission_value' ? CYAN : '#A8A6A0'} style={ICON_BASE} />
                      <input className="emp-input" type="number" min="0" step="0.01" value={form.commission_value} onChange={e => setForm(p => ({ ...p, commission_value: e.target.value }))} placeholder={form.commission_type === 'percentage' ? 'ej. 10' : 'ej. 50'} {...foc('commission_value')} style={fieldStyle('commission_value')} />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label style={LABEL}>Notas</label>
                <div style={{ position: 'relative' }}>
                  <FileText size={15} color={focused === 'notes' ? CYAN : '#A8A6A0'} style={{ position: 'absolute', left: 14, top: 13, transition: 'color 0.18s', pointerEvents: 'none' }} />
                  <textarea className="emp-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Información adicional..." rows={3} {...foc('notes')} style={{ ...fieldStyle('notes'), paddingTop: 12, paddingBottom: 12, resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditing(false)} style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#5A5852', background: 'transparent', border: '1.5px solid #F0EFEA', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: saving ? 'rgba(245,181,68,0.5)' : CTA, color: '#1A1A1A', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={14} /> {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )}
        </div>

        <EmployeeAttendance employeeId={id} userId={userId} />
      </div>
    </div>
  )
}
