'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TemplateConfig {
  company_name: string
  company_subtitle: string
  company_address: string
  company_phone: string
  company_email: string
  company_website: string
  company_trn: string
  accent_color: string
  show_vat: boolean
  show_trn: boolean
  footer_text: string
  invoice_prefix: string
  payment_terms: string
  bank_details: string
  logo_url: string
}

const DEFAULTS: TemplateConfig = {
  company_name: 'NOIREM CAR CARE',
  company_subtitle: 'LUXURY DETAILING',
  company_address: '',
  company_phone: '',
  company_email: '',
  company_website: '',
  company_trn: '',
  accent_color: '#c9a84c',
  show_vat: true,
  show_trn: true,
  footer_text: 'Gracias por confiar en nosotros',
  invoice_prefix: 'INV',
  payment_terms: 'Pago inmediato al completar el servicio',
  bank_details: '',
  logo_url: '',
}

function Field({ label, value, onChange, placeholder = '', type = 'text', hint = '' }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; hint?: string
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 14px',
          background: '#0d0d0f', border: '1px solid #2a2a30',
          borderRadius: 8, color: '#fff', fontSize: 13,
          outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif',
        }}
      />
      {hint && <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function ToggleRow({ label, value, onChange, hint = '' }: {
  label: string; value: boolean; onChange: (v: boolean) => void; hint?: string
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 12, padding: '12px 16px',
      background: '#0d0d0f', borderRadius: 8, border: '1px solid #2a2a30',
    }}>
      <div>
        <div style={{ color: '#f0ede8', fontSize: 13, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>{hint}</div>}
      </div>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, background: value ? '#c9a84c' : '#2a2a30',
          borderRadius: 12, cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3,
          left: value ? 23 : 3,
          width: 18, height: 18,
          background: '#fff', borderRadius: '50%',
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  )
}

function InvoicePreview({ t }: { t: TemplateConfig }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 48,
      fontFamily: 'Arial, sans-serif', color: '#1a1a1a', maxWidth: 700,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 32, paddingBottom: 20,
        borderBottom: `2px solid ${t.accent_color}`,
      }}>
        <div>
          <div style={{
            width: 48, height: 48, background: t.accent_color, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 8,
          }}>
            {t.company_name[0]}
          </div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{t.company_name}</div>
          <div style={{ color: '#888', fontSize: 12 }}>{t.company_subtitle}</div>
          {t.company_address && <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>{t.company_address}</div>}
          {t.company_phone   && <div style={{ color: '#666', fontSize: 11 }}>{t.company_phone}</div>}
          {t.company_email   && <div style={{ color: '#666', fontSize: 11 }}>{t.company_email}</div>}
          {t.show_trn && t.company_trn && (
            <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>TRN: {t.company_trn}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 900 }}>FACTURA</div>
          <div style={{ color: t.accent_color, fontWeight: 700, fontSize: 15 }}>#{t.invoice_prefix}-001</div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 8 }}>
            Fecha: {new Date().toLocaleDateString('es-ES')}
          </div>
        </div>
      </div>

      {/* Cliente ejemplo */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', color: '#888', marginBottom: 6 }}>FACTURADO A</div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Ahmed Al Mansouri</div>
        <div style={{ color: '#666', fontSize: 12 }}>ahmed@example.ae · +971 50 000 0000</div>
      </div>

      {/* Tabla */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <thead>
          <tr style={{ background: '#0d0d0f' }}>
            <th style={{ padding: '10px 14px', textAlign: 'left', color: '#fff', fontSize: 11, letterSpacing: '1px' }}>DESCRIPCIÓN</th>
            <th style={{ padding: '10px 14px', textAlign: 'right', color: '#fff', fontSize: 11, letterSpacing: '1px' }}>IMPORTE</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '12px 14px', fontSize: 13 }}>Detailing Luxury · 4 horas</td>
            <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13 }}>AED 500.00</td>
          </tr>
        </tbody>
      </table>

      {/* Totales */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 40, fontSize: 12, color: '#666' }}>
          <span>Subtotal</span><span>AED 500.00</span>
        </div>
        {t.show_vat && (
          <div style={{ display: 'flex', gap: 40, fontSize: 12, color: '#666' }}>
            <span>VAT (5%)</span><span>AED 25.00</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 40, fontSize: 16, fontWeight: 900, paddingTop: 8, borderTop: '2px solid #0d0d0f', marginTop: 4 }}>
          <span>TOTAL</span>
          <span style={{ color: t.accent_color }}>AED {t.show_vat ? '525.00' : '500.00'}</span>
        </div>
      </div>

      {/* Info adicional */}
      {t.payment_terms && (
        <div style={{ background: '#f9f9f9', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: '1px', marginBottom: 4 }}>TÉRMINOS DE PAGO</div>
          <div style={{ fontSize: 12, color: '#444' }}>{t.payment_terms}</div>
        </div>
      )}
      {t.bank_details && (
        <div style={{ background: '#f9f9f9', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: '1px', marginBottom: 4 }}>DATOS BANCARIOS</div>
          <div style={{ fontSize: 12, color: '#444' }}>{t.bank_details}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: 16, textAlign: 'center', color: '#aaa', fontSize: 11 }}>
        <div style={{ fontWeight: 700, color: '#888', marginBottom: 2 }}>{t.company_name} · {t.company_subtitle}</div>
        <div>{t.footer_text}</div>
      </div>
    </div>
  )
}

