'use client'

import { useRef, useState, useEffect } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { createClient } from '@/lib/supabase/client'

interface Props {
  invoice: any
  onClose: () => void
}

interface TemplateConfig {
  company_name: string
  company_subtitle: string
  company_address: string
  company_phone: string
  company_email: string
  company_trn: string
  accent_color: string
  show_vat: boolean
  show_trn: boolean
  footer_text: string
  invoice_prefix: string
  payment_terms: string
  bank_details: string
}

export function InvoiceViewer({ invoice, onClose }: Props) {
  const { companyName, companySubtitle } = useCompany()
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [tpl, setTpl] = useState<TemplateConfig>({
    company_name:     companyName,
    company_subtitle: companySubtitle,
    company_address:  '',
    company_phone:    '',
    company_email:    '',
    company_trn:      '',
    accent_color:     '#c9a84c',
    show_vat:         true,
    show_trn:         true,
    footer_text:      'Gracias por confiar en nosotros',
    invoice_prefix:   'INV',
    payment_terms:    '',
    bank_details:     '',
  })

  useEffect(() => {
    createClient()
      .from('company_settings')
      .select('key, value')
      .like('key', 'template_%')
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, string> = {}
        data.forEach(d => { map[d.key] = d.value })
        setTpl(prev => ({
          ...prev,
          company_name:     map.template_company_name     || companyName,
          company_subtitle: map.template_company_subtitle || companySubtitle,
          company_address:  map.template_address          || '',
          company_phone:    map.template_phone            || '',
          company_email:    map.template_email            || '',
          company_trn:      map.template_trn              || '',
          accent_color:     map.template_accent_color     || '#c9a84c',
          show_vat:         map.template_show_vat !== 'false',
          show_trn:         map.template_show_trn !== 'false',
          footer_text:      map.template_footer_text      || prev.footer_text,
          invoice_prefix:   map.template_invoice_prefix   || 'INV',
          payment_terms:    map.template_payment_terms    || '',
          bank_details:     map.template_bank_details     || '',
        }))
      })
  }, [companyName, companySubtitle])

  const invoiceNo  = invoice.invoice_no ?? invoice.id?.slice(0, 8).toUpperCase()
  const issueDate  = new Date(invoice.issued_at ?? invoice.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
  const dueDate    = invoice.due_at ? new Date(invoice.due_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : null
  const paidDate   = invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : null
  const clientName = invoice.contacts?.name ?? invoice.contacts?.full_name ?? 'Cliente'
  const subtotal   = Number(invoice.subtotal ?? 0)
  const tax        = Number(invoice.tax ?? 0)
  const discount   = Number(invoice.discount ?? 0)
  const total      = Number(invoice.total ?? 0)
  const isPaid     = invoice.status === 'pagada'
  const isVoided   = invoice.status === 'anulada'

  async function handleDownload() {
    if (!invoiceRef.current) return
    setDownloading(true)
    try {
      const { default: jsPDF }       = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      const canvas  = await html2canvas(invoiceRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, w, h)
      pdf.save(`Factura-${invoiceNo}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  const cell: React.CSSProperties = { padding: '12px 16px', fontSize: 13, borderBottom: '1px solid #eee' }
  const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#888', textTransform: 'uppercase', marginBottom: 6 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 800, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '24px 16px' }}
      onClick={onClose}>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, width: '100%', maxWidth: 720, justifyContent: 'flex-end' }}
        onClick={e => e.stopPropagation()}>
        <button onClick={handleDownload} disabled={downloading}
          style={{ padding: '10px 20px', background: tpl.accent_color, color: '#0d0d0f', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: downloading ? 0.7 : 1 }}>
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

        {/* Banner factura anulada */}
        {isVoided && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16 }}>🚫</span>
            <div>
              <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 13 }}>FACTURA ANULADA</div>
              {invoice.void_reason && (
                <div style={{ color: 'rgba(239,68,68,0.7)', fontSize: 12, marginTop: 2 }}>Motivo: {invoice.void_reason}</div>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 24, borderBottom: `2px solid ${tpl.accent_color}`, marginBottom: 32 }}>
          <div>
            <div style={{ width: 48, height: 48, background: tpl.accent_color, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#0d0d0f', marginBottom: 8 }}>
              {tpl.company_name.charAt(0)}
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#0d0d0f' }}>{tpl.company_name}</div>
            <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{tpl.company_subtitle}</div>
            {tpl.company_address && <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>{tpl.company_address}</div>}
            {tpl.company_phone   && <div style={{ color: '#666', fontSize: 11 }}>{tpl.company_phone}</div>}
            {tpl.company_email   && <div style={{ color: '#666', fontSize: 11 }}>{tpl.company_email}</div>}
            {tpl.show_trn && tpl.company_trn && (
              <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>TRN: {tpl.company_trn}</div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#0d0d0f', letterSpacing: 2 }}>FACTURA</div>
            <div style={{ color: tpl.accent_color, fontWeight: 700, fontSize: 16, marginTop: 4 }}>#{invoiceNo}</div>
            <div style={{ color: '#888', fontSize: 12, marginTop: 8 }}>Emisión: {issueDate}</div>
            {dueDate  && <div style={{ color: '#888', fontSize: 12 }}>Vencimiento: {dueDate}</div>}
            {paidDate && <div style={{ color: '#22a05a', fontSize: 12, fontWeight: 600 }}>Pagado: {paidDate}</div>}
          </div>
        </div>

        {/* Client + Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
          <div>
            <div style={labelStyle}>Facturado a</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{clientName}</div>
            {invoice.contacts?.email && <div style={{ color: '#666', fontSize: 13 }}>{invoice.contacts.email}</div>}
            {invoice.contacts?.phone && <div style={{ color: '#666', fontSize: 13 }}>{invoice.contacts.phone}</div>}
          </div>
          <div>
            <div style={labelStyle}>Estado</div>
            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
              background: isPaid ? '#dcfce7' : '#fef3c7',
              color: isPaid ? '#16a34a' : '#d97706',
              border: `1px solid ${isPaid ? '#86efac' : '#fcd34d'}` }}>
              {isPaid ? '✓ PAGADA' : isVoided ? '🚫 ANULADA' : '⏳ POR COBRAR'}
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginBottom: tpl.payment_terms || tpl.bank_details ? 24 : 40 }}>
          <div style={{ display: 'flex', gap: 64, fontSize: 13, color: '#666' }}>
            <span>Subtotal</span><span>AED {(subtotal - discount).toFixed(2)}</span>
          </div>
          {tpl.show_vat && (
            <div style={{ display: 'flex', gap: 64, fontSize: 13, color: '#666' }}>
              <span>VAT (5%)</span><span>AED {tax.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 64, fontSize: 18, fontWeight: 900, color: '#0d0d0f', paddingTop: 8, borderTop: '2px solid #0d0d0f', marginTop: 4 }}>
            <span>TOTAL</span>
            <span style={{ color: tpl.accent_color }}>AED {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment terms & bank details */}
        {tpl.payment_terms && (
          <div style={{ background: '#f9f9f9', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: '1px', marginBottom: 4 }}>TÉRMINOS DE PAGO</div>
            <div style={{ fontSize: 12, color: '#444' }}>{tpl.payment_terms}</div>
          </div>
        )}
        {tpl.bank_details && (
          <div style={{ background: '#f9f9f9', borderRadius: 6, padding: '10px 14px', marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: '1px', marginBottom: 4 }}>DATOS BANCARIOS</div>
            <div style={{ fontSize: 12, color: '#444' }}>{tpl.bank_details}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #eee', paddingTop: 20, textAlign: 'center', color: '#aaa', fontSize: 11 }}>
          <div style={{ fontWeight: 700, color: '#888', marginBottom: 4 }}>{tpl.company_name} · {tpl.company_subtitle}</div>
          <div>{tpl.footer_text}</div>
          {invoice.transaction_id && (
            <div style={{ marginTop: 8, color: tpl.accent_color, fontWeight: 600 }}>Comprobante: {invoice.transaction_id}</div>
          )}
        </div>
      </div>
    </div>
  )
}
