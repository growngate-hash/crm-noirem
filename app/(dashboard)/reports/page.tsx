'use client'
import { useState, useEffect, useRef } from 'react'
import { DollarSign, BarChart2, FileText, BookOpen, Receipt, Package, Database, Star, ChevronLeft, Download, FileSpreadsheet, Mail, MessageSquare } from 'lucide-react'

// ─── report catalogue ─────────────────────────────────────────────────────────
type Report = { name: string; desc: string }
type Category = {
  id: string
  label: string
  icon: React.ReactNode
  iconBg: string
  count: number
  badge?: string
  dim?: boolean
  reports: Report[]
}

const CATEGORIES: Category[] = [
  {
    id: 'ventas',
    label: 'Ventas',
    icon: <DollarSign size={18} />,
    iconBg: 'rgba(52,211,153,0.15)',
    count: 5,
    reports: [
      { name: 'Resumen de Ventas Mensual',   desc: 'Ingresos totales, ticket promedio y tendencias del mes' },
      { name: 'Análisis por Servicio',        desc: 'Ingresos y unidades vendidas por tipo de servicio' },
      { name: 'Ventas por Técnico',           desc: 'Productividad y facturación por técnico asignado' },
      { name: 'Tendencia 12 Meses',           desc: 'Evolución de ventas en el último año' },
      { name: 'Comparativo de Periodos',      desc: 'Contraste mes actual vs. mes anterior' },
    ],
  },
  {
    id: 'administrativos',
    label: 'Administrativos',
    icon: <BarChart2 size={18} />,
    iconBg: 'rgba(0,212,170,0.15)',
    count: 7,
    reports: [
      { name: 'Agenda del Día',              desc: 'Reservas y trabajos programados para hoy' },
      { name: 'Ocupación de Vehículos',      desc: 'Horas activas vs. disponibles por unidad' },
      { name: 'Registro de Reservas',         desc: 'Listado completo de bookings con filtros avanzados' },
      { name: 'Desempeño de Técnicos',        desc: 'KPIs individuales por técnico del equipo' },
      { name: 'Clientes Frecuentes',          desc: 'Ranking por visitas y facturación acumulada' },
      { name: 'Tiempos de Servicio',          desc: 'Duración promedio por tipo de trabajo' },
      { name: 'Capacidad Operativa',          desc: 'Ratio de ocupación de flota y equipos' },
    ],
  },
  {
    id: 'financieros',
    label: 'Financieros',
    icon: <FileText size={18} />,
    iconBg: 'rgba(251,146,60,0.15)',
    count: 1,
    reports: [
      { name: 'Estado de Resultados',        desc: 'P&L mensual con ingresos, costos y margen neto' },
    ],
  },
  {
    id: 'contables',
    label: 'Contables',
    icon: <BookOpen size={18} />,
    iconBg: 'rgba(251,146,60,0.15)',
    count: 4,
    badge: '¡Nuevo!',
    reports: [
      { name: 'Balance General',             desc: 'Activos, pasivos y patrimonio a la fecha' },
      { name: 'Libro Diario',                desc: 'Registro cronológico de transacciones contables' },
      { name: 'Libro Mayor',                 desc: 'Saldos por cuenta del plan de cuentas IFRS' },
      { name: 'Conciliación Bancaria',       desc: 'Diferencias entre bancos y contabilidad' },
    ],
  },
  {
    id: 'fiscales',
    label: 'Fiscales',
    icon: <Receipt size={18} />,
    iconBg: 'rgba(255,79,79,0.15)',
    count: 4,
    reports: [
      { name: 'Declaración IVA — UAE VAT',   desc: 'Reporte periódico para presentación ante la FTA' },
      { name: 'Gastos Deducibles',           desc: 'Listado de gastos aplicables a declaración fiscal' },
      { name: 'Retenciones en la Fuente',    desc: 'Impuestos retenidos a proveedores y terceros' },
      { name: 'Impuestos por Pagar',         desc: 'Obligaciones fiscales vigentes y fechas límite' },
    ],
  },
  {
    id: 'trabajar',
    label: 'Para trabajar',
    icon: <Package size={18} />,
    iconBg: 'rgba(167,139,250,0.15)',
    count: 3,
    reports: [
      { name: 'Órdenes de Trabajo del Día',  desc: 'Servicios asignados con técnico y dirección del cliente' },
      { name: 'Lista de Materiales',         desc: 'Inventario necesario para los trabajos del día' },
      { name: 'Ruta de Vehículos',           desc: 'Recorridos y asignaciones geográficas programadas' },
    ],
  },
  {
    id: 'exogena',
    label: 'Información exógena',
    icon: <Database size={18} />,
    iconBg: 'rgba(99,102,241,0.15)',
    count: 8,
    reports: [
      { name: 'Reporte de Clientes Nuevos',  desc: 'Datos de contacto y primera transacción en el período' },
      { name: 'Información de Proveedores',  desc: 'ID fiscal, pagos realizados y saldos pendientes' },
      { name: 'Pagos Realizados',            desc: 'Egresos por tercero durante el período seleccionado' },
      { name: 'Ingresos Brutos por Tercero', desc: 'Clientes con facturación superior al umbral legal' },
      { name: 'Retenciones Practicadas',     desc: 'Impuestos retenidos a clientes durante el período' },
      { name: 'Saldos por Cobrar',           desc: 'Cartera vigente y vencida por cliente' },
      { name: 'Saldos por Pagar',            desc: 'Cuentas pendientes con proveedores y acreedores' },
      { name: 'Operaciones en Efectivo',     desc: 'Transacciones de caja superiores al mínimo legal' },
    ],
  },
  {
    id: 'favoritos',
    label: 'Favoritos',
    icon: <Star size={18} />,
    iconBg: '#1a1a1e',
    count: 0,
    dim: true,
    reports: [],
  },
]