export function PrintTemplatesSection() {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')
  const [template, setTemplate] = useState<TemplateConfig>({ ...DEFAULTS })

  useEffect(() => {
    supabase
      .from('company_settings')
      .select('key, value')
      .in('key', [
        'template_company_name', 'template_company_subtitle',
        'template_address', 'template_phone', 'template_email',
        'template_website', 'template_trn', 'template_accent_color',
        'template_show_vat', 'template_show_trn', 'template_footer_text',
        'template_invoice_prefix', 'template_payment_terms', 'template_bank_details',
        'logo_url',
      ])
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, string> = {}
        data.forEach(d => { map[d.key] = d.value })
        setTemplate(prev => ({
          ...prev,
          company_name:     map.template_company_name     || prev.company_name,
          company_subtitle: map.template_company_subtitle || prev.company_subtitle,
          company_address:  map.template_address          || '',
          company_phone:    map.template_phone            || '',
          company_email:    map.template_email            || '',
          company_website:  map.template_website          || '',
          company_trn:      map.template_trn              || '',
          accent_color:     map.template_accent_color     || '#c9a84c',
          show_vat:         map.template_show_vat !== 'false',
          show_trn:         map.template_show_trn !== 'false',
          footer_text:      map.template_footer_text      || prev.footer_text,
          invoice_prefix:   map.template_invoice_prefix   || 'INV',
          payment_terms:    map.template_payment_terms    || prev.payment_terms,
          bank_details:     map.template_bank_details     || '',
          logo_url:         map.logo_url                  || '',
        }))
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    const entries = [
      { key: 'template_company_name',    value: template.company_name },
      { key: 'template_company_subtitle',value: template.company_subtitle },
      { key: 'template_address',         value: template.company_address },
      { key: 'template_phone',           value: template.company_phone },
      { key: 'template_email',           value: template.company_email },
      { key: 'template_website',         value: template.company_website },
      { key: 'template_trn',             value: template.company_trn },
      { key: 'template_accent_color',    value: template.accent_color },
      { key: 'template_show_vat',        value: String(template.show_vat) },
      { key: 'template_show_trn',        value: String(template.show_trn) },
      { key: 'template_footer_text',     value: template.footer_text },
      { key: 'template_invoice_prefix',  value: template.invoice_prefix },
      { key: 'template_payment_terms',   value: template.payment_terms },
      { key: 'template_bank_details',    value: template.bank_details },
    ]
    await Promise.all(
      entries.map(e => supabase.from('company_settings').upsert({ key: e.key, value: e.value }, { onConflict: 'key' }))
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const set = (patch: Partial<TemplateConfig>) => setTemplate(prev => ({ ...prev, ...patch }))

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: '#f0ede8', fontSize: 22, fontWeight: 800, margin: 0 }}>Plantillas de Impresión</h2>
          <p style={{ color: '#888580', fontSize: 13, marginTop: 4, margin: '4px 0 0' }}>
            Personaliza el diseño y contenido de tus facturas
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px', background: saved ? '#22c55e' : '#c9a84c',
            color: '#0d0d0f', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s',
            fontFamily: 'Outfit,sans-serif', flexShrink: 0,
          }}
        >
          {saving ? 'GUARDANDO...' : saved ? '✓ GUARDADO' : 'GUARDAR CAMBIOS'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['editor', 'preview'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px',
              background: activeTab === tab ? '#c9a84c' : '#1a1a1f',
              color: activeTab === tab ? '#0d0d0f' : '#888580',
              border: `1px solid ${activeTab === tab ? '#c9a84c' : '#2a2a30'}`,
              borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase',
              fontFamily: 'Outfit,sans-serif',
            }}
          >
            {tab === 'editor' ? '✏️ Editor' : '👁 Vista Previa'}
          </button>
        ))}
      </div>

      {activeTab === 'editor' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Columna izquierda — empresa */}
          <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 12, padding: 20 }}>
            <div style={{ color: '#c9a84c', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 16 }}>
              INFORMACIÓN DE LA EMPRESA
            </div>
            <Field label="NOMBRE DE LA EMPRESA" value={template.company_name}
              onChange={v => set({ company_name: v })} placeholder="NOIREM CAR CARE" />
            <Field label="SUBTÍTULO" value={template.company_subtitle}
              onChange={v => set({ company_subtitle: v })} placeholder="LUXURY DETAILING" />
            <Field label="DIRECCIÓN" value={template.company_address}
              onChange={v => set({ company_address: v })} placeholder="Dubai, UAE" />
            <Field label="TELÉFONO" value={template.company_phone}
              onChange={v => set({ company_phone: v })} placeholder="+971 XX XXX XXXX" />
            <Field label="EMAIL" value={template.company_email}
              onChange={v => set({ company_email: v })} placeholder="info@noirem.ae" />
            <Field label="SITIO WEB" value={template.company_website}
              onChange={v => set({ company_website: v })} placeholder="www.noirem.ae" />
            <Field label="TRN (Tax Registration Number)" value={template.company_trn}
              onChange={v => set({ company_trn: v })} placeholder="100-XXXX-XXXX-XXX"
              hint="Número de registro fiscal para facturas con VAT en Dubai" />
          </div>

          {/* Columna derecha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Visual */}
            <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 12, padding: 20 }}>
              <div style={{ color: '#c9a84c', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 16 }}>
                CONFIGURACIÓN VISUAL
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>COLOR DE ACENTO</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="color" value={template.accent_color}
                    onChange={e => set({ accent_color: e.target.value })}
                    style={{ width: 44, height: 44, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
                  <input type="text" value={template.accent_color}
                    onChange={e => set({ accent_color: e.target.value })}
                    style={{ flex: 1, padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Outfit,sans-serif' }} />
                </div>
              </div>

              <Field label="PREFIJO DE FACTURA" value={template.invoice_prefix}
                onChange={v => set({ invoice_prefix: v })} placeholder="INV" hint="Ej: INV-001, FACT-001" />

              <ToggleRow label="Mostrar VAT en factura" value={template.show_vat}
                onChange={v => set({ show_vat: v })} hint="Incluir línea de VAT 5% en el total" />
              <ToggleRow label="Mostrar TRN en factura" value={template.show_trn}
                onChange={v => set({ show_trn: v })} hint="Mostrar número de registro fiscal" />
            </div>

            {/* Textos */}
            <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 12, padding: 20 }}>
              <div style={{ color: '#c9a84c', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 16 }}>
                TEXTOS DE LA FACTURA
              </div>
              <Field label="TÉRMINOS DE PAGO" value={template.payment_terms}
                onChange={v => set({ payment_terms: v })} placeholder="Pago inmediato al completar el servicio" />
              <Field label="DATOS BANCARIOS" value={template.bank_details}
                onChange={v => set({ bank_details: v })} placeholder="Banco: ENBD · IBAN: AE..." />
              <Field label="PIE DE PÁGINA" value={template.footer_text}
                onChange={v => set({ footer_text: v })} placeholder="Gracias por confiar en nosotros" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <InvoicePreview t={template} />
      )}
    </div>
  )
}
