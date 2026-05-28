'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Attendance, AttendanceStatus } from '@/types'
import { useTimezone } from '@/hooks/useTimezone'
import { CheckCircle, XCircle, Clock, Calendar, Plus } from 'lucide-react'

const STATUS_CONFIG: Record<AttendanceStatus, { label: string, bg: string, color: string, icon: React.ReactNode }> = {
  present:    { label: 'Presente',  bg: '#E6F5EC', color: '#1F8F5C', icon: <CheckCircle size={14} /> },
  absent:     { label: 'Ausente',   bg: '#FBE7E2', color: '#D9533D', icon: <XCircle size={14} /> },
  late:       { label: 'Tardanza',  bg: '#FDF4DE', color: '#F5B544', icon: <Clock size={14} /> },
  holiday:    { label: 'Festivo',   bg: '#E6F0FA', color: '#1F5A9B', icon: <Calendar size={14} /> },
  permission: { label: 'Permiso',   bg: '#ECE6FA', color: '#7B61D9', icon: <Calendar size={14} /> },
}

interface Props {
  employeeId: string
  userId: string
}

export default function EmployeeAttendance({ employeeId, userId }: Props) {
  const supabase = createClient()
  const tz = useTimezone()

  const [records, setRecords] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    date: tz.getToday().toISOString().split('T')[0],
    status: 'present' as AttendanceStatus,
    check_in: '',
    check_out: '',
    notes: '',
  })

  useEffect(() => {
    fetchAttendance()
  }, [employeeId])

  async function fetchAttendance() {
    setLoading(true)
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false })
      .limit(30)
    setRecords(data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    const { error } = await supabase
      .from('attendance')
      .upsert({
        user_id: userId,
        employee_id: employeeId,
        date: form.date,
        status: form.status,
        check_in: form.check_in || null,
        check_out: form.check_out || null,
        notes: form.notes.trim() || null,
      }, { onConflict: 'employee_id,date' })

    if (!error) {
      setAdding(false)
      setForm({ date: tz.getToday().toISOString().split('T')[0], status: 'present', check_in: '', check_out: '', notes: '' })
      fetchAttendance()
    }
  }

  const INPUT = {
    background: '#FFFFFF', border: '1.5px solid #F0EFEA',
    borderRadius: 8, padding: '9px 12px',
    color: '#0B2A4A', fontSize: 13, width: '100%',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #F0EFEA',
      borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(11,42,74,0.06)',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 28px', borderBottom: '1px solid #F0EFEA',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3DD9D6', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Asistencia — últimos 30 registros
        </div>
        <button
          onClick={() => setAdding(!adding)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#F5B544', color: '#1A1A1A',
            border: 'none', borderRadius: 7, padding: '8px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Registrar
        </button>
      </div>

      {/* Formulario de registro */}
      {adding && (
        <form onSubmit={handleSubmit} style={{
          padding: '20px 28px', borderBottom: '1px solid #F0EFEA',
          background: '#FAFAF7',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12,
          alignItems: 'end',
        }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5A5852', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha</label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={INPUT} required />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5A5852', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as AttendanceStatus }))} style={INPUT}>
              <option value="present">Presente</option>
              <option value="absent">Ausente</option>
              <option value="late">Tardanza</option>
              <option value="holiday">Festivo</option>
              <option value="permission">Permiso</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5A5852', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Entrada</label>
            <input type="time" value={form.check_in} onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))} style={INPUT} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5A5852', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Salida</label>
            <input type="time" value={form.check_out} onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))} style={INPUT} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setAdding(false)} style={{
              background: 'transparent', border: '1.5px solid #F0EFEA',
              color: '#5A5852', borderRadius: 7, padding: '8px 16px',
              fontSize: 13, cursor: 'pointer',
            }}>
              Cancelar
            </button>
            <button type="submit" style={{
              background: '#F5B544', color: '#1A1A1A', border: 'none',
              borderRadius: 7, padding: '8px 20px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Guardar
            </button>
          </div>
        </form>
      )}

      {/* Lista de registros */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: '#A8A6A0' }}>Cargando...</div>
      ) : records.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', fontSize: 13, color: '#A8A6A0' }}>
          No hay registros de asistencia todavía.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F0EFEA' }}>
              {['Fecha', 'Estado', 'Entrada', 'Salida', 'Notas'].map(h => (
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
            {records.map((r, i) => {
              const sc = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.present
              return (
                <tr key={r.id} style={{ borderBottom: i < records.length - 1 ? '1px solid #F0EFEA' : 'none' }}>
                  <td style={{ padding: '12px 28px', fontSize: 13, color: '#0B2A4A', fontFamily: 'JetBrains Mono, monospace' }}>
                    {new Date(r.date + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </td>
                  <td style={{ padding: '12px 28px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: sc.bg, color: sc.color,
                      padding: '3px 10px', borderRadius: 100,
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {sc.icon} {sc.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 28px', fontSize: 13, color: '#5A5852', fontFamily: 'JetBrains Mono, monospace' }}>
                    {r.check_in ?? '—'}
                  </td>
                  <td style={{ padding: '12px 28px', fontSize: 13, color: '#5A5852', fontFamily: 'JetBrains Mono, monospace' }}>
                    {r.check_out ?? '—'}
                  </td>
                  <td style={{ padding: '12px 28px', fontSize: 13, color: '#5A5852' }}>
                    {r.notes ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}