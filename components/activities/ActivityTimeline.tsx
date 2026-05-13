'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Activity, ActivityType } from '@/types'
import { Phone, Mail, MessageSquare, Users, Clock, TrendingUp, Briefcase, Plus, ChevronDown } from 'lucide-react'

const ACT_ICONS: Record<ActivityType, React.ElementType> = {
  call: Phone, email: Mail, note: MessageSquare, meeting: Users,
  task: Clock, deal_moved: TrendingUp, deal_created: Briefcase, contact_created: Users,
}
const ACT_COLORS: Record<ActivityType, string> = {
  call:'#00D4FF', email:'#A78BFA', note:'#D4AF37', meeting:'#22C55E',
  task:'#F59E0B', deal_moved:'#D4AF37', deal_created:'#22C55E', contact_created:'#00D4FF',
}
const ACT_LABELS: Record<ActivityType, string> = {
  call:'Call', email:'Email', note:'Note', meeting:'Meeting',
  task:'Task', deal_moved:'Deal Moved', deal_created:'Deal Created', contact_created:'Contact Created',
}

interface Props { contactId?: string; dealId?: string; companyId?: string }

export default function ActivityTimeline({ contactId, dealId, companyId }: Props) {
  const supabase = createClient()
  const [activities, setActivities] = useState<Activity[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState<ActivityType>('note')
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    let q = supabase.from('activities').select('*, contact:contacts(name), deal:deals(title)').order('created_at', { ascending:false }).limit(20)
    if (contactId) q = q.eq('contact_id', contactId)
    else if (dealId) q = q.eq('deal_id', dealId)
    else if (companyId) q = q.eq('company_id', companyId)
    const { data } = await q
    setActivities((data ?? []) as Activity[])
  }, [supabase, contactId, dealId, companyId])

  useEffect(() => { load() }, [load])

  async function addActivity() {
    if (!newTitle.trim()) return
    setSaving(true)
    await supabase.from('activities').insert({
      contact_id: contactId ?? null,
      deal_id: dealId ?? null,
      company_id: companyId ?? null,
      type: newType,
      title: newTitle,
      description: newDesc || null,
    })
    setNewTitle('')
    setNewDesc('')
    setShowAdd(false)
    setSaving(false)
    load()
  }

  const USER_TYPES: ActivityType[] = ['note','call','email','meeting','task']

  return (
    <div>
      {/* Add activity */}
      {showAdd ? (
        <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(212,175,55,.12)', borderRadius:10, padding:14, marginBottom:14 }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
            {USER_TYPES.map(t => {
              const on = newType === t
              return (
                <button key={t} onClick={() => setNewType(t)} className="btn" style={{ padding:'4px 10px', fontSize:10, background: on?`${ACT_COLORS[t]}18`:'rgba(255,255,255,.03)', color: on?ACT_COLORS[t]:'#8A8A9A', border:`1px solid ${on?ACT_COLORS[t]:'rgba(255,255,255,.06)'}` }}>
                  {ACT_LABELS[t]}
                </button>
              )
            })}
          </div>
          <input className="inp" style={{ marginBottom:8, fontSize:12 }} placeholder="Title / Subject" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <textarea className="inp" rows={2} style={{ marginBottom:10, fontSize:12, resize:'none', fontFamily:'Montserrat,sans-serif' }} placeholder="Notes (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btnq" style={{ flex:1, padding:8, fontSize:11 }} onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btng" style={{ flex:2, padding:8, fontSize:11 }} onClick={addActivity} disabled={saving}>{saving?'Saving…':'Log Activity'}</button>
          </div>
        </div>
      ) : (
        <button className="btn btnq" style={{ width:'100%', marginBottom:14, padding:9, fontSize:11 }} onClick={() => setShowAdd(true)}>
          <Plus size={11} />Log Activity
        </button>
      )}

      {/* Timeline */}
      {activities.length === 0 ? (
        <div style={{ textAlign:'center', padding:'24px 0', color:'#4A4A5A', fontSize:11 }}>No activity yet</div>
      ) : (
        <div style={{ position:'relative' }}>
          <div style={{ position:'absolute', left:14, top:0, bottom:0, width:1, background:'rgba(212,175,55,.1)' }} />
          {activities.map((a, i) => {
            const Icon = ACT_ICONS[a.type] ?? MessageSquare
            const col = ACT_COLORS[a.type] ?? '#D4AF37'
            const date = new Date(a.created_at)
            const timeStr = date.toLocaleDateString('en-AE', { month:'short', day:'numeric' }) + ' · ' + date.toLocaleTimeString('en-AE', { hour:'2-digit', minute:'2-digit' })
            return (
              <div key={a.id} style={{ display:'flex', gap:14, paddingBottom:16, paddingLeft:0, position:'relative' }}>
                <div style={{ width:28, height:28, borderRadius:9, background:`${col}18`, border:`1px solid ${col}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, zIndex:1 }}>
                  <Icon size={12} color={col} strokeWidth={1.8} />
                </div>
                <div style={{ flex:1, paddingTop:4 }}>
                  <div style={{ fontSize:11, fontWeight:600, marginBottom:2 }}>{a.title}</div>
                  {a.description && <div style={{ fontSize:10, color:'#8A8A9A', marginBottom:3 }}>{a.description}</div>}
                  <div style={{ fontSize:9, color:'#4A4A5A', letterSpacing:.3 }}>{timeStr}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
