'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PayrollLine, Employee } from '@/types'
import { Plus, Trash2, CheckCircle } from 'lucide-react'

interface Props {
  periodId: string
  userId: string
  periodStatus: string
  periodDays: number
  employees: Pick<Employee, 'id' | 'full_name' | 'salary_base' | 'salary_period' | 'role'>[]
  lines: (PayrollLine & { employee: Employee })[]
}

const INPUT: React.CSSProperties = {
  background: '#FFFFFF', border: '1.5px solid #F0EFEA',
  borderRadius: 8, padding: '8px 12px',
  color: '#0B2A4A', fontSize: 13,
  boxSizing: 'border-box' as const, width: '100%',
}

export default function PayrollActions({ periodId, userId, periodStatus, periodDays, employees, lines }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error', text: string } | null>(null)

  const [form, setForm] = useState({
    employee_id: '',
    days_worked: String(periodDays),
    days_absent: '0',
    bonuses: '0',
    deductions: '0',
    notes: '',
  })

  // Empleados que aún no tienen línea en este período
  const availableEmployees = employees.filter(e => !lines.find(l => l.employee_id === e.id))

  // Calcular total automáticamente
  const selectedEmployee = employees.find(e => e.id === form.employee_id)
  const dailySalary = selectedEmployee
    ? selectedEmployee.salary_period === 'monthly'
      ? selectedEmployee.salary_base / 30
      : selectedEmployee.salary_base / 7
    : 0
  const calculatedTotal = dailySalary * Number(form.days_worked)
    + Number(form.bonuses)
    - Number(form.deductions)

  async function handleAddLine(e: React.FormEvent) {
    e.preventDefault()
    if (!form.employee_id) return
    setSaving(true)
    setMessage(null)

    const total = Math.max(0, calculatedTotal)

    const { error } = await supabase
      .from('payroll_lines')
      .insert({
        user_id: userId,
        payroll_period_id: periodId,
        employee_id: form.employee_id,
        days_worked: Number(form.days_worked),
        days_absent: Number(form.days_absent),
        salary_base: selectedEmployee?.salary_base ?? 0,
        bonuses: Number(form.bonuses),
        deductions: Number(form.deductions),
        total,
      })

    if (!error) {
      // Actualizar total del período
      const newTotal = lines.reduce((sum, l) => sum + l.total, 0) + total
      await supabase
        .from('payroll_periods')
        .update({ total_amount: newTotal })
        .eq('id', periodId)

      setShowAdd(false)
      setForm({ employee_id: '', days_worked: String(periodDays), days_absent: '0', bonuses: '0', deductions: '0', notes: '' })
      router.refresh()
    } else {
      setMessage({ type: 'error', text: error.message })
    }
    setSaving(false)
  }

  async function handleDelete(lineId: string, lineTotal: number) {
    const { error } = await supabase
      .from('payroll_lines')
      .delete()
      .eq('id', lineId)

    if (!error) {
      const newTotal = lines.reduce((sum, l) => sum + l.total, 0) - lineTotal
      await supabase
        .from('payroll_periods')
        .update({ total_amount: Math.max(0, newTotal) })
        .eq('id', periodId)
      router.refresh()
    }
  }

  async function handleApprove() {
    await supabase
      .from('payroll_periods')
      .update({ status: 'approved' })
      .eq('id', periodId)
    router.refresh()
  }

  async function handleMarkPaid() {
    await supabase
      .from('payroll_periods')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', periodId)
    router.refresh()
  }

  const isDraft = periodStatus === 'draft'
  const isApproved = periodStatus === 'approved'

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #F0EFEA',
      borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(11,42,74,0.06)',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 28px', borderBottom: '1px solid #F0EFEA',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3DD9D6', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Líneas de nómina
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isDraft && availableEmployees.length > 0 && (
            <button onClick={() => setShowAdd(!showAdd)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#F5B544', color: '#1A1A1A', border: 'none',
              borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <Plus size={14} /> Agregar empleado
            </button>
          )}
          {isDraft && lines.length > 0 && (
            <button onClick={handleApprove} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#E6F0FA', color: '#1F5A9B', border: '1px solid #B8D4ED',
              borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <CheckCircle size={14} /> Aprobar
            </button>
          )}
          {isApproved && (
            <button onClick={handleMarkPaid} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#E6F5EC', color: '#1F8F5C', border: '1px solid #A3D9B8',
              borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <CheckCircle size={14} /> Marcar como pagado
            </button>
          )}
        </div>
      </div>

      {/* Formulario agregar línea */}
      {showAdd && (
        <form onSubmit={handleAddLine} style={{
          padding: '20px 28px', borderBottom: '1px solid #F0EFEA', background: '#FAFAF7',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#5A5852', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Empleado *</label>
              <select value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))} style={INPUT} required>
                <option value="">Seleccionar...</option>
                {availableEmployees.map(e => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#5A5852', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Días trabajados</label>
              <input type="number" min="0" max={periodDays} value={form.days_worked} onChange={e => setForm(p => ({ ...p, days_worked: e.target.value }))} style={INPUT} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#5A5852', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ausencias</label>
              <input type="number" min="0" value={form.days_absent} onChange={e => setForm(p => ({ ...p, days_absent: e.target.value }))} style={INPUT} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#5A5852', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bonos</label>
              <input type="number" min="0" value={form.bonuses} onChange={e => setForm(p => ({ ...p, bonuses: e.target.value }))} style={INPUT} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#5A5852', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deducciones</label>
              <input type="number" min="0" value={form.deductions} onChange={e => setForm(p => ({ ...p, deductions: e.target.value }))} style={INPUT} />
            </div>
          </div>

          {selectedEmployee && (
            <div style={{ fontSize: 12, color: '#5A5852', marginBottom: 12, fontFamily: 'JetBrains Mono, monospace' }}>
              Salario diario: {dailySalary.toFixed(2)} · Total calculado: <strong style={{ color: '#0B2A4A' }}>{Math.max(0, calculatedTotal).toLocaleString('es', { minimumFractionDigits: 2 })}</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowAdd(false)} style={{
              background: 'transparent', border: '1.5px solid #F0EFEA',
              color: '#5A5852', borderRadius: 7, padding: '8px 16px', fontSize: 13, cursor: 'pointer',
            }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{
              background: '#F5B544', color: '#1A1A1A', border: 'none',
              borderRadius: 7, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Guardando...' : 'Agregar'}
            </button>
          </div>

          {message && (
            <div style={{ marginTop: 10, fontSize: 12, color: message.type === 'ok' ? '#1F8F5C' : '#D9533D' }}>
              {message.text}
            </div>
          )}
        </form>
      )}

      {/* Tabla de líneas */}
      {lines.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', fontSize: 13, color: '#A8A6A0' }}>
          No hay empleados agregados a este período todavía.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F0EFEA' }}>
              {['Empleado', 'Días', 'Ausencias', 'Salario base', 'Bonos', 'Deducciones', 'Total', ''].map(h => (
                <th key={h} style={{
                  padding: '11px 16px', textAlign: 'left',
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
            {lines.map((line, i) => (
              <tr key={line.id} style={{ borderBottom: i < lines.length - 1 ? '1px solid #F0EFEA' : 'none' }}>
                <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 600, color: '#0B2A4A' }}>
                  {line.employee?.full_name ?? '—'}
                </td>
                <td style={{ padding: '13px 16px', fontSize: 13, color: '#5A5852', textAlign: 'center' }}>{line.days_worked}</td>
                <td style={{ padding: '13px 16px', fontSize: 13, color: '#5A5852', textAlign: 'center' }}>{line.days_absent}</td>
                <td style={{ padding: '13px 16px', fontSize: 13, color: '#5A5852', fontFamily: 'JetBrains Mono, monospace' }}>
                  {line.salary_base.toLocaleString('es', { minimumFractionDigits: 0 })}
                </td>
                <td style={{ padding: '13px 16px', fontSize: 13, color: '#1F8F5C', fontFamily: 'JetBrains Mono, monospace' }}>
                  +{line.bonuses.toLocaleString('es', { minimumFractionDigits: 0 })}
                </td>
                <td style={{ padding: '13px 16px', fontSize: 13, color: '#D9533D', fontFamily: 'JetBrains Mono, monospace' }}>
                  -{line.deductions.toLocaleString('es', { minimumFractionDigits: 0 })}
                </td>
                <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 700, color: '#0B2A4A', fontFamily: 'JetBrains Mono, monospace' }}>
                  {line.total.toLocaleString('es', { minimumFractionDigits: 0 })}
                </td>
                <td style={{ padding: '13px 16px' }}>
                  {isDraft && (
                    <button onClick={() => handleDelete(line.id, line.total)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: '#D9533D', padding: 4,
                    }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}