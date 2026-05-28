'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'var(--color-input)', border: '1px solid var(--color-border)',
  borderRadius: 8, color: 'var(--color-text-primary)',
  fontSize: 14, boxSizing: 'border-box',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--color-text-secondary)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.5px',
}

export default function NewEmployeePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'technician',
    salary_base: '',
    salary_period: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { error } = await supabase
      .from('employees')
      .insert({
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

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/hr')
  }

  return (
    <div style={{ padding: '32px', maxWidth: 680, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/hr" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: 'var(--color-text-secondary)', textDecoration: 'none', marginBottom: 16,
        }}>
          <ArrowLeft size={14} /> Volver a equipo
        </Link>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Nuevo empleado
        </h1>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit}>
        <div style={{
          background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: 12, padding: '28px',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>

          {/* Nombre */}
          <div>
            <label style={LABEL_STYLE}>Nombre completo *</label>
            <input
              name="full_name" value={form.full_name} onChange={handleChange}
              required placeholder="ej. Juan Pérez"
              style={INPUT_STYLE}
            />
          </div>

          {/* Email y Teléfono */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={LABEL_STYLE}>Email</label>
              <input
                name="email" value={form.email} onChange={handleChange}
                type="email" placeholder="juan@empresa.com"
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Teléfono</label>
              <input
                name="phone" value={form.phone} onChange={handleChange}
                placeholder="+57 300 000 0000"
                style={INPUT_STYLE}
              />
            </div>
          </div>

          {/* Rol */}
          <div>
            <label style={LABEL_STYLE}>Rol *</label>
            <select name="role" value={form.role} onChange={handleChange} style={INPUT_STYLE}>
              <option value="technician">Técnico</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Administrativo</option>
            </select>
          </div>

          {/* Salario */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={LABEL_STYLE}>Salario base *</label>
              <input
                name="salary_base" value={form.salary_base} onChange={handleChange}
                type="number" min="0" step="0.01" required placeholder="0.00"
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Período</label>
              <select name="salary_period" value={form.salary_period} onChange={handleChange} style={INPUT_STYLE}>
                <option value="monthly">Mensual</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
          </div>

          {/* Fecha de ingreso */}
          <div>
            <label style={LABEL_STYLE}>Fecha de ingreso *</label>
            <input
              name="start_date" value={form.start_date} onChange={handleChange}
              type="date" required
              style={INPUT_STYLE}
            />
          </div>

          {/* Notas */}
          <div>
            <label style={LABEL_STYLE}>Notas</label>
            <textarea
              name="notes" value={form.notes} onChange={handleChange}
              placeholder="Información adicional..."
              rows={3}
              style={{ ...INPUT_STYLE, resize: 'vertical' }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: '#FBE7E2', color: '#D9533D',
              border: '1px solid rgba(217,83,61,0.2)',
            }}>
              {error}
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <Link href="/hr" style={{
              padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
              color: 'var(--color-text-secondary)', textDecoration: 'none',
              border: '1px solid var(--color-border)',
            }}>
              Cancelar
            </Link>
            <button type="submit" disabled={loading} style={{
              padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: 'var(--color-accent)', color: '#000', border: 'none', cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Guardando...' : 'Guardar empleado'}
            </button>
          </div>

        </div>
      </form>
    </div>
  )
}