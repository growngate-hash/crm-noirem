'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useLanguage } from '@/contexts/LanguageContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  User, Users, Plug, CreditCard, BarChart2,
  Save, Plus, Trash2, Check, X, Upload, Trash, Printer,
} from 'lucide-react'
import { PrintTemplatesSection } from '@/components/settings/PrintTemplatesSection'

type Section = 'profile' | 'team' | 'integrations' | 'plans' | 'billing' | 'print-templates'

// ─── permission types ──────────────────────────────────────────────────────────
type PermOps = { view: boolean; create?: boolean; edit?: boolean; delete?: boolean }
type Permissions = {
  dashboard: PermOps
  contacts:  PermOps
  services:  PermOps
  vehicles:  PermOps
  bookings:  PermOps
  finance:   PermOps
  reports:   PermOps
  settings:  PermOps
}
type TeamMember = { id: string; name: string; email: string; role: string }

const MOD_CFG = [
  { key: 'dashboard', label: 'Dashboard',       icon: '🏠', ops: ['view'] as string[] },
  { key: 'contacts',  label: 'Contactos',        icon: '👥', ops: ['view','create','edit','delete'] },
  { key: 'services',  label: 'Servicios e Inv.', icon: '🔧', ops: ['view','create','edit','delete'] },
  { key: 'vehicles',  label: 'Vehículos',        icon: '🚗', ops: ['view','create','edit','delete'] },
  { key: 'bookings',  label: 'Reservas',         icon: '📅', ops: ['view','create','edit','delete'] },
  { key: 'finance',   label: 'Finanzas',         icon: '💰', ops: ['view','create','edit','delete'] },
  { key: 'reports',   label: 'Reportes',         icon: '📊', ops: ['view'] },
  { key: 'settings',  label: 'Configuración',    icon: '⚙️', ops: ['view','create','edit','delete'] },
]

function defaultPermissions(role: string): Permissions {
  const all: PermOps = { view: true, create: true, edit: true, delete: true }
  if (role === 'Admin') {
    return {
      dashboard: { view: true }, contacts: { ...all }, services: { ...all },
      vehicles: { ...all }, bookings: { ...all }, finance: { ...all },
      reports: { view: true }, settings: { ...all },
    }
  }
  if (role === 'Manager') {
    const mgr: PermOps = { view: true, create: true, edit: true, delete: false }
    return {
      dashboard: { view: true }, contacts: { ...mgr }, services: { ...mgr },
      vehicles: { ...mgr }, bookings: { ...mgr }, finance: { ...mgr },
      reports: { view: true }, settings: { view: false, create: false, edit: false, delete: false },
    }
  }
  return {
    dashboard: { view: true },
    contacts:  { view: false, create: false, edit: false, delete: false },
    services:  { view: false, create: false, edit: false, delete: false },
    vehicles:  { view: true,  create: false, edit: false, delete: false },
    bookings:  { view: true,  create: false, edit: false, delete: false },
    finance:   { view: false, create: false, edit: false, delete: false },
    reports:   { view: false },
    settings:  { view: false, create: false, edit: false, delete: false },
  }
}

function permChipInfo(perms: Permissions | undefined): { type: 'all' | 'readonly' | 'chips'; chips: string[] } {
  if (!perms) return { type: 'chips', chips: [] }
  const isTotal = MOD_CFG.every(m => {
    const p = perms[m.key as keyof Permissions] as any
    if (!p?.view) return false
    if (m.ops.includes('create') && !p.create) return false
    if (m.ops.includes('edit')   && !p.edit)   return false
    if (m.ops.includes('delete') && !p.delete) return false
    return true
  })
  if (isTotal) return { type: 'all', chips: [] }
  const allView = MOD_CFG.every(m => (perms[m.key as keyof Permissions] as any)?.view)
  const noWrite = Object.values(perms).every((p: any) => !p.create && !p.edit && !p.delete)
  if (allView && noWrite) return { type: 'readonly', chips: [] }
  const labelMap: Record<string, string> = {
    dashboard:'Dashboard', contacts:'Contactos', services:'Servicios',
    vehicles:'Vehículos', bookings:'Reservas', finance:'Finanzas',
    reports:'Reportes', settings:'Config.',
  }
  const chips = MOD_CFG.filter(m => (perms[m.key as keyof Permissions] as any)?.view).map(m => labelMap[m.key])
  return { type: 'chips', chips }
}

