'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Deal } from '@/types'
import { Edit2, Trash2, User, Calendar, TrendingUp } from 'lucide-react'

interface Props {
  deal: Deal
  onEdit: (d: Deal) => void
  onDelete: (id: string) => void
  stageColor: string
}

export default function DealCard({ deal, onEdit, onDelete, stageColor }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const fmtVal = (v: number) =>
    v >= 1000000 ? `AED ${(v/1000000).toFixed(1)}M`
    : v >= 1000 ? `AED ${(v/1000).toFixed(0)}K`
    : `AED ${v}`

  const mergedStyle = {
    ...style,
    padding:14,
    borderRadius:10,
    cursor:'grab',
    border:`1px solid rgba(212,175,55,.11)`,
    background:'rgba(16,21,28,.8)',
  }

  return (
    <div ref={setNodeRef} style={mergedStyle} {...attributes} {...listeners} className="glass">
      {/* Colour stripe */}
      <div style={{ height:2, borderRadius:1, background:stageColor, marginBottom:10, opacity:.8 }} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div style={{ fontSize:12, fontWeight:600, lineHeight:1.4, flex:1, marginRight:8 }}>{deal.title}</div>
        <div style={{ display:'flex', gap:4 }} onPointerDown={e => e.stopPropagation()}>
          <button onClick={e => { e.stopPropagation(); onEdit(deal) }} style={{ background:'rgba(212,175,55,.1)', border:'none', cursor:'pointer', width:22, height:22, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Edit2 size={10} color="#D4AF37" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(deal.id) }} style={{ background:'rgba(239,68,68,.1)', border:'none', cursor:'pointer', width:22, height:22, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Trash2 size={10} color="#EF4444" />
          </button>
        </div>
      </div>

      <div style={{ fontSize:18, fontWeight:800, color:'#D4AF37', marginBottom:10 }}>{fmtVal(deal.value)}</div>

      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {deal.contact && (
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'#8A8A9A' }}>
            <User size={10} color="#8A8A9A" />
            <span>{deal.contact.name}</span>
          </div>
        )}
        {deal.close_date && (
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'#8A8A9A' }}>
            <Calendar size={10} color="#8A8A9A" />
            <span>{new Date(deal.close_date).toLocaleDateString('en-AE', { month:'short', day:'numeric' })}</span>
          </div>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <TrendingUp size={10} color="#8A8A9A" />
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ fontSize:9, color:'#8A8A9A' }}>Probability</span>
              <span style={{ fontSize:9, color:stageColor, fontWeight:700 }}>{deal.probability}%</span>
            </div>
            <div className="prog"><div className="progf" style={{ width:`${deal.probability}%`, background:stageColor }} /></div>
          </div>
        </div>
      </div>
    </div>
  )
}
