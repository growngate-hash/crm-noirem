'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/contexts/CompanyContext'
import { PayrollLine, Employee } from '@/types'
import { Plus, Trash2, CheckCircle } from 'lucide-react'

interface Props {
  periodId: string
  userId: string
  periodStatus: string
  periodDays: number
  periodName: string
  employees: Pick<Employee, 'id' | 'full_name' | 'salary_base' | 'salary_period' | 'role'>[]
  lines: (PayrollLine & { employee: Employee })[]
}

const INPUT: React.CSSProperties = {
  background: '#FFFFFF', border: '1.5px solid #F0EFEA',
  borderRadius: 8, padding: '8px 12px',
  color: '#0B2A4A', fontSize: 13,
  boxSizing: 'border-box' as const, width: '100%',
}

export default function PayrollActions({ periodId, userId, periodStatus, periodDays, periodName, employees, lines }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const { currency } = useCompany()

  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error', text: string } | null>(null)

  const [showPayModal, setShowPayModal] = useState(false)
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [bankAccounts, setBankAccounts] = useState<{id: string, name: string, account_type: string, current_balance: number, currency: string}[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const [form, setForm] = useState({
    employee_id: '',
    days_worked: String(periodDays),
    days_absent: '0',
    bonuses: '0',
    deductions: '0',
    notes: '',
  })

  const availableEmployees = employees.filter(e => !lines.find(l => l.employee_id === e.id))

  const selectedEmployee = employees.find(e => e.id === form.employee_id)
  const dailySalary = selectedEmployee
    ? selectedEmployee.salary_period === 'monthly'
      ? selectedEmployee.salary_base / 30
      : selectedEmployee.salary_base / 7
    : 0
  const calculatedTotal = dailySalary * Number(form.days_worked)
    + Number(form.bonuses)
    - Number(form.deductions)

  async function loadBankAccounts() {
    setLoadingAccounts(true)
    const supabaseClient = createClient()
    const { data } = await supabaseClient
      .from('bank_accounts')
      .select('id, name, account_type, current_balance, currency')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name')
    setBankAccounts(data ?? [])
    setLoadingAccounts(false)
  }

  async function handleAddLine(e: React.BaseSyntheticEvent) {
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

  async function handleMarkPaid(accountId: string) {
    if (!accountId) return
    setSaving(true)

    const totalNomina = lines.reduce((sum, l) => sum + l.total, 0)
    const account = bankAccounts.find(a => a.id === accountId)

    // 1. Marcar período como pagado
    await supabase
      .from('payroll_periods')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', periodId)

    // 2. Descontar saldo de bank_account
    if (account) {
      await supabase
        .from('bank_accounts')
        .update({ current_balance: account.current_balance - totalNomina })
        .eq('id', accountId)
    }

    // 3. Generar asiento contable
    const { data: bankAccountData } = await supabase
      .from('bank_accounts')
      .select('chart_account_id')
      .eq('id', accountId)
      .maybeSingle()

    const { data: nominaAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('code', '5120')
      .maybeSingle()

    const { data: fiscalPeriod } = await supabase
      .from('fiscal_periods')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'open')
      .maybeSingle()

    if (bankAccountData?.chart_account_id && nominaAccount?.id) {
      const now = new Date()
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`

      const { data: lastEntry } = await supabase
        .from('journal_entries')
        .select('entry_number')
        .eq('user_id', userId)
        .like('entry_number', `JE-${yearMonth}-%`)
        .order('entry_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      const lastNum = lastEntry?.entry_number
        ? parseInt(lastEntry.entry_number.split('-')[2]) + 1
        : 1
      const entryNumber = `JE-${yearMonth}-${String(lastNum).padStart(4, '0')}`

      const { data: journalEntry } = await supabase
        .from('journal_entries')
        .insert({
          user_id: userId,
          entry_number: entryNumber,
          entry_date: now.toISOString().split('T')[0],
          description: `Pago de nómina — ${periodName}`,
          reference_type: 'payroll',
          reference_id: periodId,
          fiscal_period_id: fiscalPeriod?.id ?? null,
          status: 'posted',
          total_debit: totalNomina,
          total_credit: totalNomina,
        })
        .select('id')
        .single()

      if (journalEntry?.id) {
        await supabase.from('journal_lines').insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: nominaAccount.id,
            debit: totalNomina,
            credit: 0,
            description: `Gasto de nómina — ${periodName}`,
            currency: currency ?? 'AED',
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: bankAccountData.chart_account_id,
            debit: 0,
            credit: totalNomina,
            description: `Pago desde ${account?.name ?? 'cuenta'} — ${periodName}`,
            currency: currency ?? 'AED',
          },
        ])
      }
    }

    setSaving(false)
    setShowPayModal(false)
    setPaymentAccountId('')
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
            <button onClick={() => { setShowPayModal(true); loadBankAccounts() }} style={{
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

      {/* Modal de confirmación de pago */}
      {showPayModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(11,42,74,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: 14, padding: '32px',
            width: '100%', maxWidth: 480,
            boxShadow: '0 24px 48px rgba(11,42,74,0.18)',
          }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3DD9D6', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
              Confirmar pago de nómina
            </div>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 600, color: '#0B2A4A', fontFamily: 'Geist, sans-serif' }}>
              ¿Desde qué cuenta se realiza el pago?
            </h2>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#5A5852', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Cuenta de pago *
              </label>
              {loadingAccounts ? (
                <div style={{ fontSize: 13, color: '#A8A6A0' }}>Cargando cuentas...</div>
              ) : (
                <select
                  value={paymentAccountId}
                  onChange={e => setPaymentAccountId(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: '#FFFFFF', border: '1.5px solid #F0EFEA',
                    borderRadius: 8, color: '#0B2A4A', fontSize: 14,
                    boxSizing: 'border-box' as const,
                  }}
                >
                  <option value="">Seleccionar cuenta...</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — {acc.currency} {acc.current_balance.toLocaleString('es', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ background: '#FAFAF7', borderRadius: 10, padding: '14px 16px', marginBottom: 24, border: '1px solid #F0EFEA' }}>
              <div style={{ fontSize: 11, color: '#5A5852', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'JetBrains Mono, monospace' }}>
                Asiento contable que se generará
              </div>
              <div style={{ fontSize: 13, color: '#0B2A4A', fontFamily: 'JetBrains Mono, monospace' }}>
                DEBE &nbsp; 5120 Nómina<br/>
                HABER &nbsp; Cuenta seleccionada
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowPayModal(false); setPaymentAccountId('') }}
                style={{
                  background: 'transparent', border: '1.5px solid #F0EFEA',
                  color: '#5A5852', borderRadius: 8, padding: '10px 20px',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleMarkPaid(paymentAccountId)}
                disabled={!paymentAccountId || saving}
                style={{
                  background: paymentAccountId ? '#F5B544' : '#F0EFEA',
                  color: paymentAccountId ? '#1A1A1A' : '#A8A6A0',
                  border: 'none', borderRadius: 8, padding: '10px 24px',
                  fontSize: 13, fontWeight: 600, cursor: paymentAccountId ? 'pointer' : 'not-allowed',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Procesando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}