const ICON_COLOR: Record<string, string> = {
  ventas:            '#34d399',
  administrativos:   '#00d4aa',
  financieros:       '#fb923c',
  contables:         '#fb923c',
  fiscales:          '#ff4f4f',
  trabajar:          '#a78bfa',
  exogena:           '#6366f1',
  favoritos:         '#888580',
}

const EXPORT_OPTIONS = [
  { label: 'PDF',       icon: <Download size={13}/> },
  { label: 'Excel/CSV', icon: <FileSpreadsheet size={13}/> },
  { label: 'Email',     icon: <Mail size={13}/> },
  { label: 'WhatsApp',  icon: <MessageSquare size={13}/> },
]

// ─── category card ─────────────────────────────────────────────────────────────
function CategoryCard({ cat, active, onClick }: { cat: Category; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  const color = ICON_COLOR[cat.id]

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        background: hov || active ? '#1a1a1e' : '#141416',
        border: `1px solid ${active ? 'rgba(201,168,76,0.4)' : hov ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 12,
        padding: 20,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: hov && !active ? 'translateY(-2px)' : 'none',
        opacity: cat.dim ? 0.55 : 1,
      }}
    >
      {/* badge */}
      {cat.badge && (
        <span style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(167,139,250,0.2)', color: '#a78bfa',
          borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '2px 8px',
        }}>
          {cat.badge}
        </span>
      )}

      {/* active indicator */}
      {active && (
        <span style={{
          position: 'absolute', top: 10, right: cat.badge ? 80 : 10,
          width: 6, height: 6, borderRadius: '50%', background: '#c9a84c',
        }}/>
      )}

      {/* icon */}
      <div style={{
        width: 42, height: 42, borderRadius: '50%', background: cat.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, marginBottom: 14,
      }}>
        {cat.icon}
      </div>

      {/* text */}
      <div style={{ fontSize: 16, fontWeight: 700, color: '#f0ede8', marginBottom: 4 }}>{cat.label}</div>
      <div style={{ fontSize: 12, color: '#888580' }}>
        {cat.count === 0 ? 'Sin reportes guardados' : `${cat.count} ${cat.count === 1 ? 'reporte' : 'reportes'}`}
      </div>
    </div>
  )
}

// ─── report row in expand panel ────────────────────────────────────────────────
function ReportRow({ report, color }: { report: Report; color: string }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: hov ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.12s',
      }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f0ede8', marginBottom: 2 }}>{report.name}</div>
        <div style={{ fontSize: 11, color: '#888580', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.desc}</div>
      </div>
      <button
        style={{
          padding: '6px 14px', borderRadius: 7, border: `1px solid ${hov ? color : 'rgba(255,255,255,0.08)'}`,
          background: hov ? `${color}18` : 'transparent',
          color: hov ? color : '#888580',
          fontSize: 11, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer',
          whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0,
        }}>
        Generar ↗
      </button>
    </div>
  )
}

// ─── page ──────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [showExport, setShowExport] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const activeCat = CATEGORIES.find(c => c.id === selected)

  function toggle(id: string) { setSelected(prev => prev === id ? null : id) }

  return (
    <div style={{ padding: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f0ede8' }}>Reportes</div>
          <div style={{ fontSize: 13, color: '#888580', marginTop: 4 }}>
            Genera, descarga y comparte reportes del negocio
          </div>
        </div>

        {/* export button + dropdown */}
        <div ref={exportRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowExport(p => !p)}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#c9a84c', color: '#0d0d0f', fontSize: 13, fontWeight: 700,
              fontFamily: 'Outfit,sans-serif', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <Download size={14}/> Exportar <span style={{ fontSize: 10 }}>▾</span>
          </button>

          {showExport && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 400,
              background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, overflow: 'hidden', minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              {EXPORT_OPTIONS.map(opt => (
                <ExportRow key={opt.label} label={opt.label} icon={opt.icon} onClick={() => setShowExport(false)}/>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 4×2 grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: selected ? 16 : 0 }}>
        {CATEGORIES.map(cat => (
          <CategoryCard key={cat.id} cat={cat} active={selected === cat.id} onClick={() => toggle(cat.id)}/>
        ))}
      </div>

      {/* ── expanded report panel ── */}
      {activeCat && (
        <div style={{
          background: '#141416', border: `1px solid ${ICON_COLOR[activeCat.id]}28`,
          borderTop: `2px solid ${ICON_COLOR[activeCat.id]}`,
          borderRadius: '0 0 12px 12px', overflow: 'hidden',
          animation: 'slideDown 0.18s ease',
        }}>
          {/* panel header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setSelected(null)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888580', fontSize: 12, fontFamily: 'Outfit,sans-serif', padding: 0 }}>
                <ChevronLeft size={14}/> Volver
              </button>
              <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }}/>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#f0ede8' }}>{activeCat.label}</span>
              <span style={{ fontSize: 11, color: '#888580', background: 'rgba(255,255,255,0.06)', borderRadius: 99, padding: '2px 8px' }}>
                {activeCat.count} reporte{activeCat.count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* report list */}
          {activeCat.reports.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>⭐</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#3a3836', marginBottom: 6 }}>Sin reportes favoritos</div>
              <div style={{ fontSize: 12, color: '#3a3836' }}>Marca reportes como favoritos para acceder rápido desde aquí</div>
            </div>
          ) : (
            activeCat.reports.map((r, i) => (
              <ReportRow key={i} report={r} color={ICON_COLOR[activeCat.id]}/>
            ))
          )}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function ExportRow({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', cursor: 'pointer',
        background: hov ? 'rgba(201,168,76,0.08)' : 'transparent',
        color: hov ? '#c9a84c' : '#f0ede8', fontSize: 13, fontFamily: 'Outfit,sans-serif',
        transition: 'background 0.1s',
      }}>
      <span style={{ color: hov ? '#c9a84c' : '#888580' }}>{icon}</span>
      {label}
    </div>
  )
}