// ─── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{
      width: 36, height: 20, borderRadius: 20, cursor: 'pointer', position: 'relative',
      background: on ? '#c9a84c' : '#2a2a2e',
      border: `1px solid ${on ? '#c9a84c' : 'rgba(255,255,255,0.1)'}`,
      transition: 'all 0.2s ease', flexShrink: 0, display: 'inline-block',
    }}>
      <div style={{
        position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%',
        background: 'white', transition: 'transform 0.2s ease',
        transform: `translateX(${on ? 18 : 2}px)`,
      }}/>
    </div>
  )
}

// ─── Permission chips ──────────────────────────────────────────────────────────
function PermChips({ perms }: { perms: Permissions | undefined }) {
  const info = permChipInfo(perms)
  if (info.type === 'all') return (
    <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 20, padding: '2px 8px' }}>Acceso total</span>
  )
  if (info.type === 'readonly') return (
    <span style={{ fontSize: 10, fontWeight: 700, color: '#888580', background: 'rgba(136,133,128,0.12)', border: '1px solid rgba(136,133,128,0.2)', borderRadius: 20, padding: '2px 8px' }}>Solo lectura</span>
  )
  if (info.chips.length === 0) return <span style={{ fontSize: 11, color: '#3a3836' }}>Sin acceso</span>
  const visible = info.chips.slice(0, 3)
  const extra = info.chips.length - 3
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {visible.map(c => (
        <span key={c} style={{ fontSize: 10, color: '#c9a84c', background: 'rgba(201,168,76,0.12)', borderRadius: 20, padding: '2px 8px' }}>{c}</span>
      ))}
      {extra > 0 && <span style={{ fontSize: 10, color: '#888580' }}>+{extra} más</span>}
    </div>
  )
}

// ─── Preset button ─────────────────────────────────────────────────────────────
function PresetBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: '6px 12px', borderRadius: 6, fontFamily: 'Outfit,sans-serif', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
        border: `1px solid ${hov ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`,
        background: '#1a1a1e', color: hov ? '#c9a84c' : '#888580' }}>
      {label}
    </button>
  )
}

