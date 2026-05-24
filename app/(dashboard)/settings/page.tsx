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

// ─── WhatsApp config panel ─────────────────────────────────────────────────────
const WA_DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
const WA_DEFAULT_HOURS = WA_DAYS.map((label, i) => ({
  day: i, label, is_open: i < 5, start_time: '08:00', end_time: '18:00',
}))
type WaTab = 'connection' | 'hours' | 'zones' | 'welcome'
const WA_TABS: { key: WaTab; label: string }[] = [
  { key: 'connection', label: 'Conexión'   },
  { key: 'hours',      label: 'Horario'    },
  { key: 'zones',      label: 'Zonas'      },
  { key: 'welcome',    label: 'Bienvenida' },
]

function WhatsAppConfigPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<WaTab>('connection')

  // Conexión — Embedded Signup
  const [waConnected,    setWaConnected]    = useState(false)
  const [waPhoneNumber,  setWaPhoneNumber]  = useState<string | null>(null)
  const [connectingWA,   setConnectingWA]   = useState(false)

  // Horario
  const [hours,       setHours]       = useState(WA_DEFAULT_HOURS.map(d => ({ ...d })))
  const [savingHours, setSavingHours] = useState(false)

  // Zonas
  const [zones,       setZones]       = useState<{ id?: string; name: string; is_active: boolean }[]>([])
  const [newZone,     setNewZone]     = useState('')
  const [savingZones, setSavingZones] = useState(false)

  // Bienvenida
  const [welcome,       setWelcome]       = useState('')
  const [savingWelcome, setSavingWelcome] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success'|'error' } | null>(null)
  function showToast(msg: string, type: 'success'|'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const [{ data: settings }, { data: hoursData }, { data: zonesData }, { data: waConfig }] = await Promise.all([
        sb.from('company_settings').select('key,value').in('key', ['whatsapp_welcome_message']),
        sb.from('business_hours').select('*').order('day_of_week'),
        sb.from('coverage_zones').select('*').order('created_at'),
        sb.from('whatsapp_configs').select('connected,phone_number').eq('connected', true).maybeSingle(),
      ])
      if (settings) {
        settings.forEach((s: any) => {
          if (s.key === 'whatsapp_welcome_message') setWelcome(s.value ?? '')
        })
      }
      if (waConfig) {
        setWaConnected(waConfig.connected ?? false)
        setWaPhoneNumber(waConfig.phone_number ?? null)
      }
      if (hoursData && (hoursData as any[]).length > 0) {
        setHours(WA_DEFAULT_HOURS.map((d, i) => {
          const row = (hoursData as any[]).find(h => h.day_of_week === i)
          return row ? { ...d, is_open: row.is_open, start_time: row.start_time ?? '08:00', end_time: row.end_time ?? '18:00' } : d
        }))
      }
      if (zonesData) {
        setZones((zonesData as any[]).map(z => ({ id: z.id, name: z.name, is_active: z.is_active ?? true })))
      }
    }
    load()

    // Cargar FB SDK
    const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
    if (FB_APP_ID && !(window as any).FB) {
      ;(window as any).fbAsyncInit = function () {
        ;(window as any).FB.init({
          appId: FB_APP_ID,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v19.0',
        })
      }
      const script = document.createElement('script')
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }
  }, [])

  const handleFBResponse = async (code: string) => {
    try {
      const res  = await fetch('/api/whatsapp/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.success) {
        setWaConnected(true)
        setWaPhoneNumber(data.phone_number ?? null)
        showToast('WhatsApp conectado correctamente ✓', 'success')
      } else {
        showToast('Error al conectar: ' + (data.error ?? 'desconocido'), 'error')
      }
    } catch (err: any) {
      showToast('Error de red: ' + err.message, 'error')
    } finally {
      setConnectingWA(false)
    }
  }

  function launchEmbeddedSignup() {
    const FB = (window as any).FB
    if (!FB) { showToast('SDK de Facebook no cargado. Recarga la página.', 'error'); return }
    setConnectingWA(true)
    FB.login(
      (response: any) => {
        if (response.authResponse?.code) {
          handleFBResponse(response.authResponse.code)
        } else {
          showToast('Conexión cancelada', 'error')
          setConnectingWA(false)
        }
      },
      {
        config_id: '2776902419375291',
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureName: 'whatsapp_embedded_signup',
          sessionInfoVersion: '3',
        },
      }
    )
  }

  async function disconnectWhatsApp() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    await sb.from('whatsapp_configs').update({ connected: false }).eq('user_id', user.id)
    setWaConnected(false)
    setWaPhoneNumber(null)
    showToast('WhatsApp desconectado', 'success')
  }

  async function saveHours() {
    setSavingHours(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    const userId = user?.id
    const { error: delError } = await sb.from('business_hours').delete().eq('user_id', userId)
    if (delError) { setSavingHours(false); showToast('Error: ' + delError.message, 'error'); return }
    const rows = hours.map(h => ({ user_id: userId, day_of_week: h.day, day_label: h.label, is_open: h.is_open, start_time: h.start_time, end_time: h.end_time }))
    const { error: insError } = await sb.from('business_hours').insert(rows)
    setSavingHours(false)
    if (insError) { showToast('Error: ' + insError.message, 'error'); return }
    showToast('Horario guardado ✓', 'success')
  }

  async function addZone() {
    const name = newZone.trim()
    if (!name) return
    const { data, error } = await createClient().from('coverage_zones').insert({ name, is_active: true }).select().single()
    if (error) { showToast('Error: ' + error.message, 'error'); return }
    setZones(prev => [...prev, { id: (data as any).id, name: (data as any).name, is_active: true }])
    setNewZone('')
  }

  async function deleteZone(idx: number) {
    const z = zones[idx]
    if (z.id) await createClient().from('coverage_zones').delete().eq('id', z.id)
    setZones(prev => prev.filter((_, i) => i !== idx))
  }

  async function saveZones() {
    setSavingZones(true)
    const sb = createClient()
    await Promise.all(zones.filter(z => z.id).map(z =>
      sb.from('coverage_zones').update({ is_active: z.is_active }).eq('id', z.id!)
    ))
    setSavingZones(false)
    showToast('Zonas guardadas ✓', 'success')
  }

  async function saveWelcome() {
    setSavingWelcome(true)
    await createClient().from('company_settings').upsert({ key: 'whatsapp_welcome_message', value: welcome }, { onConflict: 'key' })
    setSavingWelcome(false)
    showToast('Mensaje guardado ✓', 'success')
  }

  const INP: React.CSSProperties = { width:'100%', background:'#1a1a1e', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'10px 12px', color:'#f0ede8', fontSize:13, fontFamily:'Outfit,sans-serif', outline:'none', boxSizing:'border-box' }
  const LBL: React.CSSProperties = { display:'block', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'#888580', marginBottom:6 }
  function SaveBtn({ loading, onClick, label = 'Guardar' }: { loading: boolean; onClick: () => void; label?: string }) {
    return (
      <button onClick={onClick} disabled={loading}
        style={{ padding:'10px 20px', borderRadius:8, border:'none', background:'#c9a84c', color:'#0d0d0f', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:loading?'default':'pointer', opacity:loading?0.7:1 }}>
        {loading ? 'Guardando…' : label}
      </button>
    )
  }

  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:700 }} onClick={onClose} />
      <div style={{ position:'fixed', top:0, right:0, width:500, height:'100vh', zIndex:800, background:'#141416', borderLeft:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#22c55e' }}>WA</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'#f0ede8' }}>WhatsApp Business</div>
              <div style={{ fontSize:11, color:'#888580' }}>Configuración y automatización</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#888580', padding:4, display:'flex' }}><X size={18}/></button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'0 24px', flexShrink:0 }}>
          {WA_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ background:'transparent', border:'none', cursor:'pointer', padding:'12px 14px', fontSize:12, fontFamily:'Outfit,sans-serif', fontWeight:tab===t.key?700:400, color:tab===t.key?'#c9a84c':'#888580', borderBottom:`2px solid ${tab===t.key?'#c9a84c':'transparent'}`, marginBottom:-1, transition:'all 0.15s', whiteSpace:'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:24 }}>

          {/* ── Conexión (Embedded Signup) ── */}
          {tab === 'connection' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              {waConnected ? (
                /* ── Estado: Conectado ── */
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 18px', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.25)', borderRadius:10 }}>
                    <span style={{ fontSize:22 }}>✅</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#22c55e' }}>WhatsApp conectado</div>
                      {waPhoneNumber && (
                        <div style={{ fontSize:12, color:'#888580', marginTop:3 }}>{waPhoneNumber}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'#888580', lineHeight:1.6 }}>
                    Tu número está activo y recibiendo mensajes. El bot responderá automáticamente a tus clientes.
                  </div>
                  <button onClick={disconnectWhatsApp}
                    style={{ alignSelf:'flex-start', padding:'9px 18px', borderRadius:8, border:'1px solid rgba(255,79,79,0.3)', background:'transparent', color:'#ff4f4f', fontSize:12, fontWeight:600, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
                    Desconectar
                  </button>
                </div>
              ) : (
                /* ── Estado: No conectado ── */
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div style={{ fontSize:12, color:'#888580', lineHeight:1.7 }}>
                    Conecta tu número de WhatsApp Business directamente desde Meta. No necesitas copiar tokens ni IDs manualmente.
                  </div>
                  <div style={{ padding:'16px 18px', background:'#1a1a1e', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, fontSize:11, color:'#888580', lineHeight:1.7 }}>
                    <strong style={{ color:'#f0ede8' }}>Cómo funciona:</strong><br/>
                    1. Haz clic en "Conectar WhatsApp"<br/>
                    2. Inicia sesión con tu cuenta de Meta Business<br/>
                    3. Selecciona tu número de WhatsApp Business<br/>
                    4. ¡Listo! El token se guarda automáticamente
                  </div>
                  <button onClick={launchEmbeddedSignup} disabled={connectingWA}
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'13px 20px', borderRadius:10, border:'none', background: connectingWA ? '#2a4a2a' : '#25D366', color:'#fff', fontSize:14, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor: connectingWA ? 'default' : 'pointer', opacity: connectingWA ? 0.7 : 1, transition:'all 0.15s' }}>
                    {/* WhatsApp icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {connectingWA ? 'Conectando…' : 'Conectar WhatsApp'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Horario ── */}
          {tab === 'hours' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ fontSize:12, color:'#888580' }}>Define el horario de atención. Fuera de este horario el bot puede responder automáticamente.</div>
              <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'110px 64px 1fr 1fr', background:'#1a1a1e', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'8px 14px', gap:8 }}>
                  {['Día','Abierto','Apertura','Cierre'].map(h => (
                    <div key={h} style={{ fontSize:10, fontWeight:600, color:'#888580', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</div>
                  ))}
                </div>
                {hours.map((h, i) => (
                  <div key={h.day} style={{ display:'grid', gridTemplateColumns:'110px 64px 1fr 1fr', alignItems:'center', padding:'10px 14px', gap:8, background:i%2===0?'#141416':'#1a1a1e', borderBottom:i<6?'1px solid rgba(255,255,255,0.04)':'none' }}>
                    <span style={{ fontSize:13, color:'#f0ede8', fontWeight:500 }}>{h.label}</span>
                    <Toggle on={h.is_open} onChange={() => setHours(prev => prev.map((d,j) => j===i ? {...d, is_open:!d.is_open} : d))} />
                    <input type="time" disabled={!h.is_open} value={h.start_time}
                      onChange={e => setHours(prev => prev.map((d,j) => j===i ? {...d, start_time:e.target.value} : d))}
                      style={{ ...INP, padding:'6px 10px', fontSize:12, opacity:h.is_open?1:0.3, cursor:h.is_open?'auto':'not-allowed' }} />
                    <input type="time" disabled={!h.is_open} value={h.end_time}
                      onChange={e => setHours(prev => prev.map((d,j) => j===i ? {...d, end_time:e.target.value} : d))}
                      style={{ ...INP, padding:'6px 10px', fontSize:12, opacity:h.is_open?1:0.3, cursor:h.is_open?'auto':'not-allowed' }} />
                  </div>
                ))}
              </div>
              <div><SaveBtn loading={savingHours} onClick={saveHours} label="Guardar horario" /></div>
            </div>
          )}

          {/* ── Zonas ── */}
          {tab === 'zones' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ fontSize:12, color:'#888580' }}>Define las zonas de cobertura del servicio.</div>
              <div style={{ display:'flex', gap:8 }}>
                <input style={{ ...INP, flex:1 }} value={newZone} onChange={e => setNewZone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addZone()}
                  placeholder="ej. Dubai Marina, Palm Jumeirah…" />
                <button onClick={addZone}
                  style={{ padding:'10px 16px', borderRadius:8, border:'none', background:'#c9a84c', color:'#0d0d0f', fontSize:12, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer', whiteSpace:'nowrap' }}>
                  + Agregar
                </button>
              </div>
              {zones.length === 0 ? (
                <div style={{ padding:'24px 0', textAlign:'center', color:'#3a3836', fontSize:12 }}>No hay zonas. Agrega la primera zona de cobertura.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {zones.map((z, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#1a1a1e', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8 }}>
                      <Toggle on={z.is_active} onChange={() => setZones(prev => prev.map((x,j) => j===i ? {...x, is_active:!x.is_active} : x))} />
                      <span style={{ flex:1, fontSize:13, color:z.is_active?'#f0ede8':'#888580' }}>{z.name}</span>
                      <button onClick={() => deleteZone(i)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#3a3836', padding:4, display:'flex', alignItems:'center', transition:'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color='#ff4f4f')}
                        onMouseLeave={e => (e.currentTarget.style.color='#3a3836')}>
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div><SaveBtn loading={savingZones} onClick={saveZones} label="Guardar zonas" /></div>
            </div>
          )}

          {/* ── Bienvenida ── */}
          {tab === 'welcome' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ fontSize:12, color:'#888580' }}>Este mensaje se envía automáticamente cuando un cliente escribe por primera vez.</div>
              <div>
                <label style={LBL}>Mensaje de bienvenida</label>
                <textarea value={welcome} onChange={e => setWelcome(e.target.value)} rows={8}
                  placeholder="Hola! 👋 Bienvenido a NOIREM. ¿En qué podemos ayudarte hoy?"
                  style={{ ...INP, resize:'vertical', lineHeight:1.6 }} />
              </div>
              <div style={{ padding:'12px 16px', background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.15)', borderRadius:8, fontSize:11, color:'#888580', lineHeight:1.7 }}>
                <strong style={{ color:'#c9a84c' }}>Variables disponibles:</strong><br/>
                <code style={{ color:'#c9a84c' }}>{'{{name}}'}</code> — Nombre del cliente &nbsp;|&nbsp;
                <code style={{ color:'#c9a84c' }}>{'{{date}}'}</code> — Fecha actual &nbsp;|&nbsp;
                <code style={{ color:'#c9a84c' }}>{'{{company}}'}</code> — Tu empresa
              </div>
              <div><SaveBtn loading={savingWelcome} onClick={saveWelcome} label="Guardar mensaje" /></div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:900, padding:'12px 18px', borderRadius:10, fontSize:13, fontWeight:600, fontFamily:'Outfit,sans-serif', color:'#fff', background:toast.type==='success'?'rgba(34,197,94,0.95)':'rgba(255,79,79,0.95)', boxShadow:'0 4px 20px rgba(0,0,0,0.4)', backdropFilter:'blur(8px)' }}>
          {toast.msg}
        </div>
      )}
    </>
  )
}

