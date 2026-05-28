'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, User, Mail, Phone, Briefcase, DollarSign, Calendar, FileText, ChevronDown } from 'lucide-react'
import Link from 'next/link'

const AMBER = '#F5B544'

export default function NewEmployeePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', role: 'technician',
    salary_base: '', salary_period: 'monthly',
    start_date: new Date().toISOString().split('T')[0], notes: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { error } = await supabase.from('employees').insert({
      user_id: user.id,
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      role: form.role,
      salary_base: parseFloat(form.salary_base) || 0,
      salary_period: form.salary_period,
      start_date: form.start_date,
      notes: form.notes.trim() || null,
      status: 'active',
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/hr')
  }

  const foc = (name: string) => ({
    onFocus: () => setFocused(name),
    onBlur:  () => setFocused(null),
  })

  function fieldStyle(name: string, withIcon = true): React.CSSProperties {
    const active = focused === name
    return {
      width: '100%', padding: withIcon ? '11px 14px 11px 42px' : '11px 14px',
      background: '#FFFFFF',
      border: `1.5px solid ${active ? AMBER : '#D1D5DB'}`,
      borderRadius: 8, color: '#111827',
      fontSize: 14, boxSizing: 'border-box' as const,
      outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s',
      fontFamily: 'inherit',
      boxShadow: active ? '0 0 0 3px rgba(245,181,68,0.15)' : 'none',
    }
  }

  const LABEL: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: '#374151', marginBottom: 7,
  }

  const ICON_BASE: React.CSSProperties = {
    position: 'absolute', left: 14, top: '50%',
    transform: 'translateY(-50%)', transition: 'color 0.18s', pointerEvents: 'none',
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: AMBER, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: AMBER, textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</span>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 700, margin: '0 auto' }}>
      <style>{`.hr-input::placeholder { color: #9CA3AF }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <Link href="/hr" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', textDecoration: 'none', marginBottom: 20, padding: '5px 10px 5px 6px', border: '1px solid var(--color-border)', borderRadius: 6 }}>
          <ArrowLeft size={13} /> Volver a equipo
        </Link>
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderTop: `3px solid ${AMBER}`, borderRadius: '0 0 12px 12px', padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245,181,68,0.12)', border: '1px solid rgba(245,181,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={22} color={AMBER} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Recursos Humanos</p>
              <h1 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>Nuevo empleado</h1>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Información personal */}
        <Section title="Información personal">
          <div>
            <label style={LABEL}>Nombre completo *</label>
            <div style={{ position: 'relative' }}>
              <User size={15} color={focused === 'full_name' ? AMBER : '#9CA3AF'} style={ICON_BASE} />
              <input className="hr-input" name="full_name" value={form.full_name} onChange={handleChange} required placeholder="ej. Juan Pérez" {...foc('full_name')} style={fieldStyle('full_name')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={LABEL}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color={focused === 'email' ? AMBER : '#9CA3AF'} style={ICON_BASE} />
                <input className="hr-input" name="email" value={form.email} onChange={handleChange} type="email" placeholder="juan@empresa.com" {...foc('email')} style={fieldStyle('email')} />
              </div>
            </div>
            <div>
              <label style={LABEL}>Teléfono</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color={focused === 'phone' ? AMBER : '#9CA3AF'} style={ICON_BASE} />
                <input className="hr-input" name="phone" value={form.phone} onChange={handleChange} placeholder="+57 300 000 0000" {...foc('phone')} style={fieldStyle('phone')} />
              </div>
            </div>
          </div>
        </Section>

        {/* Contrato */}
        <Section title="Contrato">
          <div>
            <label style={LABEL}>Rol *</label>
            <div style={{ position: 'relative' }}>
              <Briefcase size={15} color={focused === 'role' ? AMBER : '#9CA3AF'} style={{ ...ICON_BASE, zIndex: 1 }} />
              <ChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <select name="role" value={form.role} onChange={handleChange} {...foc('role')} style={{ ...fieldStyle('role'), appearance: 'none', cursor: 'pointer' }}>
                <option value="technician">Técnico</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Administrativo</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={LABEL}>Salario base *</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={15} color={focused === 'salary_base' ? AMBER : '#9CA3AF'} style={ICON_BASE} />
                <input className="hr-input" name="salary_base" value={form.salary_base} onChange={handleChange} type="number" min="0" step="0.01" required placeholder="0.00" {...foc('salary_base')} style={fieldStyle('salary_base')} />
              </div>
            </div>
            <div>
              <label style={LABEL}>Período</label>
              <div style={{ position: 'relative' }}>
                <ChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <select name="salary_period" value={form.salary_period} onChange={handleChange} {...foc('salary_period')} style={{ ...fieldStyle('salary_period', false), appearance: 'none', cursor: 'pointer' }}>
                  <option value="monthly">Mensual</option>
                  <option value="weekly">Semanal</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label style={LABEL}>Fecha de ingreso *</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={15} color={focused === 'start_date' ? AMBER : '#9CA3AF'} style={ICON_BASE} />
              <input className="hr-input" name="start_date" value={form.start_date} onChange={handleChange} type="date" required {...foc('start_date')} style={fieldStyle('start_date')} />
            </div>
          </div>
        </Section>

        {/* Notas */}
        <Section title="Notas">
          <div style={{ position: 'relative' }}>
            <FileText size={15} color={focused === 'notes' ? AMBER : '#9CA3AF'} style={{ position: 'absolute', left: 14, top: 13, transition: 'color 0.18s', pointerEvents: 'none' }} />
            <textarea className="hr-input" name="notes" value={form.notes} onChange={handleChange} placeholder="Información adicional sobre el empleado..." rows={4} {...foc('notes')} style={{ ...fieldStyle('notes'), paddingTop: 12, paddingBottom: 12, resize: 'vertical', minHeight: 100 }} />
          </div>
        </Section>

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 8, fontSize: 13, background: 'rgba(217,83,61,0.08)', color: '#D9533D', border: '1px solid rgba(217,83,61,0.25)', display: 'flex', gap: 8 }}>
            <span style={{ fontWeight: 600 }}>Error:</span> {error}
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link href="/hr" style={{ padding: '11px 22px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#374151', textDecoration: 'none', border: '1.5px solid #D1D5DB', display: 'flex', alignItems: 'center' }}>
            Cancelar
          </Link>
          <button type="submit" disabled={loading} style={{ padding: '12px 32px', borderRadius: 8, fontSize: 14, fontWeight: 700, background: loading ? 'rgba(245,181,68,0.5)' : AMBER, color: '#000', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(245,181,68,0.3)', transition: 'background 0.15s, box-shadow 0.15s', letterSpacing: '0.2px' }}>
            {loading ? 'Guardando...' : 'Guardar empleado'}
          </button>
        </div>

      </form>
    </div>
  )
}