// ─── Permissions modal ─────────────────────────────────────────────────────────
function PermissionsModal({
  member, currentRole, currentPerms, onSave, onClose,
}: {
  member: TeamMember; currentRole: string; currentPerms: Permissions
  onSave: (role: string, perms: Permissions) => void; onClose: () => void
}) {
  const [editRole, setEditRole] = useState(currentRole)
  const [editPerms, setEditPerms] = useState<Permissions>(JSON.parse(JSON.stringify(currentPerms)))
  const [saving, setSaving] = useState(false)

  const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
    Admin:      { bg: 'rgba(201,168,76,0.15)',  color: '#c9a84c' },
    Manager:    { bg: 'rgba(0,212,170,0.15)',   color: '#00d4aa' },
    Technician: { bg: 'rgba(136,133,128,0.15)', color: '#888580' },
  }

  function toggleOp(modKey: string, op: string) {
    setEditPerms(prev => {
      const clone: Permissions = JSON.parse(JSON.stringify(prev))
      const mod = clone[modKey as keyof Permissions] as any
      mod[op] = !mod[op]
      return clone
    })
  }

  function applyPreset(role: string) {
    setEditRole(role)
    setEditPerms(defaultPermissions(role))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await createClient().from('user_permissions').upsert({
        user_id: member.id,
        role: editRole.toLowerCase(),
        permissions: { ...editPerms, _email: member.email },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } catch { /* local state still updated */ }
    onSave(editRole, editPerms)
    setSaving(false)
  }

  const sep = <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', margin: '16px 0' }}/>

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, width: '100%', maxWidth: 660, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f0ede8' }}>Permisos de {member.name}</div>
            <div style={{ fontSize: 12, color: '#888580', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              Rol actual:
              <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 8px',
                background: ROLE_STYLE[currentRole]?.bg ?? 'transparent',
                color: ROLE_STYLE[currentRole]?.color ?? '#888580' }}>
                {currentRole.toUpperCase()}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888580', padding: 4, display: 'flex' }}><X size={18}/></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Role pills */}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Rol del usuario</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['Admin','Manager','Technician'] as const).map(r => {
              const rs = ROLE_STYLE[r]; const active = editRole === r
              return (
                <button key={r} onClick={() => setEditRole(r)}
                  style={{ padding: '8px 18px', borderRadius: 20, fontFamily: 'Outfit,sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                    border: `1px solid ${active ? rs.color : 'rgba(255,255,255,0.1)'}`,
                    background: active ? rs.bg : 'transparent', color: active ? rs.color : '#888580' }}>
                  {r.toUpperCase()}
                </button>
              )
            })}
          </div>

          {sep}

          {/* Modules table */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f0ede8', marginBottom: 12 }}>Módulos del sistema</div>
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            {/* header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 72px 72px', background: '#1a1a1e', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '8px 12px', alignItems: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Módulo</div>
              {['Ver','Crear','Editar','Eliminar'].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 600, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>{h}</div>
              ))}
            </div>
            {MOD_CFG.map((mod, i) => {
              const p = editPerms[mod.key as keyof Permissions] as any
              return (
                <div key={mod.key} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 72px 72px',
                  background: i % 2 === 0 ? '#1a1a1e' : '#141416', padding: '10px 12px', alignItems: 'center',
                  borderBottom: i < MOD_CFG.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{mod.icon}</span>
                    <span style={{ fontSize: 13, color: '#f0ede8', fontWeight: 500 }}>{mod.label}</span>
                  </div>
                  {(['view','create','edit','delete'] as const).map(op => (
                    <div key={op} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {mod.ops.includes(op)
                        ? <Toggle on={!!p[op]} onChange={() => toggleOp(mod.key, op)}/>
                        : <span style={{ fontSize: 14, color: '#3a3836' }}>—</span>}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {sep}

          {/* Presets */}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#888580', marginBottom: 10 }}>Presets rápidos</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <PresetBtn label="Aplicar Admin"      onClick={() => applyPreset('Admin')}/>
            <PresetBtn label="Aplicar Manager"    onClick={() => applyPreset('Manager')}/>
            <PresetBtn label="Aplicar Technician" onClick={() => applyPreset('Technician')}/>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: '#c9a84c', color: '#0d0d0f',
              fontSize: 13, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar Permisos'}
          </button>
          <button onClick={onClose}
            style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
              color: '#888580', fontSize: 13, fontWeight: 600, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── nav ──────────────────────────────────────────────────────────────────────
const NAV: { key: Section; label: string; icon: any }[] = [
  { key: 'profile',         label: 'Profile',              icon: User },
  { key: 'team',            label: 'Team & Roles',         icon: Users },
  { key: 'integrations',   label: 'Integrations',         icon: Plug },
  { key: 'plans',           label: 'Plans',                icon: BarChart2 },
  { key: 'billing',         label: 'Billing',              icon: CreditCard },
  { key: 'print-templates', label: 'Plantillas Impresión', icon: Printer },
]

const MOCK_INVOICES = [
  { date: '2026-04-01', amount: 129, status: 'Paid' },
  { date: '2026-03-01', amount: 129, status: 'Paid' },
  { date: '2026-02-01', amount: 129, status: 'Paid' },
]

const INTEGRATIONS = [
  { key: 'whatsapp', name: 'WhatsApp Business', desc: 'Send automated messages to clients', color: '#22c55e', initials: 'WA' },
  { key: 'stripe',   name: 'Stripe',            desc: 'Accept online payments',             color: '#818cf8', initials: 'ST' },
  { key: 'gcal',     name: 'Google Calendar',   desc: 'Sync bookings to calendar',          color: '#00d4aa', initials: 'GC' },
  { key: 'gmail',    name: 'Gmail',             desc: 'Send invoices via email',            color: '#ff4f4f', initials: 'GM' },
  { key: 'zapier',   name: 'Zapier',            desc: 'Connect 5,000+ apps',               color: '#ffa800', initials: 'ZP' },
]

// ─── Profile section ──────────────────────────────────────────────────────────
function ProfileSection() {
  const { t } = useLanguage()
  const { logoUrl, setLogoUrl, setCompanyName: setCtxName, setCompanySubtitle: setCtxSub } = useCompany()
  const [form, setForm] = useState({ businessName:'SAFFI', companySubtitle:'LUXURY DETAILING', country:'UAE', currency:'AED', timezone:'Asia/Dubai', language:'EN' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    createClient()
      .from('company_settings')
      .select('key, value')
      .in('key', ['company_name', 'company_subtitle'])
      .then(({ data }) => {
        if (!data) return
        const patch: Partial<typeof form> = {}
        data.forEach(row => {
          if (row.key === 'company_name' && row.value) patch.businessName = row.value
          if (row.key === 'company_subtitle' && row.value) patch.companySubtitle = row.value
        })
        if (Object.keys(patch).length) setForm(prev => ({ ...prev, ...patch }))
      })
  }, [])
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success'|'error' } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string, type: 'success'|'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function save() {
    const supabase = createClient()
    await Promise.all([
      supabase.from('company_settings').upsert({ key: 'company_name', value: form.businessName }, { onConflict: 'key' }),
      supabase.from('company_settings').upsert({ key: 'company_subtitle', value: form.companySubtitle }, { onConflict: 'key' }),
    ])
    setCtxName(form.businessName.toUpperCase())
    setCtxSub(form.companySubtitle.toUpperCase())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function processFile(file: File) {
    if (file.size > 2 * 1024 * 1024) { showToast('El archivo es muy grande. Máximo 2MB', 'error'); return }
    const validTypes = ['image/png', 'image/svg+xml', 'image/jpeg']
    if (!validTypes.includes(file.type)) { showToast('Formato no válido. Usa PNG, SVG o JPG', 'error'); return }
    const reader = new FileReader()
    reader.onload = e => setLogoPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setPendingFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setIsDragging(true) }
  function handleDragLeave() { setIsDragging(false) }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  async function uploadLogo() {
    if (!pendingFile) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = pendingFile.name.split('.').pop()
      const fileName = `company-logo-${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('company-assets')
        .upload(fileName, pendingFile, { cacheControl: '3600', upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(fileName)
      const url = urlData.publicUrl
      await supabase.from('company_settings').upsert(
        { key: 'logo_url', value: url, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
      setLogoUrl(url)
      setLogoPreview(null)
      setPendingFile(null)
      showToast('Logo actualizado correctamente ✓', 'success')
    } catch {
      showToast('Error al subir el logo. Intenta de nuevo', 'error')
    }
    setUploading(false)
  }

  function cancelPreview() { setLogoPreview(null); setPendingFile(null) }

  async function removeLogo() {
    if (!window.confirm('¿Eliminar el logo actual?')) return
    const supabase = createClient()
    await supabase.from('company_settings').upsert(
      { key: 'logo_url', value: null, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    setLogoUrl(null)
    showToast('Logo eliminado', 'success')
  }

  const displayLogo = logoPreview ?? logoUrl
  const hasPending = !!pendingFile

  return (
    <div style={{ maxWidth: 540 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t('businessProfile')}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 24 }}>{t('generalSettings')}</div>

      {/* ── Logo upload ── */}
      <div style={{ marginBottom: 28, padding: 20, background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f0ede8', marginBottom: 16 }}>{t('companyLogo')}</div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* Logo square */}
          <div style={{ width: 72, height: 72, borderRadius: 14, border: '2px solid rgba(201,168,76,0.3)',
            background: displayLogo ? 'transparent' : '#c9a84c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0 }}>
            {displayLogo
              ? <img src={displayLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              : <span style={{ fontSize: 28, fontWeight: 900, color: '#0d0d0f' }}>{form.businessName.charAt(0)}</span>}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hasPending ? (
              <>
                <button onClick={uploadLogo} disabled={uploading}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#c9a84c', color: '#0d0d0f',
                    fontSize: 12, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: uploading ? 'default' : 'pointer',
                    opacity: uploading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Upload size={12}/>{uploading ? t('saving') : t('saveLogo')}
                </button>
                <button onClick={cancelPreview}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                    color: '#888580', fontSize: 12, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>
                  {t('cancel')}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => fileRef.current?.click()}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(201,168,76,0.25)', background: '#141416',
                    color: '#c9a84c', fontSize: 12, fontWeight: 600, fontFamily: 'Outfit,sans-serif', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Upload size={12}/> {t('uploadLogo')}
                </button>
                {logoUrl && (
                  <button onClick={removeLogo}
                    style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: 'transparent',
                      color: '#ff4f4f', fontSize: 12, fontFamily: 'Outfit,sans-serif', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trash size={12}/> {t('removeLogo')}
                  </button>
                )}
              </>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/jpeg" style={{ display: 'none' }} onChange={handleFileInput}/>
            <div style={{ fontSize: 11, color: '#3a3836', marginTop: 2 }}>Formatos: PNG, SVG, JPG · Máximo 2MB · 256×256px recomendado</div>
          </div>
        </div>

        {/* Drag & drop zone */}
        <div
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{ marginTop: 16, padding: 20, borderRadius: 10, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
            border: `2px dashed ${isDragging ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.25)'}`,
            background: isDragging ? 'rgba(201,168,76,0.05)' : '#141416' }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>📁</div>
          <div style={{ fontSize: 13, color: '#888580' }}>Arrastra tu logo aquí</div>
          <div style={{ fontSize: 11, color: '#3a3836', marginTop: 4 }}>o haz clic para seleccionar</div>
        </div>
      </div>

      {/* ── Form fields ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="label">{t('businessName')}</label>
            <input className="inp" value={form.businessName} placeholder="ej. SAFFI" onChange={e => setForm({...form, businessName: e.target.value})}/>
          </div>
          <div>
            <label className="label">SUBTÍTULO</label>
            <input className="inp" value={form.companySubtitle} placeholder="ej. LUXURY DETAILING" onChange={e => setForm({...form, companySubtitle: e.target.value})}/>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="label">{t('country')}</label>
            <select className="inp" value={form.country} onChange={e => setForm({...form, country: e.target.value})}>
              <option value="UAE">United Arab Emirates</option>
              <option value="SA">Saudi Arabia</option>
              <option value="KW">Kuwait</option>
            </select>
          </div>
          <div>
            <label className="label">{t('currency')}</label>
            <select className="inp" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
              <option value="AED">AED — UAE Dirham</option>
              <option value="SAR">SAR — Saudi Riyal</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </div>
          <div>
            <label className="label">{t('timezone')}</label>
            <select className="inp" value={form.timezone} onChange={e => setForm({...form, timezone: e.target.value})}>
              <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
              <option value="Asia/Riyadh">Asia/Riyadh (UTC+3)</option>
              <option value="Europe/London">Europe/London (UTC+0)</option>
            </select>
          </div>
          <div>
            <label className="label">{t('interfaceLanguage')}</label>
            <select className="inp" value={form.language} onChange={e => setForm({...form, language: e.target.value})}>
              <option value="EN">English</option>
              <option value="ES">Spanish</option>
              <option value="AR">Arabic</option>
            </select>
          </div>
        </div>
        <button className="btn btn-gold" onClick={save} style={{ width: 160, justifyContent: 'center', marginTop: 8 }}>
          {saved ? <><Check size={13}/> Saved!</> : <><Save size={13}/> {t('saveChanges')}</>}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 900, padding: '12px 18px', borderRadius: 10,
          fontSize: 13, fontWeight: 600, fontFamily: 'Outfit,sans-serif', color: '#fff',
          background: toast.type === 'success' ? 'rgba(34,197,94,0.95)' : 'rgba(255,79,79,0.95)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ─── Team section ─────────────────────────────────────────────────────────────
function TeamSection({ isAdmin, currentUserEmail }: { isAdmin: boolean; currentUserEmail: string }) {
  const { t } = useLanguage()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [permsMap, setPermsMap] = useState<Record<string, { role: string; permissions: Permissions }>>({})
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [invite, setInvite] = useState({ email: '', role: 'Technician' })
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function load() {
      try {
        const [res, { data: { user } }] = await Promise.all([
          fetch('/api/team'),
          createClient().auth.getUser(),
        ])
        const json = await res.json()
        console.log('[TeamSection] /api/team response:', json)

        if (json.error || !json.team) {
          console.warn('[TeamSection] API error:', json.error)
          return
        }

        const map: Record<string, { role: string; permissions: Permissions }> = {}
        json.team.forEach((m: any) => {
          map[m.id] = {
            role: m.role,
            permissions: m.permissions ?? defaultPermissions(m.role),
          }
        })

        let members: TeamMember[] = json.team
        // If current user has no permissions row yet (e.g. project owner), add them at top
        if (user && !map[user.id]) {
          const role = 'Admin'
          members = [
            { id: user.id, name: user.email?.split('@')[0] ?? 'You', email: user.email ?? '', role },
            ...members,
          ]
          map[user.id] = { role, permissions: defaultPermissions(role) }
        }

        setTeam(members)
        setPermsMap(map)
      } catch (e) {
        console.error('[TeamSection] fetch error:', e)
      }
    }
    load()
  }, [])

  async function removeTeam(id: string) {
    if (!window.confirm('¿Eliminar este miembro del equipo? Esta acción no se puede deshacer.')) return

    const res = await fetch('/api/delete-member', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    })
    const result = await res.json()

    if (result.error) {
      showToast(`Error al eliminar: ${result.error}`, 'error')
      return
    }

    setTeam(prev => prev.filter(m => m.id !== id))
    setPermsMap(prev => { const c = { ...prev }; delete c[id]; return c })
    showToast('Miembro eliminado correctamente', 'success')
  }

  async function sendInvite() {
    if (!invite.email.trim()) return
    setInviteSending(true)
    setInviteError('')
    setInviteSuccess('')
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invite.email.trim(), role: invite.role }),
      })
      const result = await res.json()
      if (result.error) {
        setInviteError(result.error)
        return
      }
      setInviteSuccess(`Invitación enviada a ${invite.email}`)
      setTimeout(async () => {
        setInvite({ email: '', role: 'Technician' })
        setShowInvite(false)
        setInviteSuccess('')
        // Reload team from API so the new member appears with real auth data
        const teamRes = await fetch('/api/team')
        const teamJson = await teamRes.json()
        if (teamJson.team) {
          const map: Record<string, { role: string; permissions: Permissions }> = {}
          teamJson.team.forEach((m: any) => {
            map[m.id] = { role: m.role, permissions: m.permissions ?? defaultPermissions(m.role) }
          })
          setTeam(teamJson.team)
          setPermsMap(map)
        }
      }, 1800)
    } catch (e: any) {
      setInviteError(`Error de red: ${e.message}`)
    } finally {
      setInviteSending(false)
    }
  }

  function handlePermsSaved(memberId: string, role: string, perms: Permissions) {
    setPermsMap(prev => ({ ...prev, [memberId]: { role, permissions: perms } }))
    setTeam(prev => prev.map(m => m.id === memberId ? { ...m, role } : m))
    setEditingMember(null)
  }

  const ROLE_COLOR: Record<string, string> = { Admin: '#c9a84c', Manager: '#00d4aa', Technician: '#888580' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isAdmin ? 20 : 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t('teamRoles')}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{team.length} {t('members')}</div>
        </div>
        {isAdmin && <button className="btn btn-gold" onClick={() => setShowInvite(true)}><Plus size={13}/> {t('inviteMember')}</button>}
      </div>

      {!isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(136,133,128,0.08)', border: '1px solid rgba(136,133,128,0.15)',
          marginBottom: 20, fontSize: 12, color: '#888580' }}>
          🔒 <span>{t('readOnly')}</span>
        </div>
      )}

      <div className="glass" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {([t('name'), t('email'), t('role'), t('permissions'), ...(isAdmin ? [t('actions')] : [])] as string[]).map(h => (
                <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {team.map(m => {
              const mp = permsMap[m.id]
              return (
                <tr key={m.id} className="row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{m.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)' }}>{m.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="badge" style={{ background: `${ROLE_COLOR[m.role]}18`, color: ROLE_COLOR[m.role], border: `1px solid ${ROLE_COLOR[m.role]}30` }}>{m.role}</span>
                  </td>
                  <td style={{ padding: '12px 16px', minWidth: 170 }}>
                    <PermChips perms={mp?.permissions}/>
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setEditingMember(m)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6,
                            border: '1px solid rgba(201,168,76,0.25)', background: '#1a1a1e', color: '#c9a84c',
                            fontSize: 11, fontFamily: 'Outfit,sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          ✏️ {t('permissions')}
                        </button>
                        {m.email !== currentUserEmail && (
                          <button onClick={() => removeTeam(m.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6,
                              border: '1px solid rgba(255,79,79,0.25)', background: 'rgba(255,79,79,0.1)', color: '#ff4f4f',
                              fontSize: 11, fontFamily: 'Outfit,sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            🗑 {t('remove')}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <Modal title={t('inviteMember')} onClose={() => setShowInvite(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">{t('email')}</label>
              <input className="inp" type="email" placeholder="colleague@noirem.ae" value={invite.email} onChange={e => setInvite({...invite, email: e.target.value})}/>
            </div>
            <div>
              <label className="label">{t('role')}</label>
              <select className="inp" value={invite.role} onChange={e => setInvite({...invite, role: e.target.value})}>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Technician">Technician</option>
              </select>
            </div>
            <div style={{ fontSize: 11, color: '#888580', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, padding: '8px 12px' }}>
              Se asignarán permisos predeterminados según el rol seleccionado.
            </div>
            {inviteError && (
              <div style={{ fontSize: 12, color: '#ff4f4f', background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div style={{ fontSize: 12, color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                ✓ {inviteSuccess}
              </div>
            )}
            <button className="btn btn-gold" onClick={sendInvite} disabled={inviteSending || !invite.email.trim()} style={{ width: '100%', justifyContent: 'center', opacity: (inviteSending || !invite.email.trim()) ? 0.6 : 1 }}>
              {inviteSending ? 'Enviando…' : t('inviteUser')}
            </button>
          </div>
        </Modal>
      )}

      {/* Permissions modal */}
      {editingMember && (
        <PermissionsModal
          member={editingMember}
          currentRole={permsMap[editingMember.id]?.role ?? editingMember.role}
          currentPerms={permsMap[editingMember.id]?.permissions ?? defaultPermissions(editingMember.role)}
          onSave={(role, perms) => handlePermsSaved(editingMember.id, role, perms)}
          onClose={() => setEditingMember(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 900,
          padding: '12px 18px', borderRadius: 10,
          fontSize: 13, fontWeight: 600, fontFamily: 'Outfit,sans-serif', color: '#fff',
          background: toast.type === 'success' ? 'rgba(34,197,94,0.95)' : 'rgba(255,79,79,0.95)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ─── Integrations section ─────────────────────────────────────────────────────
function IntegrationsSection() {
  const { t } = useLanguage()
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ whatsapp: true, stripe: false, gcal: true, gmail: false, zapier: false })
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t('integrations')}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 24 }}>{t('connectApps')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {INTEGRATIONS.map(int => (
          <div key={int.key} className="glass" style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${int.color}18`, border: `1px solid ${int.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: int.color, flexShrink: 0 }}>
              {int.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{int.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{int.desc}</div>
            </div>
            <button onClick={() => setEnabled({...enabled, [int.key]: !enabled[int.key]})}
              style={{ width: 42, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, background: enabled[int.key] ? 'var(--gold)' : 'var(--bg3)', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: 3, left: enabled[int.key] ? 22 : 3, width: 16, height: 16, borderRadius: '50%', background: enabled[int.key] ? '#000' : 'var(--text2)', transition: 'left 0.2s' }}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Plans section ────────────────────────────────────────────────────────────
function PlansSection() {
  const { t } = useLanguage()
  const plans = [
    { name: 'Starter', price: '$49', period: '/mo', features: ['Up to 100 contacts','1 user','Basic reports','Email support'], cta: 'Select Plan', ctaClass: 'btn btn-ghost', highlight: false },
    { name: 'Pro', price: '$129', period: '/mo', features: ['Unlimited contacts','5 users','Advanced reports','All integrations','Priority support'], cta: 'Current Plan', ctaClass: 'btn btn-gold', highlight: true },
    { name: 'Enterprise', price: '$349', period: '/mo', features: ['Unlimited everything','Unlimited users','Custom reports','Dedicated manager','SLA guarantee'], cta: 'Contact Sales', ctaClass: 'btn btn-ghost', highlight: false },
  ]
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t('plans')}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 24 }}>{t('choosePlan')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {plans.map(p => (
          <div key={p.name} className="glass" style={{ padding: 24, border: p.highlight ? '1px solid var(--gold-b)' : undefined, position: 'relative' }}>
            {p.highlight && (
              <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--gold)', color: '#000', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current</div>
            )}
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 20 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: p.highlight ? 'var(--gold)' : 'var(--text)' }}>{p.price}</span>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{p.period}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {p.features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <Check size={12} color="var(--cyan)"/>{f}
                </div>
              ))}
            </div>
            <button className={p.ctaClass} style={{ width: '100%', justifyContent: 'center' }}>{p.cta}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Billing section ──────────────────────────────────────────────────────────
function BillingSection() {
  const { t } = useLanguage()
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t('billing')}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 24 }}>{t('manageSub')}</div>
      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{t('currentSubscription')}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Pro Plan</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>$129 / month · Renews June 1, 2026</div>
          </div>
          <span className="badge status-completed">Active</span>
        </div>
      </div>
      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{t('paymentMethod')}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>VISA</div>
            <div>
              <div style={{ fontSize: 13 }}>•••• •••• •••• 4242</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Expires 12/2028</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm">Update</button>
        </div>
      </div>
      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('invoiceHistory')}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[t('date'), t('amount'), t('status'), t('download')].map(h => (
                <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_INVOICES.map((inv, i) => (
              <tr key={i} className="row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{new Date(inv.date).toLocaleDateString('en-AE', { year: 'numeric', month: 'long' })}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>${inv.amount}</td>
                <td style={{ padding: '12px 16px' }}><StatusBadge status={inv.status}/></td>
                <td style={{ padding: '12px 16px' }}><button className="btn btn-ghost btn-sm">PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { t } = useLanguage()
  const isMobile = useIsMobile()
  const [activeSection, setActiveSection] = useState<Section>('profile')
  const { isAdmin, isManager, currentUserEmail } = usePermissions()

  const visibleNav = NAV.filter(item => {
    if (item.key === 'plans' || item.key === 'billing') return isAdmin
    if (item.key === 'integrations') return isAdmin || isManager
    return true
  })

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':      return <ProfileSection/>
      case 'team':         return <TeamSection isAdmin={isAdmin} currentUserEmail={currentUserEmail}/>
      case 'integrations': return <IntegrationsSection/>
      case 'plans':            return <PlansSection/>
      case 'billing':          return <BillingSection/>
      case 'print-templates':  return <PrintTemplatesSection/>
    }
  }

  const NAV_LABEL: Record<string, string> = {
    profile:          t('profile'),
    team:             t('teamRoles'),
    integrations:     t('integrations'),
    plans:            t('plans'),
    billing:          t('billing'),
    'print-templates': 'Plantillas',
  }

  return (
    <div className="page-pad" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 24 }}>

      {/* Nav — vertical on desktop, horizontal scroll on mobile */}
      <div style={isMobile
        ? { flexShrink: 0 }
        : { width: 160, flexShrink: 0 }
      }>
        {!isMobile && (
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{t('settings')}</div>
        )}
        <div className={isMobile ? 'tabs-scroll' : undefined}
          style={isMobile ? {} : { display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visibleNav.map(item => {
            const Icon = item.icon; const active = activeSection === item.key
            return (
              <button key={item.key} onClick={() => setActiveSection(item.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 9,
                  padding: isMobile ? '7px 14px' : '9px 12px',
                  borderRadius: isMobile ? 20 : 8,
                  border: isMobile ? `1px solid ${active ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}` : 'none',
                  cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: active ? 700 : 500,
                  background: active ? 'var(--gold-dim)' : 'transparent',
                  color: active ? 'var(--gold)' : 'var(--text2)',
                  textAlign: 'left', whiteSpace: 'nowrap',
                  ...(isMobile ? {} : { width: '100%' }),
                  transition: 'all 0.15s' }}>
                <Icon size={14}/>{NAV_LABEL[item.key] ?? item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="scroll" style={{ flex: 1, paddingRight: isMobile ? 0 : 4 }}>
        {renderContent()}
      </div>
    </div>
  )
}
