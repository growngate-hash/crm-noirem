'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, X, CheckCheck, Package, Calendar, DollarSign, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Notification = {
  id: string
  type: 'booking' | 'stock' | 'payment' | 'system'
  title: string
  message: string
  read: boolean
  link?: string
  created_at: string
}

const TYPE_COLOR: Record<string, string> = {
  booking: '#c9a84c',
  stock:   '#ff4f4f',
  payment: '#34d399',
  system:  '#888580',
}

function TypeIcon({ type }: { type: string }) {
  const size = 14
  if (type === 'booking') return <Calendar size={size} />
  if (type === 'stock')   return <Package  size={size} />
  if (type === 'payment') return <DollarSign size={size} />
  return <Settings size={size} />
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationsPanel() {
  const [open, setOpen]                     = useState(false)
  const [notifications, setNotifications]   = useState<Notification[]>([])
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.read).length

  async function fetchNotifications() {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data as Notification[])
  }

  useEffect(() => {
    fetchNotifications()

    const supabase = createClient()
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function markRead(id: string) {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
        }}
      >
        <Bell size={16} color={open ? 'var(--gold)' : 'var(--text2)'} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 14, height: 14, borderRadius: 7,
            background: 'var(--red)', border: '1.5px solid var(--bg2)',
            fontSize: 9, fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', fontFamily: 'Outfit,sans-serif',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 12px)', right: 0, zIndex: 300,
          width: 360, background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          overflow: 'hidden', fontFamily: 'Outfit,sans-serif',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                Notifications
              </span>
              {unread > 0 && (
                <span style={{
                  background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
                  color: 'var(--gold)', fontSize: 10, fontWeight: 700,
                  padding: '1px 7px', borderRadius: 99,
                }}>
                  {unread} new
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  title="Mark all as read"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text2)', padding: 4, borderRadius: 6, display: 'flex',
                  }}
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text2)', padding: 4, borderRadius: 6, display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🔔</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Sin notificaciones</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>Aquí aparecerán alertas de reservas y stock</div>
              </div>
            ) : notifications.map(n => (
              <div
                key={n.id}
                onClick={() => { if (!n.read) markRead(n.id) }}
                style={{
                  display: 'flex', gap: 12, padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: n.read ? 'transparent' : 'rgba(201,168,76,0.04)',
                  cursor: n.read ? 'default' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {/* Type icon */}
                <div style={{
                  flexShrink: 0, width: 30, height: 30, borderRadius: 8,
                  background: `${TYPE_COLOR[n.type] ?? '#888'}18`,
                  border: `1px solid ${TYPE_COLOR[n.type] ?? '#888'}35`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: TYPE_COLOR[n.type] ?? '#888',
                }}>
                  <TypeIcon type={n.type} />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text2)', flexShrink: 0 }}>
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  <p style={{
                    margin: '2px 0 0', fontSize: 11, color: 'var(--text2)', lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {n.message}
                  </p>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div style={{
                    flexShrink: 0, width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--gold)', marginTop: 6,
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
