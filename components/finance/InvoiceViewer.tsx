'use client'

import { useRef, useState } from 'react'
import { useCompany } from '@/contexts/CompanyContext'

interface Props {
  invoice: any
  onClose: () => void
}

export function InvoiceViewer({ invoice, onClose }: Props) {
  const { companyName, companySubtitle } = useCompany()
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const invoiceNo   = invoice.invoice_no ?? invoice.id?.slice(0, 8).toUpperCase()
  const issueDate   = new Date(invoice.issued_at ?? invoice.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
  const dueDate     = invoice.due_at ? new Date(invoice.due_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : null
  const paidDate    = invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : null
  const clientName  = invoice.contacts?.name ?? invoice.contacts?.full_name ?? 'Cliente'
  const subtotal    = Number(invoice.subtotal ?? 0)
  const tax         = Number(invoice.tax ?? 0)
  const discount    = Number(invoice.discount ?? 0)
  const total       = Number(invoice.total ?? 0)
  const isPaid      = invoice.status === 'paid'

  async function handleDownload() {
    if (!invoiceRef.current) return
    setDownloading(true)
    try {
      const { default: jsPDF }      = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(invoiceRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, w, h)
      pdf.save(`Factura-${invoiceNo}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  const cell: React.CSSProperties = { padding: '12px 16px', fontSize: 13, borderBottom: '1px solid #eee' }
  const label: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#888', textTransform: 'uppercase', marginBottom: 6 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 800, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '24px 16px' }}
      onClick={onClose}>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, width: '100%', maxWidth: 720, justifyContent: 'flex-end' }}
        onClick={e => e.stopPropagation()}>
        <button onClick={handleDownload} disabled={downloading}
          style={{ padding: '10px 20px', background: '#c9a84c', color: '#0d0d0f', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: downloading ? 0.7 : 1 }}>
          ⬇ {downloading ? 'Generando...' : 'DESCARGAR PDF'}
        </button>
        <button onClick={onClose}
          style={{ padding: '10px 20px', background: '#2a2a30', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ✕ CERRAR
        </button>
      </div>

      {/* Invoice — white background for PDF capture */}
      <div ref={invoiceRef} onClick={e => e.stopPropagation()}
        style={{ background: '#fff', width: '100%', maxWidth: 720, borderRadius: 12, padding: '48px 48px 40px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#1a1a1a', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 24, borderBottom: '2px solid #c9a84c', marginBottom: 32 }}>
          <div>
            <div style={{ width: 48, height: 48, background: '#c9a84c', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#0d0d0f', marginBottom: 8 }}>
              {companyName.charAt(0)}
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#0d0d0f' }}>{companyName}</div>
            <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{companySubtitle}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#0d0d0f', letterSpacing: 2 }}>FACTURA</div>
            <div style={{ color: '#c9a84c', fontWeight: 700, fontSize: 16, marginTop: 4 }}>#{invoiceNo}</div>
            <div style={{ color: '#888', fontSize: 12, marginTop: 8 }}>Emisión: {issueDate}</div>
            {dueDate  && <div style={{ color: '#888', fontSize: 12 }}>Vencimiento: {dueDate}</div>}
            {paidDate && <div style={{ color: '#22a05a', fontSize: 12, fontWeight: 600 }}>Pagado: {paidDate}</div>}
          </div>
        </div>

        {/* Client + Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
          <div>
            <div style={label}>Facturado a</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{clientName}</div>
            {invoice.contacts?.email && <div style={{ color: '#666', fontSize: 13 }}>{invoice.contacts.email}</div>}
            {invoice.contacts?.phone && <div style={{ color: '#666', fontSize: 13 }}>{invoice.contacts.phone}</div>}
          </div>
          <div>
            <div style={label}>Estado</div>
            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
              background: isPaid ? '#dcfce7' : '#fef3c7',
              color: isPaid ? '#16a34a' : '#d97706',
              border: `1px solid ${isPaid ? '#86efac' : '#fcd34d'}` }}>
              {isPaid ? '✓ PAGADA' : '⏳ POR COBRAR'}
            </span>
            {invoice.transaction_id && (
              <div style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
                ID Transacción: <strong style={{ color: '#444' }}>{invoice.transaction_id}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Line items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#0d0d0f' }}>
              <th style={{ ...cell, textAlign: 'left', color: '#fff', fontSize: 11, letterSpacing: 1, borderBottom: 'none', fontWeight: 700 }}>DESCRIPCIÓN</th>
              <th style={{ ...cell, textAlign: 'right', color: '#fff', fontSize: 11, letterSpacing: 1, borderBottom: 'none', fontWeight: 700 }}>IMPORTE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cell}>{invoice.service_name ?? 'Servicio de detailing'}</td>
              <td style={{ ...cell, textAlign: 'right' }}>AED {subtotal.toFixed(2)}</td>
            </tr>
            {discount > 0 && (
              <tr>
                <td style={{ ...cell, color: '#666' }}>Descuento</td>
                <td style={{ ...cell, textAlign: 'right', color: '#ef4444' }}>– AED {discount.toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginBottom: 40 }}>
          <div style={{ display: 'flex', gap: 64, fontSize: 13, color: '#666' }}>
            <span>Subtotal</span><span>AED {(subtotal - discount).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', gap: 64, fontSize: 13, color: '#666' }}>
            <span>VAT (5%)</span><span>AED {tax.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', gap: 64, fontSize: 18, fontWeight: 900, color: '#0d0d0f', paddingTop: 8, borderTop: '2px solid #0d0d0f', marginTop: 4 }}>
            <span>TOTAL</span>
            <span style={{ color: '#c9a84c' }}>AED {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #eee', paddingTop: 20, textAlign: 'center', color: '#aaa', fontSize: 11 }}>
          <div style={{ fontWeight: 700, color: '#888', marginBottom: 4 }}>{companyName} · {companySubtitle}</div>
          <div>Gracias por confiar en nosotros</div>
          {invoice.transaction_id && (
            <div style={{ marginTop: 8, color: '#c9a84c', fontWeight: 600 }}>Comprobante: {invoice.transaction_id}</div>
          )}
        </div>
      </div>
    </div>
  )
}
