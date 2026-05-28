'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, User, Mail, Phone, Briefcase, DollarSign, Calendar, FileText, ChevronDown } from 'lucide-react'
import Link from 'next/link'

const CYAN = '#3DD9D6'
const CTA  = '#F5B544'

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

  async function handleSubmit(e: React.BaseSyntheticEvent) {
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
      width: '100%',
      padding: withIcon ? '11px 14px 11px 42px' : '11px 14px',
      background: '#FFFFFF',
      border: `1.5px solid ${active ? CYAN : '#F0EFEA'}`,
      borderRadius: 8,
      color: '#0B2A4A',
      fontSize: 14,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      boxSizing: 'border-box' as const,
      outline: 'none',
      transition: 'border-color 0.18s, box-shadow 0.18s',
      boxShadow: active ? '0 0 0 3px rgba(61,217,214,0.12)' : 'none',
    }
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

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div style={{ background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 12, boxShadow: '0 4px 12px rgba(11,42,74,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 28px', borderBottom: '1px solid #F0EFEA', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: CYAN, flexShrink: 0 }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 500, color: CYAN, textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</span>
        </div>
        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 700, margin: '0 auto', background: '#f5f4ef', minHeight: '100vh' }}>
      <style>{`.saffi-input::placeholder { color: #A8A6A0 }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 36, paddingBottom: 24, borderBottom: '2px solid #F0EFEA' }}>
        <Link href="/hr" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#5A5852', textDecoration: 'none', marginBottom: 24, padding: '5px 10px 5px 6px', border: '1px solid #F0EFEA', borderRadius: 6, background: '#FFFFFF' }}>
          <ArrowLeft size={13} /> Volver a equipo
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="10" fill="#0B2A4A"/>
            <polygon points="20,7 33,18 20,33 7,18" fill="none" stroke="#3DD9D6" strokeWidth="1.5"/>
            <polygon points="20,11 29,18 20,29 11,18" fill="rgba(61,217,214,0.08)"/>
            <circle cx="20" cy="18" r="3.5" fill="#3DD9D6"/>
          </svg>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: '#5A5852', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>Recursos Humanos</p>
            <h1 style={{ margin: '3px 0 0', fontSize: 24, fontWeight: 700, color: '#0B2A4A', fontFamily: 'Geist, -apple-system, sans-serif', letterSpacing: '-0.3px' }}>Nuevo empleado</h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <Section title="Información personal">
          <div>
            <label style={LABEL}>Nombre completo *</label>
            <div style={{ position: 'relative' }}>
              <User size={15} color={focused === 'full_name' ? CYAN : '#A8A6A0'} style={ICON_BASE} />
              <input className="saffi-input" name="full_name" value={form.full_name} onChange={handleChange} required placeholder="ej. Juan Pérez" {...foc('full_name')} style={fieldStyle('full_name')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={LABEL}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color={focused === 'email' ? CYAN : '#A8A6A0'} style={ICON_BASE} />
                <input className="saffi-input" name="email" value={form.email} onChange={handleChange} type="email" placeholder="juan@empresa.com" {...foc('email')} style={fieldStyle('email')} />
              </div>
            </div>
            <div>
              <label style={LABEL}>Teléfono</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color={focused === 'phone' ? CYAN : '#A8A6A0'} style={ICON_BASE} />
                <input className="saffi-input" name="phone" value={form.phone} onChange={handleChange} placeholder="+57 300 000 0000" {...foc('phone')} style={fieldStyle('phone')} />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Contrato">
          <div>
            <label style={LABEL}>Rol *</label>
            <div style={{ position: 'relative' }}>
              <Briefcase size={15} color={focused === 'role' ? CYAN : '#A8A6A0'} style={{ ...ICON_BASE, zIndex: 1 }} />
              <ChevronDown size={14} color="#A8A6A0" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
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
                <DollarSign size={15} color={focused === 'salary_base' ? CYAN : '#A8A6A0'} style={ICON_BASE} />
                <input className="saffi-input" name="salary_base" value={form.salary_base} onChange={handleChange} type="number" min="0" step="0.01" required placeholder="0.00" {...foc('salary_base')} style={fieldStyle('salary_base')} />
              </div>
            </div>
            <div>
              <label style={LABEL}>Período</label>
              <div style={{ position: 'relative' }}>
                <ChevronDown size={14} color="#A8A6A0" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
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
              <Calendar size={15} color={focused === 'start_date' ? CYAN : '#A8A6A0'} style={ICON_BASE} />
              <input className="saffi-input" name="start_date" value={form.start_date} onChange={handleChange} type="date" required {...foc('start_date')} style={fieldStyle('start_date')} />
            </div>
          </div>
        </Section>

        <Section title="Notas">
          <div style={{ position: 'relative' }}>
            <FileText size={15} color={focused === 'notes' ? CYAN : '#A8A6A0'} style={{ position: 'absolute', left: 14, top: 13, transition: 'color 0.18s', pointerEvents: 'none' }} />
            <textarea className="saffi-input" name="notes" value={form.notes} onChange={handleChange} placeholder="Información adicional sobre el empleado..." rows={4} {...foc('notes')} style={{ ...fieldStyle('notes'), paddingTop: 12, paddingBottom: 12, resize: 'vertical', minHeight: 100 }} />
          </div>
        </Section>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 8, fontSize: 13, background: '#FBE7E2', color: '#D9533D', border: '1px solid rgba(217,83,61,0.25)', display: 'flex', gap: 8 }}>
            <span style={{ fontWeight: 600 }}>Error:</span> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link href="/hr" style={{ padding: '12px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#5A5852', textDecoration: 'none', border: '1.5px solid #F0EFEA', background: 'transparent', display: 'flex', alignItems: 'center' }}>
            Cancelar
          </Link>
          <button type="submit" disabled={loading} style={{ padding: '12px 32px', borderRadius: 8, fontSize: 14, fontWeight: 700, background: loading ? 'rgba(245,181,68,0.5)' : CTA, color: '#1A1A1A', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(245,181,68,0.3)', transition: 'background 0.15s, box-shadow 0.15s', fontFamily: 'Geist, -apple-system, sans-serif', letterSpacing: '0.2px' }}>
            {loading ? 'Guardando...' : 'Guardar empleado'}
          </button>
        </div>

      </form>
    </div>
  )
}