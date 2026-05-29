'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'
import { DollarSign, BarChart2, FileText, BookOpen, Receipt, Package, Database, Star, ChevronLeft, Download, FileSpreadsheet, Mail, MessageSquare, X, Star as StarFilled } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

// ─── types ────────────────────────────────────────────────────────────────────
type Report     = { name: string; desc: string }
type RichReport = { icon: string; name: string; desc: string; tags: string[]; previewId: string }
type Toast      = { id: number; msg: string; type: 'success'|'warn'|'error' }
type Category   = {
  id: string; label: string; icon: React.ReactNode; iconBg: string; count: number
  badge?: string; dim?: boolean; reports: Report[]; richReports?: RichReport[]
}

let _tid = 0
const aed = (v: number) => `AED ${(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ─── catalogue ────────────────────────────────────────────────────────────────
const CATEGORIES: Category[] = [
  {
    id: 'ventas', label: 'Ventas', icon: <DollarSign size={18}/>, iconBg: 'rgba(26,107,64,0.10)', count: 6,
    reports: [],
    richReports: [
      { icon: '📊', name: 'Reporte de Ventas por Período', previewId: 'ventas-periodo',
        desc: 'Resumen de ventas diarias, semanales o mensuales con comparativo vs período anterior.',
        tags: ['Diario', 'Semanal', 'Mensual'] },
      { icon: '🔧', name: 'Ventas por Servicio', previewId: 'ventas-servicio',
        desc: 'Ranking de servicios más vendidos con ingresos, unidades y ticket promedio.',
        tags: ['Ranking', 'Servicios'] },
      { icon: '👤', name: 'Ventas por Cliente (Top 10)', previewId: 'ventas-top10',
        desc: 'Top 10 clientes por volumen de compra, frecuencia de visita y valor de vida del cliente.',
        tags: ['Top 10', 'CLV'] },
      { icon: '📋', name: 'Ventas por Cliente', previewId: 'ventas-clientes',
        desc: 'Historial completo de compras por cliente con totales, servicios y frecuencia.',
        tags: ['Clientes', 'Historial'] },
      { icon: '💹', name: 'Rentabilidad por Servicio', previewId: 'rentabilidad',
        desc: 'Margen de ganancia por servicio descontando materiales, mano de obra y costos indirectos. Identifica los servicios más rentables.',
        tags: ['Margen', 'Rentabilidad', 'IFRS'] },
      { icon: '💰', name: 'Comisiones y Bonificaciones', previewId: 'comisiones',
        desc: 'Cálculo de comisiones por técnico basado en ventas y servicios completados.',
        tags: ['Comisiones', 'Técnicos'] },
    ],
  },
  {
    id: 'administrativos', label: 'Administrativos', icon: <BarChart2 size={18}/>, iconBg: 'rgba(61,217,214,0.10)', count: 7,
    reports: [
      { name: 'Agenda del Día',             desc: 'Reservas y trabajos programados para hoy' },
      { name: 'Ocupación de Vehículos',     desc: 'Horas activas vs. disponibles por unidad' },
      { name: 'Registro de Reservas',        desc: 'Listado completo de bookings con filtros avanzados' },
      { name: 'Desempeño de Técnicos',       desc: 'KPIs individuales por técnico del equipo' },
      { name: 'Clientes Frecuentes',         desc: 'Ranking por visitas y facturación acumulada' },
      { name: 'Tiempos de Servicio',         desc: 'Duración promedio por tipo de trabajo' },
      { name: 'Capacidad Operativa',         desc: 'Ratio de ocupación de flota y equipos' },
    ],
  },
  {
    id: 'financieros', label: 'Financieros', icon: <FileText size={18}/>, iconBg: 'rgba(245,181,68,0.10)', count: 4,
    reports: [],
    richReports: [
      {
        icon: '📊', name: 'Estado de Resultados (P&L)', previewId: 'pl',
        desc: 'Ingresos, costos y gastos del período. Muestra la utilidad o pérdida neta del negocio.',
        tags: ['Mensual', 'Trimestral', 'Anual'],
      },
      {
        icon: '🏦', name: 'Estado de Situación Financiera', previewId: 'balance',
        desc: 'Balance general de activos, pasivos y patrimonio según estándares IFRS/NIIF.',
        tags: ['Balance General', 'IFRS'],
      },
      {
        icon: '💸', name: 'Flujo de Caja', previewId: 'cashflow',
        desc: 'Entradas y salidas de efectivo operacionales, de inversión y financiamiento.',
        tags: ['Cash Flow', 'Efectivo'],
      },
      {
        icon: '📒', name: 'Movimientos por Cuenta Contable', previewId: 'movimientos',
        desc: 'Detalle de débitos y créditos por cuenta del plan contable. Libro Mayor.',
        tags: ['Contabilidad', 'Libro Mayor'],
      },
    ],
  },
  {
    id: 'contables', label: 'Contables', icon: <BookOpen size={18}/>, iconBg: 'rgba(245,181,68,0.10)', count: 4, badge: '¡Nuevo!',
    reports: [
      { name: 'Balance General',            desc: 'Activos, pasivos y patrimonio a la fecha' },
      { name: 'Libro Diario',               desc: 'Registro cronológico de transacciones contables' },
      { name: 'Libro Mayor',                desc: 'Saldos por cuenta del plan de cuentas IFRS' },
      { name: 'Conciliación Bancaria',      desc: 'Diferencias entre bancos y contabilidad' },
    ],
  },
  {
    id: 'fiscales', label: 'Fiscales', icon: <Receipt size={18}/>, iconBg: 'rgba(217,83,61,0.10)', count: 4,
    reports: [
      { name: 'Declaración IVA — UAE VAT',  desc: 'Reporte periódico para presentación ante la FTA' },
      { name: 'Gastos Deducibles',          desc: 'Listado de gastos aplicables a declaración fiscal' },
      { name: 'Retenciones en la Fuente',   desc: 'Impuestos retenidos a proveedores y terceros' },
      { name: 'Impuestos por Pagar',        desc: 'Obligaciones fiscales vigentes y fechas límite' },
    ],
  },
  {
    id: 'trabajar', label: 'Para trabajar', icon: <Package size={18}/>, iconBg: 'rgba(107,70,193,0.10)', count: 3,
    reports: [
      { name: 'Órdenes de Trabajo del Día', desc: 'Servicios asignados con técnico y dirección del cliente' },
      { name: 'Lista de Materiales',        desc: 'Inventario necesario para los trabajos del día' },
      { name: 'Ruta de Vehículos',          desc: 'Recorridos y asignaciones geográficas programadas' },
    ],
  },
  {
    id: 'exogena', label: 'Información exógena', icon: <Database size={18}/>, iconBg: 'rgba(11,42,74,0.10)', count: 8,
    reports: [
      { name: 'Reporte de Clientes Nuevos', desc: 'Datos de contacto y primera transacción en el período' },
      { name: 'Información de Proveedores', desc: 'ID fiscal, pagos realizados y saldos pendientes' },
      { name: 'Pagos Realizados',           desc: 'Egresos por tercero durante el período seleccionado' },
      { name: 'Ingresos Brutos por Tercero',desc: 'Clientes con facturación superior al umbral legal' },
      { name: 'Retenciones Practicadas',    desc: 'Impuestos retenidos a clientes durante el período' },
      { name: 'Saldos por Cobrar',          desc: 'Cartera vigente y vencida por cliente' },
      { name: 'Saldos por Pagar',           desc: 'Cuentas pendientes con proveedores y acreedores' },
      { name: 'Operaciones en Efectivo',    desc: 'Transacciones de caja superiores al mínimo legal' },
    ],
  },
  {
    id: 'favoritos', label: 'Favoritos', icon: <Star size={18}/>, iconBg: 'rgba(90,88,82,0.10)', count: 0, dim: true,
    reports: [],
  },
]

const ICON_COLOR: Record<string, string> = {
  ventas: '#34d399', administrativos: '#00d4aa', financieros: '#fb923c',
  contables: '#fb923c', fiscales: '#D9533D', trabajar: '#a78bfa',
  exogena: '#6366f1', favoritos: '#5A5852',
}

const EXPORT_OPTIONS = [
  { label: 'PDF',        icon: <Download size={13}/> },
  { label: 'Excel/CSV',  icon: <FileSpreadsheet size={13}/> },
  { label: 'Email',      icon: <Mail size={13}/> },
  { label: 'WhatsApp',   icon: <MessageSquare size={13}/> },
]

// ─── category card ─────────────────────────────────────────────────────────────
function CategoryCard({ cat, active, onClick }: { cat: Category; active: boolean; onClick: () => void }) {
  const { t } = useLanguage()
  const [hov, setHov] = useState(false)
  const color = ICON_COLOR[cat.id]
  const LABEL_MAP: Record<string, string> = {
    ventas:          t('sales'),
    administrativos: t('administrative'),
    financieros:     t('financialReports'),
    contables:       t('accounting'),
    fiscales:        t('fiscal'),
    trabajar:        t('workReports'),
    exogena:         t('exogenousInfo'),
    favoritos:       t('favorites'),
  }
  const label = LABEL_MAP[cat.id] ?? cat.label
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ position:'relative', background: hov&&!active?'#F5F4EF':'#FFFFFF', cursor:'pointer', transition:'all 0.2s ease',
        border:`1px solid ${active?'#0B2A4A':hov?'#CBD8E8':'#F0EFEA'}`,
        borderRadius:12, padding:20, transform: hov&&!active?'translateY(-2px)':'none', opacity: cat.dim?0.55:1 }}>
      {cat.badge && (
        <span style={{ position:'absolute', top:10, right:10, background:'rgba(61,217,214,0.12)', color:'#0B6B69', borderRadius:20, fontSize:10, fontWeight:700, padding:'2px 8px' }}>{cat.badge}</span>
      )}
      {active && <span style={{ position:'absolute', top:10, right: cat.badge?80:10, width:6, height:6, borderRadius:'50%', background:'#0B2A4A' }}/>}
      <div style={{ width:42, height:42, borderRadius:'50%', background:cat.iconBg, display:'flex', alignItems:'center', justifyContent:'center', color, marginBottom:14 }}>{cat.icon}</div>
      <div style={{ fontSize:16, fontWeight:700, color:'#0B2A4A', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:12, color:'#5A5852' }}>{cat.count===0 ? t('noSavedReports') : `${cat.count} ${cat.count===1 ? t('reporte') : t('reportes')}`}</div>
    </div>
  )
}

// ─── simple report row (non-rich panels) ──────────────────────────────────────
function ReportRow({ report, color }: { report: Report; color: string }) {
  const { t } = useLanguage()
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, padding:'14px 20px',
        borderBottom:'1px solid #F0EFEA', background: hov?'#F5F4EF':'transparent', transition:'background 0.12s' }}>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#0B2A4A', marginBottom:2 }}>{report.name}</div>
        <div style={{ fontSize:11, color:'#5A5852', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{report.desc}</div>
      </div>
      <button style={{ padding:'6px 14px', borderRadius:7, border:`1px solid ${hov?color:'rgba(255,255,255,0.08)'}`,
        background: hov?`${color}18`:'transparent', color: hov?color:'#5A5852',
        fontSize:11, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s', flexShrink:0 }}>
        {t('generate')} ↗
      </button>
    </div>
  )
}

// ─── rich report card (for financieros) ───────────────────────────────────────
function RichReportCard({ report, onGenerate, iconBg = 'rgba(245,181,68,0.10)' }: { report: RichReport; onGenerate: (id: string) => void; iconBg?: string }) {
  const { t } = useLanguage()
  const [hov, setHov] = useState(false)
  const [fav, setFav] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:'flex', alignItems:'center', gap:16, padding:16, borderRadius:10, marginBottom:8,
        background:'#FFFFFF', cursor:'default', transition:'border-color 0.15s',
        border:`1px solid ${hov?'#CBD8E8':'#F0EFEA'}` }}>
      {/* icon */}
      <div style={{ width:40, height:40, borderRadius:10, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
        {report.icon}
      </div>
      {/* text */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'#0B2A4A' }}>{report.name}</div>
        <div style={{ fontSize:12, color:'#5A5852', marginTop:3 }}>{report.desc}</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:7 }}>
          {report.tags.map(t => (
            <span key={t} style={{ fontSize:10, color:'#5A5852', background:'#FFFFFF', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'2px 8px' }}>{t}</span>
          ))}
        </div>
      </div>
      {/* buttons */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <button onClick={() => setFav(f => !f)}
          style={{ width:30, height:30, borderRadius:'50%', background:'#FFFFFF', border:`1px solid ${fav?'#F5B544':'rgba(255,255,255,0.08)'}`,
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color: fav?'#F5B544':'#5A5852', transition:'all 0.15s' }}>
          <Star size={13} fill={fav?'#F5B544':'none'}/>
        </button>
        <button onClick={() => onGenerate(report.previewId)}
          style={{ padding:'6px 14px', borderRadius:6, border:'none', background:'#F5B544', color:'#1A1A1A', fontSize:12, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer', whiteSpace:'nowrap' }}>
          {t('generate')}
        </button>
        <button
          style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #E5E7EB', background:'transparent', color:'#5A5852', fontSize:12, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
          ↓
        </button>
      </div>
    </div>
  )
}

// ─── report preview modals ────────────────────────────────────────────────────
function PreviewShell({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#FFFFFF', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, width:'100%', maxWidth:820, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column' }}
        onClick={e => e.stopPropagation()}>
        {/* modal header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 24px', borderBottom:'1px solid #F0EFEA' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#0B2A4A' }}>{title}</div>
            <div style={{ fontSize:12, color:'#5A5852', marginTop:2 }}>{subtitle}</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button style={{ padding:'6px 14px', borderRadius:7, border:'none', background:'#F5B544', color:'#1A1A1A', fontSize:12, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
              ↓ Descargar
            </button>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#5A5852', padding:4, display:'flex' }}><X size={18}/></button>
          </div>
        </div>
        {/* modal body */}
        <div style={{ flex:1, overflowY:'auto', padding:24 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

const PREVIEW_DATE = new Date().toLocaleDateString('en-AE', { day:'2-digit', month:'long', year:'numeric' })

// Estado de Situación Financiera (Balance Sheet)
function BalanceSheetModal({ onClose }: { onClose: () => void }) {
  const [accs, setAccs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    createClient().from('chart_of_accounts').select('code,name,type,level,balance').order('code').then(({ data }) => { setAccs(data ?? []); setLoading(false) })
  }, [])

  function l3(parentCode: string) { return accs.filter(a => { const p = a.code.split('.'); return p.length === 3 && p.slice(0,-1).join('.') === parentCode }) }
  function sumL3(parentCode: string) { return l3(parentCode).reduce((s: number, a: any) => s + (a.balance ?? 0), 0) }
  function l2(groupNum: string) { return accs.filter(a => { const p = a.code.split('.'); return p.length === 2 && p[0] === groupNum }) }

  const totalAC  = sumL3('1.1'), totalANC = sumL3('1.2'), totalActivos = totalAC + totalANC
  const totalPC  = sumL3('2.1'), totalPNC = sumL3('2.2'), totalPasivos = totalPC + totalPNC
  const patItems = l2('3'), totalPat = patItems.reduce((s: number, a: any) => s + (a.balance ?? 0), 0)
  const totalPyP = totalPasivos + totalPat

  const sepStyle: React.CSSProperties = { borderBottom:'1px solid rgba(255,255,255,0.08)', margin:'8px 0' }
  function AccRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
    return (
      <div style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', fontSize: bold?13:12, fontWeight: bold?700:400, color: bold?'#0B2A4A':'#5A5852' }}>
        <span>{label}</span>
        <span style={{ fontVariantNumeric:'tabular-nums', color: bold?'#F5B544':'#5A5852' }}>{aed(value)}</span>
      </div>
    )
  }
  function SectionHead({ label }: { label: string }) {
    return <div style={{ fontSize:10, fontWeight:700, color:'#5A5852', textTransform:'uppercase', letterSpacing:'0.08em', margin:'12px 0 6px' }}>{label}</div>
  }

  if (loading) return (
    <PreviewShell title="Estado de Situación Financiera" subtitle={`Al ${PREVIEW_DATE}`} onClose={onClose}>
      <div style={{ textAlign:'center', padding:40, color:'#5A5852', fontSize:13 }}>Cargando datos contables…</div>
    </PreviewShell>
  )

  return (
    <PreviewShell title="Estado de Situación Financiera" subtitle={`Al ${PREVIEW_DATE} · IFRS/NIIF`} onClose={onClose}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        {/* ACTIVOS */}
        <div style={{ background:'#FFFFFF', borderRadius:10, padding:18, border:'1px solid rgba(0,212,170,0.15)' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#00d4aa', marginBottom:8 }}>ACTIVOS</div>
          <div style={sepStyle}/>
          <SectionHead label="Activos Corrientes"/>
          {l3('1.1').map((a: any) => <AccRow key={a.code} label={`  ${a.name}`} value={a.balance ?? 0}/>)}
          <AccRow label="Total Activos Corrientes" value={totalAC} bold/>
          <div style={sepStyle}/>
          <SectionHead label="Activos No Corrientes"/>
          {l3('1.2').map((a: any) => <AccRow key={a.code} label={`  ${a.name}`} value={a.balance ?? 0}/>)}
          <AccRow label="Total Activos No Corrientes" value={totalANC} bold/>
          <div style={sepStyle}/>
          <AccRow label="TOTAL ACTIVOS" value={totalActivos} bold/>
        </div>
        {/* PASIVOS + PATRIMONIO */}
        <div style={{ background:'#FFFFFF', borderRadius:10, padding:18, border:'1px solid rgba(255,79,79,0.15)' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#D9533D', marginBottom:8 }}>PASIVOS Y PATRIMONIO</div>
          <div style={sepStyle}/>
          <SectionHead label="Pasivos Corrientes"/>
          {l3('2.1').map((a: any) => <AccRow key={a.code} label={`  ${a.name}`} value={a.balance ?? 0}/>)}
          <AccRow label="Total Pasivos Corrientes" value={totalPC} bold/>
          <div style={sepStyle}/>
          <SectionHead label="Pasivos No Corrientes"/>
          {l3('2.2').map((a: any) => <AccRow key={a.code} label={`  ${a.name}`} value={a.balance ?? 0}/>)}
          <AccRow label="Total Pasivos No Corrientes" value={totalPNC} bold/>
          <div style={sepStyle}/>
          <SectionHead label="Patrimonio"/>
          {patItems.map((a: any) => <AccRow key={a.code} label={`  ${a.name}`} value={a.balance ?? 0}/>)}
          <AccRow label="Total Patrimonio" value={totalPat} bold/>
          <div style={sepStyle}/>
          <AccRow label="TOTAL PASIVOS + PATRIMONIO" value={totalPyP} bold/>
        </div>
      </div>
    </PreviewShell>
  )
}

// Estado de Resultados (P&L)
function PLModal({ onClose }: { onClose: () => void }) {
  const rev = 847250, cogs = 77380, gross = rev - cogs
  const opex = 4470, ebit = gross - opex
  const fin = 0, net = ebit - fin
  const margin = ((net / rev) * 100).toFixed(1)
  function Row({ label, value, indent=false, bold=false, color='#5A5852' }: { label: string; value: number; indent?: boolean; bold?: boolean; color?: string }) {
    return (
      <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize: bold?13:12, fontWeight: bold?700:400, color: bold?'#0B2A4A':color, paddingLeft: indent?16:0 }}>
        <span>{label}</span>
        <span style={{ fontVariantNumeric:'tabular-nums', color: bold?'#F5B544':color }}>{aed(value)}</span>
      </div>
    )
  }
  const sep = <div style={{ borderBottom:'1px solid rgba(255,255,255,0.08)', margin:'8px 0' }}/>
  return (
    <PreviewShell title="Estado de Resultados (P&L)" subtitle={`Período: Mayo 2026 · MTD`} onClose={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:10, padding:20, border:'1px solid rgba(201,168,76,0.15)', maxWidth:520, margin:'0 auto' }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#0B2A4A', marginBottom:12 }}>Resultados del Período</div>
        {sep}
        <div style={{ fontSize:10, fontWeight:700, color:'#5A5852', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Ingresos</div>
        <Row label="Ventas de Servicios" value={rev} indent color="#f0ede8"/>
        <Row label="INGRESOS TOTALES" value={rev} bold/>
        {sep}
        <div style={{ fontSize:10, fontWeight:700, color:'#5A5852', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Costos de Ventas</div>
        <Row label="Costo de Materiales" value={cogs} indent color="#f0ede8"/>
        <Row label="TOTAL COSTOS" value={cogs} bold/>
        {sep}
        <Row label="UTILIDAD BRUTA" value={gross} bold/>
        <Row label="Margen bruto" value={0} indent color="#888580"/>
        <div style={{ textAlign:'right', fontSize:11, color:'#34d399', marginTop:-16, paddingBottom:8 }}>{((gross/rev)*100).toFixed(1)}%</div>
        {sep}
        <div style={{ fontSize:10, fontWeight:700, color:'#5A5852', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Gastos Operacionales</div>
        <Row label="Gastos Administrativos" value={opex} indent color="#f0ede8"/>
        <Row label="TOTAL GASTOS" value={opex} bold/>
        {sep}
        <Row label="EBIT (Utilidad Operacional)" value={ebit} bold/>
        <Row label="Gastos Financieros" value={fin} indent color="#f0ede8"/>
        {sep}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', background:'rgba(52,211,153,0.06)', borderRadius:7, paddingLeft:10, paddingRight:10 }}>
          <span style={{ fontSize:14, fontWeight:800, color:'#0B2A4A' }}>UTILIDAD NETA</span>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:16, fontWeight:800, color:'#34d399', fontVariantNumeric:'tabular-nums' }}>{aed(net)}</div>
            <div style={{ fontSize:11, color:'#34d399' }}>Margen {margin}%</div>
          </div>
        </div>
      </div>
    </PreviewShell>
  )
}

// Flujo de Caja
function CashFlowModal({ onClose }: { onClose: () => void }) {
  const sections = [
    {
      label: 'Actividades Operacionales', color: '#00d4aa',
      items: [
        { name: 'Ingresos por servicios cobrados',      value:  847250 },
        { name: 'Pagos a proveedores',                  value: -77380  },
        { name: 'Pagos a empleados y técnicos',         value: -45000  },
        { name: 'Otros pagos operacionales',            value:  -8820  },
      ],
      total: 716050,
    },
    {
      label: 'Actividades de Inversión', color: '#F5B544',
      items: [
        { name: 'Compra de equipos y herramientas',     value: -12000 },
        { name: 'Mantenimiento de flota',               value:  -3200 },
      ],
      total: -15200,
    },
    {
      label: 'Actividades de Financiamiento', color: '#a78bfa',
      items: [
        { name: 'Préstamos recibidos',                  value:      0 },
        { name: 'Pagos de deuda',                       value:      0 },
      ],
      total: 0,
    },
  ]
  const netFlow = sections.reduce((s, sec) => s + sec.total, 0)
  const openBal = 0, closeBal = openBal + netFlow

  return (
    <PreviewShell title="Flujo de Caja" subtitle="Mayo 2026 · Método Indirecto" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {sections.map(sec => (
          <div key={sec.label} style={{ background:'#FFFFFF', borderRadius:10, padding:16, border:`1px solid ${sec.color}22` }}>
            <div style={{ fontSize:12, fontWeight:700, color:sec.color, marginBottom:10 }}>{sec.label}</div>
            {sec.items.map(item => (
              <div key={item.name} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#5A5852', padding:'4px 0' }}>
                <span style={{ paddingLeft:12 }}>{item.name}</span>
                <span style={{ fontVariantNumeric:'tabular-nums', color: item.value >= 0 ? '#34d399' : '#D9533D' }}>
                  {item.value >= 0 ? '+' : ''}{aed(item.value)}
                </span>
              </div>
            ))}
            <div style={{ borderTop:'1px solid #F0EFEA', marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:700, color:'#0B2A4A' }}>
              <span>Flujo {sec.label.split(' ').slice(-1)[0]}</span>
              <span style={{ fontVariantNumeric:'tabular-nums', color: sec.total >= 0 ? '#34d399' : '#D9533D' }}>{sec.total >= 0?'+':''}{aed(sec.total)}</span>
            </div>
          </div>
        ))}
        <div style={{ background:'rgba(52,211,153,0.07)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:10, padding:16, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          {[
            { label: 'Saldo Inicial', value: openBal,  color: '#5A5852' },
            { label: 'Variación Neta', value: netFlow, color: '#F5B544' },
            { label: 'SALDO FINAL',   value: closeBal, color: '#34d399' },
          ].map(k => (
            <div key={k.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:'#5A5852', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{k.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:k.color, fontVariantNumeric:'tabular-nums' }}>{aed(k.value)}</div>
            </div>
          ))}
        </div>
      </div>
    </PreviewShell>
  )
}

// Movimientos por Cuenta Contable
function MovimientosModal({ onClose }: { onClose: () => void }) {
  const [accs, setAccs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    createClient().from('chart_of_accounts').select('code,name,type,level,balance').order('code').then(({ data }) => { setAccs(data ?? []); setLoading(false) })
  }, [])

  const leafAccs = accs.filter(a => a.level === 3)

  return (
    <PreviewShell title="Movimientos por Cuenta Contable" subtitle={`Libro Mayor · ${PREVIEW_DATE}`} onClose={onClose}>
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#5A5852', fontSize:13 }}>Cargando cuentas…</div>
      ) : (
        <div style={{ overflow:'hidden', borderRadius:10, border:'1px solid #F0EFEA' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #F0EFEA' }}>
                {['Código','Cuenta','Tipo','Débito','Crédito','Saldo'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', fontSize:10, fontWeight:600, color:'#5A5852', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leafAccs.map(a => (
                <tr key={a.code} style={{ borderBottom:'1px solid #F0EFEA' }}>
                  <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#5A5852' }}>{a.code}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'#0B2A4A' }}>{a.name}</td>
                  <td style={{ padding:'10px 14px', fontSize:11, color:'#5A5852' }}>{a.type}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'#34d399', fontVariantNumeric:'tabular-nums' }}>{aed(0)}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'#D9533D', fontVariantNumeric:'tabular-nums' }}>{aed(0)}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, fontWeight:600, color:'#0B2A4A', fontVariantNumeric:'tabular-nums' }}>{aed(a.balance ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PreviewShell>
  )
}

// Rentabilidad por Servicio
function RentabilidadModal({ onClose }: { onClose: () => void }) {
  const rows = [
    { servicio: 'Detailing Completo',       ingresos: 850,  mat: 120,  mo: 200, margen: 530,  pct: 62.4 },
    { servicio: 'Recubrimiento Cerámico',   ingresos: 2800, mat: 800,  mo: 350, margen: 1650, pct: 58.9 },
    { servicio: 'Film de Protección (PPF)', ingresos: 3500, mat: 1200, mo: 400, margen: 1900, pct: 54.3 },
    { servicio: 'Limpieza Interior',        ingresos: 650,  mat: 80,   mo: 150, margen: 420,  pct: 64.6 },
    { servicio: 'Polarizado de Vidrios',    ingresos: 1200, mat: 350,  mo: 200, margen: 650,  pct: 54.2 },
    { servicio: 'Cambio de Aceite',         ingresos: 280,  mat: 120,  mo: 80,  margen: 80,   pct: 28.6 },
    { servicio: 'Servicio A/C',             ingresos: 450,  mat: 150,  mo: 120, margen: 180,  pct: 40.0 },
  ]
  const totI = rows.reduce((s, r) => s + r.ingresos, 0)
  const totM = rows.reduce((s, r) => s + r.mat, 0)
  const totO = rows.reduce((s, r) => s + r.mo, 0)
  const totG = rows.reduce((s, r) => s + r.margen, 0)
  const totP = ((totG / totI) * 100).toFixed(1)
  function pctColor(p: number) { return p >= 55 ? '#34d399' : p >= 40 ? '#F5B544' : '#D9533D' }
  const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th style={{ padding:'10px 14px', fontSize:10, fontWeight:600, color:'#5A5852', textTransform:'uppercase', letterSpacing:'0.08em', textAlign: right?'right':'left', whiteSpace:'nowrap' }}>{children}</th>
  )
  return (
    <PreviewShell title="Rentabilidad por Servicio" subtitle="Mayo 2026 · Margen por línea de servicio" onClose={onClose}>
      <div style={{ overflow:'hidden', borderRadius:10, border:'1px solid #F0EFEA' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#FFFFFF', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
              <TH>Servicio</TH>
              <TH right>Ingresos</TH>
              <TH right>Costo Mat.</TH>
              <TH right>Costo M.O.</TH>
              <TH right>Margen AED</TH>
              <TH right>Margen %</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.servicio} style={{ borderBottom:'1px solid #F0EFEA' }}>
                <td style={{ padding:'11px 14px', fontSize:13, color:'#0B2A4A', fontWeight:500 }}>{r.servicio}</td>
                <td style={{ padding:'11px 14px', fontSize:12, color:'#0B2A4A', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{aed(r.ingresos)}</td>
                <td style={{ padding:'11px 14px', fontSize:12, color:'#5A5852', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{aed(r.mat)}</td>
                <td style={{ padding:'11px 14px', fontSize:12, color:'#5A5852', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{aed(r.mo)}</td>
                <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, color:'#34d399', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{aed(r.margen)}</td>
                <td style={{ padding:'11px 14px', textAlign:'right' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:pctColor(r.pct), background:`${pctColor(r.pct)}18`, borderRadius:20, padding:'3px 10px' }}>{r.pct}%</span>
                </td>
              </tr>
            ))}
            <tr style={{ background:'rgba(201,168,76,0.06)', borderTop:'1px solid #E5E7EB' }}>
              <td style={{ padding:'12px 14px', fontSize:13, fontWeight:700, color:'#F5B544' }}>TOTAL</td>
              <td style={{ padding:'12px 14px', fontSize:13, fontWeight:700, color:'#0B2A4A', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{aed(totI)}</td>
              <td style={{ padding:'12px 14px', fontSize:12, fontWeight:700, color:'#5A5852', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{aed(totM)}</td>
              <td style={{ padding:'12px 14px', fontSize:12, fontWeight:700, color:'#5A5852', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{aed(totO)}</td>
              <td style={{ padding:'12px 14px', fontSize:13, fontWeight:700, color:'#34d399', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{aed(totG)}</td>
              <td style={{ padding:'12px 14px', textAlign:'right' }}>
                <span style={{ fontSize:12, fontWeight:700, color:'#F5B544', background:'rgba(201,168,76,0.15)', borderRadius:20, padding:'3px 10px' }}>{totP}%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </PreviewShell>
  )
}

// ─── export row ───────────────────────────────────────────────────────────────
function ExportRow({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', cursor:'pointer',
        background: hov?'rgba(201,168,76,0.08)':'transparent', color: hov?'#F5B544':'#0B2A4A',
        fontSize:13, fontFamily:'Outfit,sans-serif', transition:'background 0.1s' }}>
      <span style={{ color: hov?'#F5B544':'#5A5852' }}>{icon}</span>
      {label}
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { t } = useLanguage()
  const [selected,        setSelected]        = useState<string|null>(null)
  const [showExport,      setShowExport]      = useState(false)
  const [previewReport,   setPreviewReport]   = useState<string|null>(null)
  const [toasts,          setToasts]          = useState<Toast[]>([])
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState<any[]>([])
  const [totalPorCobrar,   setTotalPorCobrar]   = useState(0)
  const [cuentasPorPagar,  setCuentasPorPagar]  = useState<any[]>([])
  const [totalPorPagar,    setTotalPorPagar]    = useState(0)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOut(e: MouseEvent) { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false) }
    document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [])

  useEffect(() => {
    createClient()
      .from('invoices')
      .select('id, invoice_no, total, created_at, contacts(name)')
      .eq('status', 'por_cobrar')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const rows = data ?? []
        setCuentasPorCobrar(rows)
        setTotalPorCobrar(rows.reduce((s, inv) => s + (Number(inv.total) || 0), 0))
      })
    createClient()
      .from('purchase_invoices')
      .select('id, invoice_number, total, issue_date, due_date, supplier_name, contacts(name)')
      .in('status', ['pendiente', 'vencida'])
      .order('due_date', { ascending: true })
      .then(({ data }) => {
        const rows = data ?? []
        setCuentasPorPagar(rows)
        setTotalPorPagar(rows.reduce((s, inv) => s + (Number(inv.total) || 0), 0))
      })
  }, [])

  function addToast(msg: string, type: Toast['type'] = 'success') {
    const id = ++_tid
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  function generateReport(previewId: string) {
    addToast('Generando reporte…', 'warn')
    setTimeout(() => {
      addToast('✓ Reporte listo', 'success')
      setPreviewReport(previewId)
    }, 1200)
  }

  const activeCat = CATEGORIES.find(c => c.id === selected)

  return (
    <div style={{ padding:24 }}>

      {/* header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:24, fontWeight:700, color:'#0B2A4A' }}>{t('reports')}</div>
          <div style={{ fontSize:13, color:'#5A5852', marginTop:4 }}>{t('reportsSubtitle')}</div>
        </div>
        <div ref={exportRef} style={{ position:'relative' }}>
          <button onClick={() => setShowExport(p => !p)}
            style={{ padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', background:'#F5B544', color:'#1A1A1A', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
            <Download size={14}/> {t('export')} <span style={{ fontSize:10 }}>▾</span>
          </button>
          {showExport && (
            <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:400, background:'#FFFFFF', border:'1px solid #E5E7EB', borderRadius:10, overflow:'hidden', minWidth:160, boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
              {EXPORT_OPTIONS.map(opt => <ExportRow key={opt.label} label={opt.label} icon={opt.icon} onClick={() => setShowExport(false)}/>)}
            </div>
          )}
        </div>
      </div>

      {/* 4×2 grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom: selected ? 16 : 0 }}>
        {CATEGORIES.map(cat => (
          <CategoryCard key={cat.id} cat={cat} active={selected===cat.id} onClick={() => setSelected(p => p===cat.id ? null : cat.id)}/>
        ))}
      </div>

      {/* Cuentas por Cobrar */}
      <div style={{ background:'#FFFFFF', border:'1px solid #F0EFEA', borderRadius:12, padding:20, marginTop:16, marginBottom: activeCat ? 0 : 0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:'#5A5852', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>Cuentas por Cobrar</div>
            <div style={{ fontSize:26, fontWeight:800, color:'#0B2A4A' }}>AED {(totalPorCobrar || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style={{ fontSize:12, color:'#5A5852', marginTop:2 }}>
              {cuentasPorCobrar.length} factura{cuentasPorCobrar.length !== 1 ? 's' : ''} pendiente{cuentasPorCobrar.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ background:'rgba(245,158,11,0.12)', border:'1px solid #F0EFEA', borderRadius:10, padding:10, fontSize:22 }}>🧾</div>
        </div>
        {cuentasPorCobrar.length === 0 ? (
          <div style={{ textAlign:'center', padding:'16px 0', fontSize:13, color:'#5A5852' }}>✅ No hay cuentas pendientes por cobrar</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {cuentasPorCobrar.map(inv => (
              <div key={inv.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'#F5F4EF', border:'1px solid #F0EFEA', borderRadius:8 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#0B2A4A' }}>{(inv as any).contacts?.name ?? '—'}</div>
                  <div style={{ fontSize:11, color:'#5A5852', marginTop:2 }}>
                    {inv.invoice_no} · {new Date(inv.created_at).toLocaleDateString('en-AE', { timeZone: 'Asia/Dubai', day:'2-digit', month:'2-digit', year:'numeric' })}
                  </div>
                </div>
                <div style={{ color:'#F5B544', fontWeight:800, fontSize:14 }}>AED {Number(inv.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cuentas por Pagar */}
      <div style={{ background:'#FFFFFF', border:'1px solid #F0EFEA', borderRadius:12, padding:20, marginTop:12, marginBottom: activeCat ? 0 : 0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:'#5A5852', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>Cuentas por Pagar</div>
            <div style={{ fontSize:26, fontWeight:800, color:'#0B2A4A' }}>AED {(totalPorPagar || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style={{ fontSize:12, color:'#5A5852', marginTop:2 }}>
              {cuentasPorPagar.length} factura{cuentasPorPagar.length !== 1 ? 's' : ''} pendiente{cuentasPorPagar.length !== 1 ? 's' : ''} de pago
            </div>
          </div>
          <div style={{ background:'rgba(255,79,79,0.1)', border:'1px solid #F0EFEA', borderRadius:10, padding:10, fontSize:22 }}>🧾</div>
        </div>
        {cuentasPorPagar.length === 0 ? (
          <div style={{ textAlign:'center', padding:'16px 0', fontSize:13, color:'#5A5852' }}>✅ No hay facturas de compra pendientes</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {cuentasPorPagar.map((inv: any) => {
              const isOverdue = inv.due_date && new Date(inv.due_date) < new Date()
              return (
                <div key={inv.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background: isOverdue ? '#FBE7E2' : '#F5F4EF', border:`1px solid ${isOverdue ? '#F5B8AE' : '#F0EFEA'}`, borderRadius:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0B2A4A' }}>{inv.contacts?.name ?? inv.supplier_name ?? '—'}</div>
                    <div style={{ fontSize:11, color: isOverdue ? '#D9533D' : '#5A5852', marginTop:2 }}>
                      {inv.invoice_number}
                      {inv.due_date ? ` · vence ${new Date(inv.due_date + 'T00:00:00+04:00').toLocaleDateString('en-AE', { day:'2-digit', month:'2-digit', year:'numeric' })}` : ''}
                      {isOverdue ? ' · VENCIDA' : ''}
                    </div>
                  </div>
                  <div style={{ color: isOverdue ? '#D9533D' : '#B45309', fontWeight:800, fontSize:14 }}>AED {Number(inv.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* expanded panel */}
      {activeCat && (
        <div style={{ background:'#FFFFFF', border:`1px solid ${ICON_COLOR[activeCat.id]}28`, borderTop:`2px solid ${ICON_COLOR[activeCat.id]}`, borderRadius:'0 0 12px 12px', overflow:'hidden', animation:'slideDown 0.18s ease' }}>
          {/* panel header */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={() => setSelected(null)} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:'#5A5852', fontSize:12, fontFamily:'Outfit,sans-serif', padding:0 }}>
              <ChevronLeft size={14}/> {t('backToReports')}
            </button>
            <span style={{ width:1, height:14, background:'#E5E7EB' }}/>
            <span style={{ fontSize:15, fontWeight:700, color:'#0B2A4A' }}>{activeCat.label}</span>
            <span style={{ fontSize:11, color:'#5A5852', background:'#F0EFEA', borderRadius:99, padding:'2px 8px' }}>
              {activeCat.count} {activeCat.count!==1 ? t('reportes') : t('reporte')}
            </span>
          </div>

          {/* rich report cards (financieros) */}
          {activeCat.richReports && activeCat.richReports.length > 0 ? (
            <div style={{ padding:'16px 20px' }}>
              {activeCat.richReports.map((r, i) => (
                <RichReportCard key={i} report={r} onGenerate={generateReport} iconBg={activeCat.iconBg}/>
              ))}
            </div>
          ) : activeCat.reports.length === 0 ? (
            <div style={{ padding:'0 16px' }}>
              <EmptyState
                icon="report"
                title="Sin datos para mostrar"
                subtitle="Completa reservas y registra gastos para ver tus reportes aquí"
              />
            </div>
          ) : (
            activeCat.reports.map((r, i) => (
              <ReportRow key={i} report={r} color={ICON_COLOR[activeCat.id]}/>
            ))
          )}
        </div>
      )}

      {/* preview modals */}
      {previewReport === 'rentabilidad'&& <RentabilidadModal  onClose={() => setPreviewReport(null)}/>}
      {previewReport === 'balance'    && <BalanceSheetModal  onClose={() => setPreviewReport(null)}/>}
      {previewReport === 'pl'         && <PLModal           onClose={() => setPreviewReport(null)}/>}
      {previewReport === 'cashflow'   && <CashFlowModal     onClose={() => setPreviewReport(null)}/>}
      {previewReport === 'movimientos'&& <MovimientosModal  onClose={() => setPreviewReport(null)}/>}

      {/* toasts */}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:900, display:'flex', flexDirection:'column', gap:8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding:'12px 18px', borderRadius:10, fontSize:13, fontWeight:600, fontFamily:'Outfit,sans-serif', color:'#fff',
            background: t.type==='success'?'rgba(34,197,94,0.95)':t.type==='warn'?'rgba(251,146,60,0.95)':'rgba(255,79,79,0.95)',
            boxShadow:'0 4px 20px rgba(0,0,0,0.4)', backdropFilter:'blur(8px)' }}>
            {t.msg}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity:0; transform:translateY(-8px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  )
}
