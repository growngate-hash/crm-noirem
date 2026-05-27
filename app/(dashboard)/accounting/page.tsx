'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type AccountingTab = 'journal' | 'trial_balance' | 'income_statement' | 'vat_report' | 'chart_of_accounts'

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<AccountingTab>('journal')
  const [loading, setLoading] = useState(false)

  const [journalEntries, setJournalEntries] = useState<any[]>([])
  const [journalLines, setJournalLines] = useState<any[]>([])
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [trialBalance, setTrialBalance] = useState<any[]>([])
  const [incomeStatement, setIncomeStatement] = useState<any[]>([])
  const [vatReport, setVatReport] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])

  const [showManualEntry, setShowManualEntry] = useState(false)
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({
    code: '', name: '', type: 'expense',
    normal_balance: 'debit', parent_id: '', description: ''
  })
  const [savingAccount, setSavingAccount] = useState(false)

  const [manualEntry, setManualEntry] = useState({
    description: '',
    entry_date: new Date().toISOString().split('T')[0],
    lines: [
      { account_id: '', debit: '', credit: '', description: '' },
      { account_id: '', debit: '', credit: '', description: '' },
    ],
  })

  useEffect(() => { loadData() }, [activeTab])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()
    try {
      switch (activeTab) {
        case 'journal': {
          const { data } = await supabase
            .from('journal_entries')
            .select('*')
            .order('entry_date', { ascending: false })
            .limit(100)
          setJournalEntries(data ?? [])
          break
        }
        case 'trial_balance': {
          const { data } = await supabase.from('v_trial_balance').select('*')
          setTrialBalance(data ?? [])
          break
        }
        case 'income_statement': {
          const { data } = await supabase.from('v_income_statement').select('*')
          setIncomeStatement(data ?? [])
          break
        }
        case 'vat_report': {
          const { data } = await supabase.from('v_vat_report').select('*')
          setVatReport(data ?? [])
          break
        }
        case 'chart_of_accounts': {
          const { data } = await supabase.from('chart_of_accounts').select('*').order('code')
          setAccounts(data ?? [])
          break
        }
      }
    } catch { /* table may not exist yet */ }
    setLoading(false)
  }

  async function loadJournalLines(entryId: string) {
    const { data } = await createClient()
      .from('journal_lines')
      .select('*, account:account_id(code, name)')
      .eq('journal_entry_id', entryId)
    setJournalLines(data ?? [])
  }

  async function handleSaveManualEntry() {
    const totalDebit  = manualEntry.lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0)
    const totalCredit = manualEntry.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      alert(`El asiento no cuadra: Débitos (${totalDebit.toFixed(2)}) ≠ Créditos (${totalCredit.toFixed(2)})`)
      return
    }
    if (!manualEntry.description.trim()) { alert('Agrega una descripción'); return }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: period } = await supabase
      .from('fiscal_periods').select('id').eq('status', 'open').single()

    const { count } = await supabase
      .from('journal_entries').select('id', { count: 'exact', head: true })

    const entryNumber = `JE-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String((count || 0) + 1).padStart(4, '0')}`

    const { data: entry, error } = await supabase
      .from('journal_entries')
      .insert({
        user_id:         user?.id,
        entry_number:    entryNumber,
        entry_date:      manualEntry.entry_date,
        description:     manualEntry.description,
        reference_type:  'manual',
        fiscal_period_id: period?.id,
        status:          'posted',
        total_debit:     totalDebit,
        total_credit:    totalCredit,
      })
      .select()
      .single()

    if (error) { alert('Error: ' + error.message); return }

    for (const line of manualEntry.lines) {
      if (!line.account_id) continue
      await supabase.from('journal_lines').insert({
        journal_entry_id: entry.id,
        account_id:  line.account_id,
        debit:       parseFloat(line.debit)  || 0,
        credit:      parseFloat(line.credit) || 0,
        description: line.description,
        currency:    'AED',
      })
    }

    setShowManualEntry(false)
    setManualEntry({
      description: '',
      entry_date:  new Date().toISOString().split('T')[0],
      lines: [
        { account_id: '', debit: '', credit: '', description: '' },
        { account_id: '', debit: '', credit: '', description: '' },
      ],
    })
    loadData()
  }

  async function handleSaveAccount() {
    if (!newAccount.code.trim() || !newAccount.name.trim()) {
      alert('El código y nombre son obligatorios')
      return
    }
    const supabase = createClient()
    const { data: existing } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('code', newAccount.code.trim())
      .single()
    if (existing) { alert(`El código ${newAccount.code} ya existe`); return }

    setSavingAccount(true)
    const { data: { user } } = await supabase.auth.getUser()
    const normalBalance = ['asset', 'expense'].includes(newAccount.type) ? 'debit' : 'credit'
    const { error } = await supabase.from('chart_of_accounts').insert({
      user_id:        user?.id,
      code:           newAccount.code.trim(),
      name:           newAccount.name.trim(),
      type:           newAccount.type,
      normal_balance: normalBalance,
      parent_id:      newAccount.parent_id || null,
      description:    newAccount.description.trim(),
      is_active:      true,
    })
    if (error) { alert('Error: ' + error.message); setSavingAccount(false); return }

    const { data } = await supabase.from('chart_of_accounts').select('*').order('code')
    setAccounts(data ?? [])
    setShowNewAccount(false)
    setSavingAccount(false)
    setNewAccount({ code: '', name: '', type: 'expense', normal_balance: 'debit', parent_id: '', description: '' })
  }

  function typeColor(type: string) {
    const map: Record<string, string> = {
      asset: '#3b82f6', liability: '#ef4444', equity: '#8b5cf6',
      revenue: '#22c55e', expense: '#f59e0b', vat: '#06b6d4',
    }
    return map[type] || '#888'
  }

  const tabs = [
    { id: 'journal',           label: 'Libro Diario'         },
    { id: 'trial_balance',     label: 'Balance Comprobación' },
    { id: 'income_statement',  label: 'Estado Resultados'    },
    { id: 'vat_report',        label: 'Reporte VAT'          },
    { id: 'chart_of_accounts', label: 'Plan de Cuentas'      },
  ]

  const th: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', color: '#888', fontSize: 11,
    letterSpacing: '1px', fontWeight: 700, borderBottom: '1px solid #2a2a30',
  }
  const td: React.CSSProperties = { padding: '12px 14px', fontSize: 13 }

  return (
    <div style={{ padding: 24, maxWidth: 1200, fontFamily: 'Outfit, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#f0ede8', fontSize: 24, fontWeight: 800, margin: 0 }}>Contabilidad</h1>
          <p style={{ color: '#666', fontSize: 13, marginTop: 4, margin: '4px 0 0' }}>
            Módulo contable profesional — Double Entry · VAT 5% UAE
          </p>
        </div>
        <button
          onClick={async () => {
            const { data } = await createClient().from('chart_of_accounts').select('id,code,name').order('code')
            setAccounts(data ?? [])
            setShowManualEntry(true)
          }}
          style={{ padding: '10px 20px', background: '#c9a84c', color: '#0d0d0f', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
        >
          + Asiento Manual
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AccountingTab)}
            style={{
              padding: '8px 16px',
              background: activeTab === tab.id ? '#c9a84c' : '#1a1a1f',
              color:      activeTab === tab.id ? '#0d0d0f' : '#888',
              border:    `1px solid ${activeTab === tab.id ? '#c9a84c' : '#2a2a30'}`,
              borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>Cargando...</div>
      )}

      {/* ── LIBRO DIARIO ── */}
      {!loading && activeTab === 'journal' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#1a1a1f' }}>
                {['N° Asiento', 'Fecha', 'Descripción', 'Tipo', 'Débito', 'Crédito', 'Estado'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {journalEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#666', fontSize: 13 }}>
                    No hay asientos contables aún. Se generarán automáticamente al pagar facturas o registrar gastos.
                  </td>
                </tr>
              ) : journalEntries.map(entry => (
                <>
                  <tr
                    key={entry.id}
                    onClick={() => {
                      if (selectedEntry?.id === entry.id) { setSelectedEntry(null); setJournalLines([]) }
                      else { setSelectedEntry(entry); loadJournalLines(entry.id) }
                    }}
                    style={{ cursor: 'pointer', background: selectedEntry?.id === entry.id ? '#c9a84c15' : 'transparent', borderBottom: '1px solid #2a2a30' }}
                  >
                    <td style={{ ...td, color: '#c9a84c', fontWeight: 700 }}>{entry.entry_number}</td>
                    <td style={{ ...td, color: '#888' }}>{new Date(entry.entry_date + 'T00:00:00+04:00').toLocaleDateString('en-AE')}</td>
                    <td style={{ ...td, color: '#f0ede8' }}>{entry.description}</td>
                    <td style={td}>
                      <span style={{ background: '#2a2a30', borderRadius: 4, padding: '2px 8px', color: '#888', fontSize: 10, fontWeight: 700 }}>
                        {entry.reference_type?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#22c55e', fontWeight: 600 }}>AED {parseFloat(entry.total_debit || 0).toFixed(2)}</td>
                    <td style={{ ...td, color: '#ef4444', fontWeight: 600 }}>AED {parseFloat(entry.total_credit || 0).toFixed(2)}</td>
                    <td style={td}>
                      <span style={{
                        background: entry.status === 'posted' ? '#22c55e20' : '#f59e0b20',
                        border:    `1px solid ${entry.status === 'posted' ? '#22c55e40' : '#f59e0b40'}`,
                        color:      entry.status === 'posted' ? '#22c55e' : '#f59e0b',
                        borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700,
                      }}>
                        {entry.status === 'posted' ? 'CONTABILIZADO' : entry.status?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                  {selectedEntry?.id === entry.id && journalLines.length > 0 && (
                    <tr key={entry.id + '-lines'}>
                      <td colSpan={7} style={{ padding: 0, background: '#0d0d0f' }}>
                        <div style={{ padding: '16px 24px' }}>
                          <div style={{ color: '#c9a84c', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 10 }}>LÍNEAS DEL ASIENTO</div>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                {['Cuenta', 'Descripción', 'Débito', 'Crédito'].map(h => (
                                  <th key={h} style={{ padding: '6px 12px', textAlign: 'left', color: '#555', fontSize: 10, letterSpacing: '1px' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {journalLines.map(line => (
                                <tr key={line.id} style={{ borderTop: '1px solid #1a1a1f' }}>
                                  <td style={{ padding: '8px 12px', color: '#f0ede8', fontSize: 12 }}>
                                    <span style={{ color: '#c9a84c', marginRight: 6 }}>{line.account?.code}</span>{line.account?.name}
                                  </td>
                                  <td style={{ padding: '8px 12px', color: '#666', fontSize: 12 }}>{line.description || '—'}</td>
                                  <td style={{ padding: '8px 12px', color: '#22c55e', fontSize: 12, fontWeight: 600 }}>
                                    {line.debit > 0 ? `AED ${parseFloat(line.debit).toFixed(2)}` : '—'}
                                  </td>
                                  <td style={{ padding: '8px 12px', color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
                                    {line.credit > 0 ? `AED ${parseFloat(line.credit).toFixed(2)}` : '—'}
                                  </td>
                                </tr>
                              ))}
                              <tr style={{ borderTop: '2px solid #2a2a30' }}>
                                <td colSpan={2} style={{ padding: '8px 12px', color: '#888', fontSize: 11, fontWeight: 700 }}>TOTAL</td>
                                <td style={{ padding: '8px 12px', color: '#22c55e', fontSize: 12, fontWeight: 800 }}>
                                  AED {journalLines.reduce((s, l) => s + parseFloat(l.debit || 0), 0).toFixed(2)}
                                </td>
                                <td style={{ padding: '8px 12px', color: '#ef4444', fontSize: 12, fontWeight: 800 }}>
                                  AED {journalLines.reduce((s, l) => s + parseFloat(l.credit || 0), 0).toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── BALANCE DE COMPROBACIÓN ── */}
      {!loading && activeTab === 'trial_balance' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ background: '#1a1a1f' }}>
                {['Código', 'Cuenta', 'Tipo', 'Débitos', 'Créditos', 'Saldo'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trialBalance.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#666', fontSize: 13 }}>No hay datos en el balance de comprobación aún.</td></tr>
              ) : trialBalance.filter(a => parseFloat(a.total_debit) > 0 || parseFloat(a.total_credit) > 0).map(account => (
                <tr key={account.code} style={{ borderBottom: '1px solid #1a1a1f' }}>
                  <td style={{ ...td, color: '#c9a84c', fontWeight: 700 }}>{account.code}</td>
                  <td style={{ ...td, color: '#f0ede8' }}>{account.name}</td>
                  <td style={td}>
                    <span style={{ background: typeColor(account.type) + '20', border: `1px solid ${typeColor(account.type)}40`, color: typeColor(account.type), borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                      {account.type?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ ...td, color: '#22c55e' }}>{parseFloat(account.total_debit) > 0 ? `AED ${parseFloat(account.total_debit).toFixed(2)}` : '—'}</td>
                  <td style={{ ...td, color: '#ef4444' }}>{parseFloat(account.total_credit) > 0 ? `AED ${parseFloat(account.total_credit).toFixed(2)}` : '—'}</td>
                  <td style={{ ...td, color: parseFloat(account.balance) >= 0 ? '#f0ede8' : '#ef4444', fontWeight: 700 }}>
                    AED {parseFloat(account.balance || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#1a1a1f', borderTop: '2px solid #2a2a30' }}>
                <td colSpan={3} style={{ ...td, color: '#f0ede8', fontWeight: 800 }}>TOTALES</td>
                <td style={{ ...td, color: '#22c55e', fontWeight: 800 }}>AED {trialBalance.reduce((s, a) => s + parseFloat(a.total_debit || 0), 0).toFixed(2)}</td>
                <td style={{ ...td, color: '#ef4444', fontWeight: 800 }}>AED {trialBalance.reduce((s, a) => s + parseFloat(a.total_credit || 0), 0).toFixed(2)}</td>
                <td style={{ ...td, color: '#c9a84c', fontWeight: 800 }}>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── ESTADO DE RESULTADOS ── */}
      {!loading && activeTab === 'income_statement' && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ color: '#22c55e', fontSize: 12, fontWeight: 700, letterSpacing: '2px', marginBottom: 12 }}>INGRESOS</div>
            {incomeStatement.filter(a => a.type === 'revenue').length === 0
              ? <div style={{ color: '#555', fontSize: 13 }}>Sin datos de ingresos aún.</div>
              : incomeStatement.filter(a => a.type === 'revenue').map(a => (
                <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #2a2a30' }}>
                  <span style={{ color: '#f0ede8', fontSize: 13 }}>{a.code} — {a.name}</span>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>AED {parseFloat(a.amount || 0).toFixed(2)}</span>
                </div>
              ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 4 }}>
              <span style={{ color: '#f0ede8', fontWeight: 800 }}>Total Ingresos</span>
              <span style={{ color: '#22c55e', fontWeight: 800, fontSize: 16 }}>
                AED {incomeStatement.filter(a => a.type === 'revenue').reduce((s, a) => s + parseFloat(a.amount || 0), 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 700, letterSpacing: '2px', marginBottom: 12 }}>GASTOS</div>
            {incomeStatement.filter(a => a.type === 'expense').length === 0
              ? <div style={{ color: '#555', fontSize: 13 }}>Sin datos de gastos aún.</div>
              : incomeStatement.filter(a => a.type === 'expense').map(a => (
                <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #2a2a30' }}>
                  <span style={{ color: '#f0ede8', fontSize: 13 }}>{a.code} — {a.name}</span>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>AED {parseFloat(a.amount || 0).toFixed(2)}</span>
                </div>
              ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 4 }}>
              <span style={{ color: '#f0ede8', fontWeight: 800 }}>Total Gastos</span>
              <span style={{ color: '#ef4444', fontWeight: 800, fontSize: 16 }}>
                AED {incomeStatement.filter(a => a.type === 'expense').reduce((s, a) => s + parseFloat(a.amount || 0), 0).toFixed(2)}
              </span>
            </div>
          </div>

          {(() => {
            const ingresos = incomeStatement.filter(a => a.type === 'revenue').reduce((s, a) => s + parseFloat(a.amount || 0), 0)
            const gastos   = incomeStatement.filter(a => a.type === 'expense').reduce((s, a) => s + parseFloat(a.amount || 0), 0)
            const utilidad = ingresos - gastos
            return (
              <div style={{ background: utilidad >= 0 ? '#22c55e15' : '#ef444415', border: `2px solid ${utilidad >= 0 ? '#22c55e40' : '#ef444440'}`, borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f0ede8', fontWeight: 800, fontSize: 16 }}>
                  {utilidad >= 0 ? 'UTILIDAD NETA' : 'PÉRDIDA NETA'}
                </span>
                <span style={{ color: utilidad >= 0 ? '#22c55e' : '#ef4444', fontWeight: 900, fontSize: 24 }}>
                  AED {Math.abs(utilidad).toFixed(2)}
                </span>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── REPORTE VAT ── */}
      {!loading && activeTab === 'vat_report' && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ background: '#1a1a1f', border: '1px solid #06b6d420', borderRadius: 12, padding: 20 }}>
            <div style={{ color: '#06b6d4', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 16 }}>REPORTE VAT — UAE FTA</div>
            {vatReport.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#666', fontSize: 13 }}>No hay transacciones con VAT registradas aún.</div>
            ) : vatReport.map(row => (
              <div key={row.period} style={{ marginBottom: 16, padding: 16, background: '#0d0d0f', borderRadius: 8 }}>
                <div style={{ color: '#f0ede8', fontWeight: 700, marginBottom: 12 }}>
                  {new Date(row.period + '-01T00:00:00+04:00').toLocaleDateString('en-AE', { month: 'long', year: 'numeric' })}
                </div>
                {[
                  { label: 'Ventas gravables',  value: row.taxable_sales,  color: '#22c55e' },
                  { label: 'VAT cobrado (5%)',   value: row.vat_collected,  color: '#06b6d4' },
                  { label: 'VAT pagado',         value: row.vat_paid,       color: '#f59e0b' },
                  { label: 'VAT a pagar FTA',    value: row.vat_payable,    color: '#ef4444' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1f' }}>
                    <span style={{ color: '#888', fontSize: 13 }}>{item.label}</span>
                    <span style={{ color: item.color, fontWeight: 700 }}>AED {parseFloat(item.value || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PLAN DE CUENTAS ── */}
      {!loading && activeTab === 'chart_of_accounts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ color: '#f0ede8', fontSize: 16, fontWeight: 800 }}>Plan de Cuentas</div>
              <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{accounts.length} cuentas activas</div>
            </div>
            <button
              onClick={() => setShowNewAccount(true)}
              style={{ padding: '10px 20px', background: '#c9a84c', color: '#0d0d0f', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
            >
              + NUEVA CUENTA
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#1a1a1f' }}>
                  {['Código', 'Nombre', 'Tipo', 'Saldo Normal', 'Activa'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#666', fontSize: 13 }}>No hay cuentas en el plan contable.</td></tr>
                ) : accounts.map(account => (
                  <tr key={account.id} style={{ borderBottom: '1px solid #1a1a1f' }}>
                    <td style={{ ...td, color: '#c9a84c', fontWeight: 700 }}>{account.code}</td>
                    <td style={{
                      ...td, color: '#f0ede8',
                      paddingLeft: account.code?.length > 3 ? `${(account.code.length - 3) * 12 + 14}px` : 14,
                    }}>
                      {account.name}
                    </td>
                    <td style={td}>
                      <span style={{ background: typeColor(account.type) + '20', border: `1px solid ${typeColor(account.type)}40`, color: typeColor(account.type), borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                        {account.type?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#888' }}>{account.normal_balance === 'debit' ? '← Débito' : 'Crédito →'}</td>
                    <td style={{ ...td, color: account.is_active ? '#22c55e' : '#ef4444', fontSize: 16 }}>
                      {account.is_active ? '✓' : '✗'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL NUEVA CUENTA ── */}
      {showNewAccount && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ color: '#c9a84c', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 6 }}>PLAN DE CUENTAS</div>
            <div style={{ color: '#f0ede8', fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Nueva Cuenta Contable</div>

            {/* Código y Nombre */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>CÓDIGO *</div>
                <input
                  value={newAccount.code}
                  onChange={e => setNewAccount(p => ({ ...p, code: e.target.value }))}
                  placeholder="ej. 5211"
                  style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#f0ede8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ color: '#555', fontSize: 10, marginTop: 4 }}>5210 = cuenta · 5211 = subcuenta</div>
              </div>
              <div>
                <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>NOMBRE *</div>
                <input
                  value={newAccount.name}
                  onChange={e => setNewAccount(p => ({ ...p, name: e.target.value }))}
                  placeholder="ej. Combustible Vehículos"
                  style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#f0ede8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Tipo de cuenta */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8 }}>TIPO DE CUENTA *</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { value: 'asset',     label: 'Activo',     color: '#3b82f6' },
                  { value: 'liability', label: 'Pasivo',     color: '#ef4444' },
                  { value: 'equity',    label: 'Patrimonio', color: '#8b5cf6' },
                  { value: 'revenue',   label: 'Ingreso',    color: '#22c55e' },
                  { value: 'expense',   label: 'Gasto',      color: '#f59e0b' },
                  { value: 'vat',       label: 'VAT/IVA',    color: '#06b6d4' },
                ].map(type => (
                  <button
                    key={type.value}
                    onClick={() => setNewAccount(p => ({
                      ...p, type: type.value,
                      normal_balance: ['asset', 'expense'].includes(type.value) ? 'debit' : 'credit'
                    }))}
                    style={{
                      padding: 10,
                      background: newAccount.type === type.value ? type.color + '25' : '#0d0d0f',
                      border: `2px solid ${newAccount.type === type.value ? type.color : '#2a2a30'}`,
                      borderRadius: 8,
                      color: newAccount.type === type.value ? type.color : '#666',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <div style={{ color: '#555', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                Saldo normal: <span style={{ color: '#c9a84c', fontWeight: 700 }}>
                  {['asset', 'expense'].includes(newAccount.type) ? 'Débito' : 'Crédito'}
                </span>
              </div>
            </div>

            {/* Cuenta padre */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>
                CUENTA PADRE <span style={{ color: '#555', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(si es subcuenta)</span>
              </div>
              <select
                value={newAccount.parent_id}
                onChange={e => setNewAccount(p => ({ ...p, parent_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: newAccount.parent_id ? '#f0ede8' : '#666', fontSize: 13, outline: 'none' }}
              >
                <option value="">— Es cuenta principal</option>
                {accounts.filter(a => a.type === newAccount.type).map(a => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
              <div style={{ color: '#555', fontSize: 10, marginTop: 4 }}>Solo muestra cuentas del mismo tipo</div>
            </div>

            {/* Descripción */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>
                DESCRIPCIÓN <span style={{ color: '#555', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
              </div>
              <input
                value={newAccount.description}
                onChange={e => setNewAccount(p => ({ ...p, description: e.target.value }))}
                placeholder="ej. Gasolina y mantenimiento vehículos"
                style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#f0ede8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Preview */}
            {newAccount.code && newAccount.name && (
              <div style={{ background: '#0d0d0f', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#c9a84c', fontWeight: 700, fontFamily: 'monospace' }}>{newAccount.code}</span>
                <span style={{ color: '#f0ede8', fontSize: 13 }}>{newAccount.name}</span>
                <span style={{ background: typeColor(newAccount.type) + '20', border: `1px solid ${typeColor(newAccount.type)}40`, borderRadius: 4, padding: '2px 8px', color: typeColor(newAccount.type), fontSize: 10, fontWeight: 700 }}>
                  {newAccount.type.toUpperCase()}
                </span>
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setShowNewAccount(false)
                  setNewAccount({ code: '', name: '', type: 'expense', normal_balance: 'debit', parent_id: '', description: '' })
                }}
                style={{ flex: 1, padding: 13, background: 'transparent', border: '1px solid #2a2a30', borderRadius: 10, color: '#888', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                CANCELAR
              </button>
              <button
                onClick={handleSaveAccount}
                disabled={savingAccount || !newAccount.code || !newAccount.name}
                style={{ flex: 2, padding: 13, background: '#c9a84c', color: '#0d0d0f', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: savingAccount || !newAccount.code || !newAccount.name ? 0.6 : 1 }}
              >
                {savingAccount ? 'GUARDANDO...' : 'CREAR CUENTA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ASIENTO MANUAL ── */}
      {showManualEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 16, padding: 32, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ color: '#c9a84c', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 8 }}>ASIENTO CONTABLE MANUAL</div>
            <div style={{ color: '#f0ede8', fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Nuevo Asiento</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>DESCRIPCIÓN *</div>
                <input
                  value={manualEntry.description}
                  onChange={e => setManualEntry(p => ({ ...p, description: e.target.value }))}
                  placeholder="ej. Ajuste de inventario"
                  style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#f0ede8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>FECHA *</div>
                <input
                  type="date"
                  value={manualEntry.entry_date}
                  onChange={e => setManualEntry(p => ({ ...p, entry_date: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#f0ede8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 10 }}>LÍNEAS DEL ASIENTO</div>
            <div style={{ background: '#0d0d0f', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1a1a1f' }}>
                    {['Cuenta', 'Descripción', 'Débito AED', 'Crédito AED', ''].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#555', fontSize: 10, letterSpacing: '1px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {manualEntry.lines.map((line, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #1a1a1f' }}>
                      <td style={{ padding: '6px 8px' }}>
                        <select
                          value={line.account_id}
                          onChange={e => {
                            const lines = [...manualEntry.lines]
                            lines[i] = { ...lines[i], account_id: e.target.value }
                            setManualEntry(p => ({ ...p, lines }))
                          }}
                          style={{ width: '100%', padding: '6px 8px', background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 6, color: '#f0ede8', fontSize: 12, outline: 'none' }}
                        >
                          <option value="">Seleccionar cuenta</option>
                          {accounts.map(a => (
                            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          value={line.description}
                          onChange={e => {
                            const lines = [...manualEntry.lines]
                            lines[i] = { ...lines[i], description: e.target.value }
                            setManualEntry(p => ({ ...p, lines }))
                          }}
                          placeholder="Opcional"
                          style={{ width: '100%', padding: '6px 8px', background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 6, color: '#f0ede8', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="number" min="0" step="0.01"
                          value={line.debit}
                          onChange={e => {
                            const lines = [...manualEntry.lines]
                            lines[i] = { ...lines[i], debit: e.target.value, credit: '' }
                            setManualEntry(p => ({ ...p, lines }))
                          }}
                          placeholder="0.00"
                          style={{ width: 80, padding: '6px 8px', background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 6, color: '#22c55e', fontSize: 12, outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="number" min="0" step="0.01"
                          value={line.credit}
                          onChange={e => {
                            const lines = [...manualEntry.lines]
                            lines[i] = { ...lines[i], credit: e.target.value, debit: '' }
                            setManualEntry(p => ({ ...p, lines }))
                          }}
                          placeholder="0.00"
                          style={{ width: 80, padding: '6px 8px', background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 6, color: '#ef4444', fontSize: 12, outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        {manualEntry.lines.length > 2 && (
                          <button
                            onClick={() => setManualEntry(p => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }))}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}
                          >✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setManualEntry(p => ({ ...p, lines: [...p.lines, { account_id: '', debit: '', credit: '', description: '' }] }))}
              style={{ background: 'transparent', border: '1px dashed #2a2a30', borderRadius: 8, color: '#888', padding: '8px 16px', fontSize: 12, cursor: 'pointer', marginBottom: 20, width: '100%' }}
            >
              + Agregar línea
            </button>

            {(() => {
              const totalD = manualEntry.lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0)
              const totalC = manualEntry.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
              const balanced = Math.abs(totalD - totalC) < 0.01
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', marginBottom: 20, background: balanced ? '#22c55e15' : '#ef444415', border: `1px solid ${balanced ? '#22c55e40' : '#ef444440'}`, borderRadius: 8 }}>
                  <span style={{ color: '#888', fontSize: 12 }}>
                    Débitos: <strong style={{ color: '#22c55e' }}>AED {totalD.toFixed(2)}</strong>
                    &nbsp;&nbsp;Créditos: <strong style={{ color: '#ef4444' }}>AED {totalC.toFixed(2)}</strong>
                  </span>
                  <span style={{ color: balanced ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 12 }}>
                    {balanced ? '✓ Cuadrado' : `Diferencia: AED ${Math.abs(totalD - totalC).toFixed(2)}`}
                  </span>
                </div>
              )
            })()}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowManualEntry(false)}
                style={{ flex: 1, padding: 13, background: 'transparent', border: '1px solid #2a2a30', borderRadius: 10, color: '#888', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                CANCELAR
              </button>
              <button
                onClick={handleSaveManualEntry}
                style={{ flex: 2, padding: 13, background: '#c9a84c', border: 'none', borderRadius: 10, color: '#0d0d0f', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
              >
                CONTABILIZAR ASIENTO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
