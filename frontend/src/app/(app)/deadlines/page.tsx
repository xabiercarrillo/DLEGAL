'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { deadlinesApi, casesApi } from '@/lib/api'
import { formatDate, daysUntil, urgencyBadge } from '@/lib/utils'
import { useState } from 'react'
import {
  Clock, Plus, X, CheckCircle2, AlertTriangle, Filter,
  Scale, CalendarClock, Gavel, BookOpen, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'

const PRIORITY: Record<string,{ label:string; cls:string; order:number }> = {
  critical: { label:'Crítico', cls:'bg-rose-500/10 text-rose-600 border-rose-200',  order:0 },
  high:     { label:'Alto',    cls:'bg-gold-400/12 text-gold-700 border-gold-400/30', order:1 },
  medium:   { label:'Medio',   cls:'bg-ink-900/[0.05] text-ink-600 border-ink-900/10', order:2 },
  low:      { label:'Bajo',    cls:'bg-ink-900/[0.04] text-ink-500 border-ink-900/10', order:3 },
}
const COMMON_PLAZOS = [
  { label:'Contestación demanda civil (CPC Art.230)',    days:18 },
  { label:'Recurso de apelación civil (CPC Art.395)',    days:5  },
  { label:'Recurso de apelación laboral',                days:5  },
  { label:'Ofrecimiento de pruebas',                     days:10 },
  { label:'Alegar de bien probado',                      days:6  },
  { label:'Contestación de demanda laboral',             days:10 },
  { label:'Prescripción acción personal (CC Art.659)',   days: 10 * 365 },
]

const EMPTY = { title:'', case_id:'', due_date:'', priority:'medium', description:'', legal_basis:'' }
const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
const lbl = 'block text-[11px] font-bold text-ink-400 mb-1.5 uppercase tracking-wider'

export default function DeadlinesPage() {
  const qc = useQueryClient()
  const [modal, setModal]     = useState<'create'|null>(null)
  const [form, setForm]       = useState<any>({ ...EMPTY })
  const [statusF, setStatusF] = useState('pending')
  const [priorityF, setPF]    = useState('')
  const [showPlazos, setShowPlazos] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['deadlines', statusF, priorityF],
    queryFn: () => deadlinesApi.list({ is_completed: statusF === 'completed' ? true : statusF === 'pending' ? false : undefined, priority: priorityF||undefined, limit: 100 }).then(r => r.data),
  })
  const { data: casesData } = useQuery({ queryKey: ['cases-sel'], queryFn: () => casesApi.list({ limit: 200 }).then(r => r.data) })

  const items: any[] = (data?.items || data || []).sort((a: any, b: any) => {
    if (a.is_completed && !b.is_completed) return 1
    if (b.is_completed && !a.is_completed) return -1
    return (a.due_date || '').localeCompare(b.due_date || '')
  })
  const cases: any[] = casesData?.items || casesData || []

  const createMut = useMutation({
    mutationFn: (d: any) => deadlinesApi.create(d),
    onSuccess: () => { toast.success('Plazo creado'); qc.invalidateQueries({ queryKey: ['deadlines'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const completeMut = useMutation({
    mutationFn: (id: string) => deadlinesApi.complete(id),
    onSuccess: () => { toast.success('Marcado como completado ✓'); qc.invalidateQueries({ queryKey: ['deadlines'] }) },
    onError: () => toast.error('Error'),
  })

  // Stats
  const pending    = items.filter(d => !d.is_completed)
  const overdue    = pending.filter(d => d.due_date && daysUntil(d.due_date) < 0)
  const today      = pending.filter(d => d.due_date && daysUntil(d.due_date) === 0)
  const thisWeek   = pending.filter(d => d.due_date && daysUntil(d.due_date) > 0 && daysUntil(d.due_date) <= 7)
  const critical_c = pending.filter(d => d.priority === 'critical' || d.priority === 'high')

  function applyPlazo(p: typeof COMMON_PLAZOS[0]) {
    const date = new Date()
    date.setDate(date.getDate() + p.days)
    setForm((f: any) => ({
      ...f,
      legal_basis: p.label,
      due_date: date.toISOString().split('T')[0],
      priority: p.days <= 10 ? 'high' : p.days <= 18 ? 'medium' : 'low',
    }))
    setShowPlazos(false)
  }

  function DeadlineRow({ d }: { d: any }) {
    const done  = d.is_completed
    const days  = d.due_date ? daysUntil(d.due_date) : null
    const badge = days !== null ? urgencyBadge(days) : null
    const pr    = PRIORITY[d.priority] || PRIORITY.medium

    return (
      <div className={`bg-white rounded-2xl ring-1 transition-all duration-300 ease-fluid ${
        done ? 'opacity-60 ring-ink-900/[0.06]' :
        (days !== null && days < 0) ? 'ring-rose-300/60 bg-rose-500/[0.03]' :
        days === 0 ? 'ring-gold-400/40 bg-gold-400/[0.04]' :
        'ring-ink-900/[0.06] shadow-tinted-sm hover:shadow-tinted-lg hover:-translate-y-0.5'
      }`}>
        <div className="px-4 py-3.5 flex items-start gap-3">
          {/* Checkbox */}
          <button onClick={() => !done && completeMut.mutate(d.id)} disabled={done}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition
              ${done ? 'bg-gold-500 border-gold-500' : 'border-ink-300 hover:border-gold-400 hover:bg-gold-400/10'}`}>
            {done && <CheckCircle2 strokeWidth={1.7} className="w-4 h-4 text-white" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <p className={`font-semibold text-ink-900 leading-snug ${done ? 'line-through text-ink-400' : ''}`}>{d.title}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold border ${pr.cls}`}>{pr.label}</span>
              {badge && !done && <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${badge.cls}`}>{badge.label}</span>}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-ink-400 mt-0.5">
              <span className="flex items-center gap-1"><Clock strokeWidth={1.7} className="w-3 h-3" />{formatDate(d.due_date)}</span>
              {d.case_title && <span className="flex items-center gap-1 truncate max-w-[180px]"><Scale strokeWidth={1.7} className="w-3 h-3 flex-shrink-0" />{d.case_title}</span>}
              {d.legal_basis && <span className="flex items-center gap-1 text-gold-700 font-medium"><BookOpen strokeWidth={1.7} className="w-3 h-3" />{d.legal_basis}</span>}
            </div>
            {d.description && <p className="text-xs text-ink-400 mt-1 truncate">{d.description}</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppLayout title="Plazos Procesales">
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {[
          { l:'Vencidos',       v:overdue.length,   cls:'text-rose-600', bg:'bg-rose-500/10',   icon:AlertTriangle },
          { l:'Hoy',            v:today.length,     cls:'text-gold-700', bg:'bg-gold-400/12',   icon:Clock         },
          { l:'Esta semana',    v:thisWeek.length,  cls:'text-ink-700',  bg:'bg-ink-900/[0.05]',icon:CalendarClock },
          { l:'Urgentes/Altos', v:critical_c.length,cls:'text-ink-700',  bg:'bg-ink-900/[0.05]',icon:Gavel        },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm flex items-center gap-3">
            <div className={`w-8 h-8 ${c.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <c.icon strokeWidth={1.7} className={`w-4 h-4 ${c.cls}`} />
            </div>
            <div><p className="text-xl font-bold text-ink-900 tnum">{c.v}</p><p className="text-xs text-ink-400">{c.l}</p></div>
          </div>
        ))}
      </div>

      {/* Filters + New */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex gap-1 p-1 bg-sand-100 rounded-full">
          {[{v:'pending',l:'Pendientes'},{v:'completed',l:'Completados'},{v:'',l:'Todos'}].map(s => (
            <button key={s.v} onClick={() => setStatusF(s.v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${statusF===s.v?'bg-white text-ink-900 shadow-tinted-sm':'text-ink-500 hover:text-ink-700'}`}>
              {s.l}
            </button>
          ))}
        </div>
        <select className="px-3 py-2 bg-white ring-1 ring-ink-900/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition"
          value={priorityF} onChange={e => setPF(e.target.value)}>
          <option value="">Todas las prioridades</option>
          {Object.entries(PRIORITY).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <button onClick={() => { setForm({ ...EMPTY }); setModal('create') }}
          className="ml-auto flex items-center gap-2 bg-ink-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid">
          <Plus strokeWidth={1.7} className="w-4 h-4" />Nuevo Plazo
        </button>
      </div>

      {/* Groups */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <Clock strokeWidth={1.7} className="w-12 h-12 text-ink-200 mx-auto mb-3" />
          <p className="text-ink-400 font-medium">Sin plazos registrados</p>
          <button onClick={() => { setForm({ ...EMPTY }); setModal('create') }} className="mt-3 text-sm text-gold-700 hover:text-gold-800 hover:underline font-medium">+ Crear primer plazo</button>
        </div>
      ) : statusF === 'pending' ? (
        <div className="space-y-5">
          {overdue.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle strokeWidth={1.7} className="w-3.5 h-3.5" />Vencidos — Acción inmediata ({overdue.length})
              </h3>
              <div className="space-y-2">{overdue.map(d => <DeadlineRow key={d.id} d={d} />)}</div>
            </div>
          )}
          {today.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gold-700 uppercase tracking-wider mb-2">Vencen hoy ({today.length})</h3>
              <div className="space-y-2">{today.map(d => <DeadlineRow key={d.id} d={d} />)}</div>
            </div>
          )}
          {thisWeek.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">Esta semana ({thisWeek.length})</h3>
              <div className="space-y-2">{thisWeek.map(d => <DeadlineRow key={d.id} d={d} />)}</div>
            </div>
          )}
          {(() => {
            const rest = pending.filter(d => d.due_date && daysUntil(d.due_date) > 7)
            return rest.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2">Más adelante ({rest.length})</h3>
                <div className="space-y-2">{rest.map(d => <DeadlineRow key={d.id} d={d} />)}</div>
              </div>
            )
          })()}
          {pending.filter(d => !d.due_date).length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-2">Sin fecha definida</h3>
              <div className="space-y-2">{pending.filter(d => !d.due_date).map(d => <DeadlineRow key={d.id} d={d} />)}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">{items.map(d => <DeadlineRow key={d.id} d={d} />)}</div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-ink-950 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold tracking-tight text-white">Nuevo Plazo Procesal</h2>
                <p className="text-xs text-white/50 mt-0.5">Registrá un plazo o término legal</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 transition"><X strokeWidth={1.7} className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Quick plazo picker */}
              <div>
                <label className={lbl}>Plazos del CPC / rápidos</label>
                <button onClick={() => setShowPlazos(!showPlazos)}
                  className="w-full flex items-center justify-between px-3 py-2.5 border border-dashed border-ink-300 rounded-xl text-sm text-ink-500 hover:border-ink-900 hover:text-ink-900 transition">
                  <span>Seleccionar plazo predefinido…</span>
                  <ChevronDown strokeWidth={1.7} className={`w-4 h-4 transition-transform ${showPlazos ? 'rotate-180' : ''}`} />
                </button>
                {showPlazos && (
                  <div className="mt-1 ring-1 ring-ink-900/10 rounded-xl overflow-hidden shadow-tinted-sm">
                    {COMMON_PLAZOS.map(p => (
                      <button key={p.label} onClick={() => applyPlazo(p)}
                        className="w-full text-left px-3 py-2.5 text-xs hover:bg-gold-400/10 hover:text-gold-700 transition border-b border-sand-100 last:border-0 flex items-center justify-between">
                        <span className="font-medium">{p.label}</span>
                        <span className="text-ink-400 ml-2 flex-shrink-0 tnum">{p.days}d</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div><label className={lbl}>Título *</label><input className={inp} placeholder="Ej: Contestar demanda" value={form.title} onChange={e => setForm({...form,title:e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Fecha límite *</label><input type="date" className={inp} value={form.due_date} onChange={e => setForm({...form,due_date:e.target.value})} /></div>
                <div><label className={lbl}>Prioridad</label>
                  <select className={inp} value={form.priority} onChange={e => setForm({...form,priority:e.target.value})}>
                    {Object.entries(PRIORITY).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={lbl}>Caso vinculado</label>
                <select className={inp} value={form.case_id} onChange={e => setForm({...form,case_id:e.target.value})}>
                  <option value="">Sin caso</option>
                  {cases.map((c:any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Base Legal (Art., Ley, plazo)</label>
                <input className={inp} value={form.legal_basis} onChange={e => setForm({...form,legal_basis:e.target.value})} placeholder="Art. 133 CPC — 18 días corridos" />
              </div>
              <div><label className={lbl}>Descripción / Notas</label>
                <textarea rows={2} className={`${inp} resize-none`} value={form.description} onChange={e => setForm({...form,description:e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-sand-200">
              <button onClick={() => {
                if (!form.title || !form.due_date) return toast.error('Título y fecha son obligatorios')
                createMut.mutate(form)
              }} disabled={createMut.isPending}
                className="flex-1 py-3 bg-ink-900 text-white rounded-full font-bold text-sm hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid disabled:opacity-50">
                {createMut.isPending ? 'Guardando…' : 'Crear Plazo'}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-3 ring-1 ring-ink-900/10 rounded-full text-sm text-ink-700 hover:bg-ink-900/5 transition">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
