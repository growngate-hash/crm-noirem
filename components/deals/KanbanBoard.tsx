'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import type { Deal, DealStage, Contact, Company } from '@/types'
import DealCard from './DealCard'
import DealModal from './DealModal'
import { Plus } from 'lucide-react'

function Column({ stage, deals, onNewDeal, onEdit, onDelete }: {
  stage: DealStage
  deals: Deal[]
  onNewDeal: (stageId: string) => void
  onEdit: (d: Deal) => void
  onDelete: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const total = deals.reduce((s, d) => s + (d.value ?? 0), 0)
  const fmtVal = (v: number) => v >= 1000 ? `AED ${(v/1000).toFixed(0)}K` : `AED ${v}`

  return (
    <div ref={setNodeRef} style={{ width:260, flexShrink:0, display:'flex', flexDirection:'column', maxHeight:'100%' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, padding:'12px 14px', background:`${stage.color}0f`, border:`1px solid ${stage.color}20`, borderRadius:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:stage.color }} />
          <span style={{ fontSize:12, fontWeight:700, color:'#F0EDE8' }}>{stage.name}</span>
          <span style={{ fontSize:10, color:'#8A8A9A', background:'rgba(255,255,255,.05)', padding:'1px 7px', borderRadius:99 }}>{deals.length}</span>
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:stage.color }}>{fmtVal(total)}</span>
      </div>

      {/* Cards */}
      <div className="scroll" style={{ flex:1, display:'flex', flexDirection:'column', gap:8, padding:'2px 2px', overflowY:'auto', minHeight:100, background: isOver ? `${stage.color}08` : 'transparent', borderRadius:10, transition:'background .15s' }}>
        <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map(deal => (
            <DealCard key={deal.id} deal={deal} onEdit={onEdit} onDelete={onDelete} stageColor={stage.color} />
          ))}
        </SortableContext>
        <button className="btn" onClick={() => onNewDeal(stage.id)} style={{ background:'rgba(255,255,255,.02)', border:'1px dashed rgba(212,175,55,.15)', color:'#8A8A9A', width:'100%', padding:10, fontSize:11, borderRadius:8, marginTop:4 }}>
          <Plus size={11} />Add deal
        </button>
      </div>
    </div>
  )
}

interface Props {
  initialDeals: Deal[]
  stages: DealStage[]
  contacts: Contact[]
  companies: Company[]
}

export default function KanbanBoard({ initialDeals, stages, contacts, companies }: Props) {
  const supabase = createClient()
  const [deals, setDeals] = useState<Deal[]>(initialDeals)
  const [showModal, setShowModal] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)
  const [defaultStage, setDefaultStage] = useState<string | undefined>()
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('deals').select('*, contact:contacts(name,tier), company:companies(name), stage:deal_stages(name,color)').order('position')
    setDeals((data ?? []) as Deal[])
  }, [supabase])

  useEffect(() => {
    const ch = supabase.channel('deals-board')
      .on('postgres_changes', { event:'*', schema:'public', table:'deals' }, refresh)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, refresh])

  function getDealStage(dealId: string) {
    return stages.find(s => deals.find(d => d.id === dealId)?.stage_id === s.id)
  }

  async function onDragStart({ active }: DragStartEvent) {
    setActiveDeal(deals.find(d => d.id === active.id) ?? null)
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveDeal(null)
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const activeDeal = deals.find(d => d.id === activeId)
    if (!activeDeal) return

    // Dropped on a column (stage id)
    const isOverStage = stages.some(s => s.id === overId)
    const targetStageId = isOverStage ? overId : deals.find(d => d.id === overId)?.stage_id

    if (!targetStageId || targetStageId === activeDeal.stage_id) return

    const stageName = stages.find(s => s.id === targetStageId)?.name ?? 'Unknown'
    setDeals(prev => prev.map(d => d.id === activeId ? { ...d, stage_id: targetStageId } : d))
    await supabase.from('deals').update({ stage_id: targetStageId }).eq('id', activeId)
    await supabase.from('activities').insert({
      deal_id: activeId,
      contact_id: activeDeal.contact_id,
      type: 'deal_moved',
      title: `Deal moved to ${stageName}: ${activeDeal.title}`,
    })
  }

  async function deleteDeal(id: string) {
    await supabase.from('deals').delete().eq('id', id)
    setDeals(prev => prev.filter(d => d.id !== id))
  }

  const stageDeals = (stageId: string) => deals.filter(d => d.stage_id === stageId)
  const totalPipeline = deals.reduce((s, d) => s + (d.value ?? 0), 0)
  const fmtVal = (v: number) => v >= 1000000 ? `AED ${(v/1000000).toFixed(1)}M` : v >= 1000 ? `AED ${(v/1000).toFixed(0)}K` : `AED ${v}`

  return (
    <>
      {(showModal || editDeal) && (
        <DealModal
          deal={editDeal}
          stages={stages}
          contacts={contacts}
          companies={companies}
          defaultStageId={defaultStage}
          onClose={() => { setShowModal(false); setEditDeal(null) }}
          onSaved={refresh}
        />
      )}

      <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Toolbar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 26px 0', flexShrink:0 }}>
          <div style={{ fontSize:11, color:'#8A8A9A' }}>
            <span style={{ fontWeight:700, color:'#D4AF37', fontSize:14 }}>{deals.length}</span> deals ·{' '}
            <span style={{ fontWeight:700, color:'#22C55E' }}>{fmtVal(totalPipeline)}</span> pipeline
          </div>
          <button className="btn btng" onClick={() => { setEditDeal(null); setDefaultStage(stages[0]?.id); setShowModal(true) }}>
            <Plus size={12} color="#0B0E11" />New Deal
          </button>
        </div>

        {/* Board */}
        <div style={{ flex:1, overflow:'auto', padding:26, paddingTop:16 }}>
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div style={{ display:'flex', gap:14, height:'100%', alignItems:'flex-start' }}>
              {stages.sort((a,b) => a.position - b.position).map(stage => (
                <Column
                  key={stage.id}
                  stage={stage}
                  deals={stageDeals(stage.id)}
                  onNewDeal={(sid) => { setEditDeal(null); setDefaultStage(sid); setShowModal(true) }}
                  onEdit={(d) => { setEditDeal(d); setShowModal(false) }}
                  onDelete={deleteDeal}
                />
              ))}
            </div>
            <DragOverlay>
              {activeDeal && (
                <div style={{ opacity:.9, transform:'rotate(2deg)' }}>
                  <DealCard
                    deal={activeDeal}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    stageColor={stages.find(s => s.id === activeDeal.stage_id)?.color ?? '#D4AF37'}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </>
  )
}
