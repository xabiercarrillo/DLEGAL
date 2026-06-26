'use client'
import AppLayout from '@/components/layout/AppLayout'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hearingsApi, casesApi } from '@/lib/api'
import { useState } from 'react'
import {
  Scale, Plus, X, MapPin, Clock, FileText, CheckCircle2,
  Calendar, AlertTriangle, Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'

const TYPES: Record<string,string> = {
  oral: 'Oral', preparatoria: 'Preparatoria', conciliacion: 'Conciliación',
  prueba: 'Prueba', alegatos: 'Alegatos', sentencia: 'Sentencia',
  apelacion: 'Apelación', otro: 'Otro',
}
const STATUS: Record<string,{ label:string; cls:string; dot:string }> = {
  scheduled:  { label:'Programada', cls:'bg-ink-900/[0.05] text-ink-600', dot:'bg-ink-400'   },
  completed:  { label:'Realizada',  cls:'bg-gold-400/12 text-gold-700',   dot:'bg-gold-500'  },
  cancelled:  { label:'Cancelada',  cls:'bg-rose-500/10 text-rose-600',   dot:'bg-rose-500'  },
  postponed:  { label:'Postergada', cls:'bg-gold-400/12 text-gold-700',   dot:'bg-gold-400'  },
}
const TRIBUNALES = [
  '1er Juzgado Civil y Comercial','2do Juzgado Civil y Comercial','3er Juzgado Civil y Comercial',
  'Juzgado Laboral 1°','Juzgado de Familia','Juzgado Penal de Garantías',
  'Tribunal de Apelación Civil','Corte Suprema de Justicia',
]
const EMPTY = { case_id:'', title:'', type:'oral', scheduled_at:'', court:'', judge:'', notes:'', result:'', status:'scheduled' }
const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
const lbl = 'block text-[11px] font-bold text-ink-400 mb-1.5 uppercase tracking-wider'

function daysFromNow(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export default function HearingsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'create'|'edit'|null>(null)
  const [form, setForm]   = useState<any>({ ...EMPTY })
  const [selected, setSel]= useState<any>(null)
  const [statusF, setStatusF] = useState('scheduled')
  const [typeF, setTypeF]     = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['hearings', statusF, typeF],
    queryFn: () => hearingsApi.list({ status: statusF||undefined, type: typeF||undefined, limit: 100 }).then(r => r.data),
  })
  const { data: casesData } = useQuery({ queryKey: ['cases-sel'], queryFn: () => casesApi.list({ limit: 200 }).then(r => r.data) })

  const items: any[] = (data?.items || data || []).sort((a:any, b:any) =>
    new Date(a.scheduled_at||0).getTime() - new Date(b.scheduled_at||0).getTime()
  )
  const cases: any[] = casesData?.items || casesData || []

  const createMut = useMutation({
    mutationFn: (d: any) => hearingsApi.create(d),
    onSuccess: () => { toast.success('Audiencia creada'); qc.invalidateQueries({ queryKey: ['hearings'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => hearingsApi.update(id, d),
    onSuccess: () => { toast.success('Actualizada'); qc.invalidateQueries({ queryKey: ['hearings'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })

  // Group by: upcoming (next 7d), later, today, past
  const now   = Date.now()
  const today = items.filter(h => h.scheduled_at && daysFromNow(h.scheduled_at) === 0)
  const next7 = items.filter(h => h.scheduled_at && daysFromNow(h.scheduled_at) > 0 && daysFromNow(h.scheduled_at) <= 7 && h.status === 'scheduled')
  const later = items.filter(h => h.scheduled_at && daysFromNow(h.scheduled_at) > 7 && h.status === 'scheduled')
  const done  = items.filter(h => h.status !== 'scheduled')

  function openCreate() { setSel(null); setForm({ ...EMPTY }); setModal('create') }
  function openEdit(h: any) { setSel(h); setForm({ ...h }); setModal('edit') }
  function save() {
    if (!form.title) return toast.error('Título requerido')
    if (!form.scheduled_at) return toast.error('Fecha requerida')
    if (modal === 'create') createMut.mutate(form)
    else updateMut.mutate({ id: selected.id, d: form })
  }

  function HearingCard({ h }: { h: any }) {
    const dt  = h.scheduled_at ? new Date(h.scheduled_at) : null
    const d   = dt ? daysFromNow(h.scheduled_at) : null
    const st  = STATUS[h.status] || STATUS.scheduled
    const isUrgent = d !== null && d <= 3 && h.status === 'scheduled'

    return (
      <div onClick={() => openEdit(h)}
        className={`bg-white rounded-2xl ring-1 shadow-tinted-sm cursor-pointer transition-all duration-300 ease-fluid hover:shadow-tinted-lg hover:-translate-y-0.5
          ${isUrgent ? 'ring-rose-300/60 bg-rose-500/[0.03]' : 'ring-ink-900/[0.06]'}`}>
        <div className="p-4 flex items-start gap-3">
          {/* Date block */}
          <div className={`w-14 flex-shrink-0 flex flex-col items-center justify-center rounded-xl py-2 text-center
            ${h.status === 'completed' ? 'bg-gold-400/15' : isUrgent ? 'bg-rose-600 text-white' : 'bg-ink-900 text-white'}`}>
            <span className={`text-lg font-black leading-none tnum ${h.status === 'completed' ? 'text-gold-700' : ''}`}>{dt ? dt.getDate() : '--'}</span>
            <span className={`text-[10px] font-bold uppercase mt-0.5 ${isUrgent ? 'text-rose-100' : h.status === 'completed' ? 'text-gold-600' : 'text-gold'}`}>
              {dt ? dt.toLocaleString('es-PY', { month: 'short' }) : ''}
            </span>
            {dt && <span className={`text-[10px] mt-0.5 tnum ${isUrgent ? 'text-rose-100' : h.status === 'completed' ? 'text-ink-400' : 'text-white/40'}`}>{dt.getFullYear()}</span>}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="font-semibold text-ink-900">{h.title || TYPES[h.type] || h.type || 'Audiencia'}</p>
              {h.title && <span className="text-xs text-ink-400">{TYPES[h.type] || h.type}</span>}
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium ${st.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
              </span>
              {isUrgent && d !== null && (
                <span className="text-xs bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                  <AlertTriangle strokeWidth={1.7} className="w-3 h-3" />{d === 0 ? 'HOY' : `${d}d`}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-ink-400">
              {dt && <span className="flex items-center gap-1"><Clock strokeWidth={1.7} className="w-3 h-3" />{dt.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}</span>}
              {h.court && <span className="flex items-center gap-1"><MapPin strokeWidth={1.7} className="w-3 h-3 flex-shrink-0" />{h.court}</span>}
              {h.judge && <span>Juez: {h.judge}</span>}
              {h.case_title && <span className="flex items-center gap-1"><FileText strokeWidth={1.7} className="w-3 h-3" />{h.case_title}</span>}
            </div>
            {h.result && h.status === 'completed' && (
              <p className="mt-1.5 text-xs bg-gold-400/[0.08] text-gold-700 px-2 py-1 rounded-lg ring-1 ring-gold-400/20 truncate">{h.result}</p>
            )}
          </div>

          {h.status === 'scheduled' && (
            <button onClick={e => { e.stopPropagation(); if (confirm('¿Marcar como realizada?')) updateMut.mutate({ id: h.id, d: { ...h, status: 'completed' } }) }}
              className="p-2 rounded-xl hover:bg-gold-400/10 text-ink-300 hover:text-gold-600 transition flex-shrink-0">
              <CheckCircle2 strokeWidth={1.7} className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  function Section({ title, list, empty }: { title: string; list: any[]; empty?: string }) {
    if (!list.length) return null
    return (
      <div>
        <h3 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2">{title} ({list.length})</h3>
        <div className="space-y-2">{list.map(h => <HearingCard key={h.id} h={h} />)}</div>
      </div>
    )
  }

  // Stats
  const totalScheduled = items.filter(i => i.status === 'scheduled').length
  const totalThisMonth = items.filter(i => {
    if (!i.scheduled_at) return false
    const d = new Date(i.scheduled_at)
    const now2 = new Date()
    return d.getMonth() === now2.getMonth() && d.getFullYear() === now2.getFullYear()
  }).length

  return (
    <AppLayout title="Audiencias">
      <PageHeader
        icon={Scale}
        title="Audiencias"
        description="Próximas audiencias y comparecencias del estudio."
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 bg-ink-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid shadow-tinted-sm">
            <Plus strokeWidth={1.7} className="w-4 h-4" />Nueva Audiencia
          </button>
        }
      />
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {[
          { l:'Programadas', v:totalScheduled,  cls:'text-ink-700',  bg:'bg-ink-900/[0.05]'  },
          { l:'Hoy',         v:today.length,     cls:'text-rose-600', bg:'bg-rose-500/10'     },
          { l:'Esta semana', v:next7.length,     cls:'text-gold-700', bg:'bg-gold-400/12'     },
          { l:'Este mes',    v:totalThisMonth,   cls:'text-ink-700',  bg:'bg-ink-900/[0.05]'  },
        ].map((c,i) => (
          <div key={i} className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm flex items-center gap-3">
            <div className={`w-8 h-8 ${c.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Calendar strokeWidth={1.7} className={`w-4 h-4 ${c.cls}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-ink-900 tnum">{c.v}</p>
              <p className="text-xs text-ink-400">{c.l}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + New button */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex gap-1 p-1 bg-sand-100 rounded-full">
          {[{v:'scheduled',l:'Programadas'},{v:'completed',l:'Realizadas'},{v:'',l:'Todas'}].map(s => (
            <button key={s.v} onClick={() => setStatusF(s.v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${statusF===s.v?'bg-white text-ink-900 shadow-tinted-sm':'text-ink-500 hover:text-ink-700'}`}>
              {s.l}
            </button>
          ))}
        </div>
        <select className="px-3 py-2 bg-white ring-1 ring-ink-900/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition"
          value={typeF} onChange={e => setTypeF(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(TYPES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Scale}
          title={(statusF && statusF !== 'scheduled') || typeF ? 'Sin audiencias para este filtro' : 'Sin audiencias registradas'}
          description={(statusF && statusF !== 'scheduled') || typeF ? 'Probá cambiar los filtros para ver otras audiencias.' : 'Agendá tu primera audiencia y mantené el control de las comparecencias del estudio.'}
          action={
            <button onClick={openCreate} className="flex items-center gap-2 bg-ink-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid shadow-tinted-sm">
              <Plus strokeWidth={1.7} className="w-4 h-4" />Crear primera audiencia
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {statusF === 'scheduled' ? (
            <>
              {today.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle strokeWidth={1.7} className="w-3.5 h-3.5" />Hoy ({today.length})
                  </h3>
                  <div className="space-y-2">{today.map(h => <HearingCard key={h.id} h={h} />)}</div>
                </div>
              )}
              <Section title="Próximos 7 días" list={next7} />
              <Section title="Más adelante" list={later} />
            </>
          ) : (
            <div className="space-y-2">{items.map(h => <HearingCard key={h.id} h={h} />)}</div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="bg-ink-950 px-6 py-5 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-display font-semibold tracking-tight text-white">{modal==='create'?'Nueva Audiencia':'Editar Audiencia'}</h2>
                <p className="text-xs text-white/50 mt-0.5">Ingresá los datos de la audiencia</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 transition"><X strokeWidth={1.7} className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <div>
                <label className={lbl}>Título de la audiencia *</label>
                <input className={inp} value={form.title||''} onChange={e => setForm({...form,title:e.target.value})} placeholder="Audiencia de prueba — Pérez c/ González" />
              </div>
              <div>
                <label className={lbl}>Caso vinculado</label>
                <select className={inp} value={form.case_id||''} onChange={e => setForm({...form,case_id:e.target.value})}>
                  <option value="">Sin caso asignado</option>
                  {cases.map((c:any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Tipo</label>
                  <select className={inp} value={form.type||'oral'} onChange={e => setForm({...form,type:e.target.value})}>
                    {Object.entries(TYPES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Estado</label>
                  <select className={inp} value={form.status||'scheduled'} onChange={e => setForm({...form,status:e.target.value})}>
                    {Object.entries(STATUS).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Fecha y Hora *</label>
                <input type="datetime-local" className={inp} value={form.scheduled_at||''} onChange={e => setForm({...form,scheduled_at:e.target.value})} />
              </div>
              <div>
                <label className={lbl}>Lugar / Sala</label>
                <input className={inp} value={form.court||''} onChange={e => setForm({...form,court:e.target.value})} placeholder="1er Juzgado Civil, Sala 3" list="tribunales-list" />
                <datalist id="tribunales-list">{TRIBUNALES.map(t => <option key={t} value={t} />)}</datalist>
              </div>
              <div>
                <label className={lbl}>Juez / Magistrado</label>
                <input className={inp} value={form.judge||''} onChange={e => setForm({...form,judge:e.target.value})} placeholder="Dr. Roberto Díaz" />
              </div>
              <div>
                <label className={lbl}>Notas / Preparación</label>
                <textarea rows={2} className={`${inp} resize-none`} value={form.notes||''} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Documentos a presentar, testigos, etc." />
              </div>
              {modal === 'edit' && (
                <div>
                  <label className={lbl}>Resultado de la audiencia</label>
                  <textarea rows={3} className={`${inp} resize-none`} value={form.result||''} onChange={e => setForm({...form,result:e.target.value})} placeholder="¿Qué sucedió? Resolución, próxima fecha, etc." />
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 pt-0 flex-shrink-0">
              <button onClick={save} disabled={createMut.isPending||updateMut.isPending}
                className="flex-1 py-3 bg-ink-900 text-white rounded-full font-bold text-sm hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid disabled:opacity-50">
                {createMut.isPending||updateMut.isPending ? 'Guardando…' : modal==='create' ? 'Crear Audiencia' : 'Guardar Cambios'}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-3 ring-1 ring-ink-900/10 rounded-full text-sm text-ink-700 hover:bg-ink-900/5 transition">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