// ─── Integrations section ─────────────────────────────────────────────────────
function IntegrationsSection() {
  const { t } = useLanguage()
  const [enabled,     setEnabled]     = useState<Record<string, boolean>>({ whatsapp: true, stripe: false, gcal: true, gmail: false, zapier: false })
  const [showWAPanel, setShowWAPanel] = useState(false)
  return (
    <div>
      <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{t('integrations')}</div>
      <div style={{ fontSize:12, color:'var(--text2)', marginBottom:24 }}>{t('connectApps')}</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {INTEGRATIONS.map(int => (
          <div key={int.key} className="glass" style={{ padding:18, display:'flex', gap:14, alignItems:'center', cursor:int.key==='whatsapp'?'pointer':'default', transition:'border-color 0.15s' }}
            onClick={() => int.key === 'whatsapp' && setShowWAPanel(true)}>
            <div style={{ width:44, height:44, borderRadius:10, background:`${int.color}18`, border:`1px solid ${int.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:int.color, flexShrink:0 }}>
              {int.initials}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:3 }}>{int.name}</div>
              <div style={{ fontSize:11, color:'var(--text2)' }}>
                {int.key === 'whatsapp' ? 'Clic para configurar →' : int.desc}
              </div>
            </div>
            {int.key !== 'whatsapp' ? (
              <button onClick={e => { e.stopPropagation(); setEnabled(p => ({...p, [int.key]:!p[int.key]})) }}
                style={{ width:42, height:22, borderRadius:99, border:'none', cursor:'pointer', position:'relative', flexShrink:0, background:enabled[int.key]?'var(--gold)':'var(--bg3)', transition:'background 0.2s' }}>
                <div style={{ position:'absolute', top:3, left:enabled[int.key]?22:3, width:16, height:16, borderRadius:'50%', background:enabled[int.key]?'#000':'var(--text2)', transition:'left 0.2s' }}/>
              </button>
            ) : (
              <span style={{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:99, background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)', color:'#22c55e', whiteSpace:'nowrap' }}>ACTIVO</span>
            )}
          </div>
        ))}
      </div>
      {showWAPanel && <WhatsAppConfigPanel onClose={() => setShowWAPanel(false)} />}
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
