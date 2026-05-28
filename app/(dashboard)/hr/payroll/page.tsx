'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PayrollPeriod } from '@/types'
import { Plus, ChevronRight, DollarSign } from 'lucide-react'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string, bg: string, color: string }> = {
  draft:    { label: 'Borrador',  bg: '#F0EFEA', color: '#5A5852' },
  approved: { label: 'Aprobado', bg: '#E6F0FA', color: '#1F5A9B' },
  paid:     { label: 'Pagado',   bg: '#E6F5EC', color: '#1F8F5C' },
}

const INPUT: React.CSSProperties = {
  background: '#FFFFFF', border: '1.5px solid #F0EFEA',
  borderRadius: 8, padding: '9px 12px',
  color: '#0B2A4A', fontSize: 13, width: '100%',
  boxSizing: 'border-box',
}

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#5A5852',
  display: 'block', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.5px',
}

export default function PayrollPage() {
  const supabase = createClient()

  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    notes: '',
  })

  useEffect(() => {
    fetchPeriods()
  }, [])

  async function fetchPeriods() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setPeriods(data ?? [])
    setLoading(false)
  }

  async function handleCreate(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await supabase
      .from('payroll_periods')
      .insert({
        user_id: user.id,
        name: form.name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        notes: form.notes.trim() || null,
        status: 'draft',
        total_amount: 0,
      })

    if (!error) {
      setShowForm(false)
      setForm({ name: '', start_date: '', end_date: '', notes: '' })
      fetchPeriods()
    }
    setSaving(false)
  }

  const totalPaid = periods
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.total_amount, 0)

  return (
    <div style={{ background: '#f5f4ef', minHeight: '100vh', padding: '32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3DD9D6', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Recursos Humanos
            </p>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: '#0B2A4A', fontFamily: 'Geist, -apple-system, sans-serif', letterSpacing: '-0.025em' }}>
              Nómina
            </h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#F5B544', color: '#1A1A1A',
              border: 'none', borderRadius: 8, padding: '10px 20px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Nuevo período
          </button>
        </div>

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total períodos', value: periods.length },
            { label: 'Pagados',        value: periods.filter(p => p.status === 'paid').length },
            { label: 'Total pagado',   value: totalPaid.toLocaleString('es', { minimumFractionDigits: 0 }) },
          ].map(k => (
            <div key={k.label} style={{
              background: '#FFFFFF', border: '1px solid #F0EFEA',
              borderRadius: 12, padding: '20px 24px',
              boxShadow: '0 4px 12px rgba(11,42,74,0.06)',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(61,217,214,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={18} color="#3DD9D6" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0B2A4A', lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: '#5A5852', marginTop: 4 }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Formulario nuevo período */}
        {showForm && (
          <form onSubmit={handleCreate} style={{
            background: '#FFFFFF', border: '1px solid #F0EFEA',
            borderRadius: 12, padding: '24px 28px', marginBottom: 20,
            boxShadow: '0 4px 12px rgba(11,42,74,0.06)',
          }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3DD9D6', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 20 }}>
              Nuevo período de nómina
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={LABEL}>Nombre *</label>
                <input
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="ej. Mayo 2026" required style={INPUT}
                />
              </div>
              <div>
                <label style={LABEL}>Fecha inicio *</label>
                <input
                  type="date" value={form.start_date}
                  onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                  required style={INPUT}
                />
              </div>
              <div>
                <label style={LABEL}>Fecha fin *</label>
                <input
                  type="date" value={form.end_date}
                  onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                  required style={INPUT}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{
                background: 'transparent', border: '1.5px solid #F0EFEA',
                color: '#5A5852', borderRadius: 8, padding: '9px 18px',
                fontSize: 13, cursor: 'pointer',
              }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} style={{
                background: '#F5B544', color: '#1A1A1A', border: 'none',
                borderRadius: 8, padding: '9px 22px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? 'Creando...' : 'Crear período'}
              </button>
            </div>
          </form>
        )}

        {/* Lista de períodos */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #F0EFEA',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(11,42,74,0.06)',
        }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #F0EFEA' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3DD9D6', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Períodos
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: '#A8A6A0' }}>Cargando...</div>
          ) : periods.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', fontSize: 13, color: '#A8A6A0' }}>
              No hay períodos de nómina todavía.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F0EFEA' }}>
                  {['Período', 'Fechas', 'Total', 'Estado', ''].map(h => (
                    <th key={h} style={{
                      padding: '11px 28px', textAlign: 'left',
                      fontSize: 10, fontWeight: 600, color: '#A8A6A0',
                      letterSpacing: '0.5px', textTransform: 'uppercase',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((p, i) => {
                  const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.draft
                  return (
                    <tr key={p.id} style={{ borderBottom: i < periods.length - 1 ? '1px solid #F0EFEA' : 'none' }}>
                      <td style={{ padding: '14px 28px', fontSize: 14, fontWeight: 600, color: '#0B2A4A' }}>
                        {p.name}
                      </td>
                      <td style={{ padding: '14px 28px', fontSize: 12, color: '#5A5852', fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(p.start_date + 'T12:00:00').toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                        {' → '}
                        {new Date(p.end_date + 'T12:00:00').toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '14px 28px', fontSize: 13, color: '#0B2A4A', fontFamily: 'JetBrains Mono, monospace' }}>
                        {p.total_amount.toLocaleString('es', { minimumFractionDigits: 0 })}
                      </td>
                      <td style={{ padding: '14px 28px' }}>
                        <span style={{
                          background: sc.bg, color: sc.color,
                          padding: '3px 10px', borderRadius: 100,
                          fontSize: 11, fontWeight: 600,
                        }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 28px' }}>
                        <Link href={`/hr/payroll/${p.id}`} style={{ color: '#3DD9D6', textDecoration: 'none' }}>
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Link a empleados */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/hr" style={{ fontSize: 13, color: '#3DD9D6', textDecoration: 'none' }}>
            ← Ver equipo
          </Link>
        </div>

      </div>
    </div>
  )
}