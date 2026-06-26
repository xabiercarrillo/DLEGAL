'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentsApi, clientsApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'
import {
  Calendar, Plus, X, Clock, User, MapPin, Video,
  Phone, Trash2, Edit3, CheckCircle2, CalendarClock,
} from 'lucide-react'
import toast from 'react-hot-toast'

const TYPES: Record<string,{ label:string; icon:any; cls:string }> = {
  presencial: { label:'Presencial', icon:MapPin, cls:'bg-ink-900/[0.05] text-ink-700 ring-1 ring-ink-900/10' },
  virtual:    { label:'Virtual',    icon:Video,  cls:'bg-gold-400/10 text-gold-700 ring-1 ring-gold-400/25' },
  telefonica: { label:'Telefónica', icon:Phone,  cls:'bg-sand-100 text-ink-600 ring-1 ring-ink-900/[0.06]' },
}
const STATUS: Record<string,{ label:string; cls:string }> = {
  scheduled:  { label:'Programada', cls:'bg-ink-900/[0.05] text-ink-700 ring-1 ring-ink-900/10' },
  completed:  { label:'Realizada',  cls:'bg-gold-500/15 text-gold-800 ring-1 ring-gold-500/30' },
  cancelled:  { label:'Cancelada',  cls:'bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20' },
  no_show:    { label:'No asistió', cls:'bg-sand-100 text-ink-500 ring-1 ring-ink-900/[0.06]' },
}
const EMPTY = { title:'', client_id:'', scheduled_at:'', duration_minutes:60, type:'presencial', location:'', notes:'', status:'scheduled' }
const inp = 'w-full px-3.5 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
const lbl = 'block text-[11px] font-semibold text-ink-400 mb-1.5 uppercase tracking-wider'

function daysFromNow(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export default function AppointmentsPage() {
  const qc = useQueryClient()
  const [modal, setModal]   = useState<'create'|'edit'|null>(null)
  const [form, setForm]     = useState<any>({ ...EMPTY })
  const [selected, setSel]  = useState<any>(null)
  const [statusF, setStatusF] = useState('scheduled')

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', statusF],
    queryFn: () => appointmentsApi.list({ status: statusF||undefined, limit: 100 }).then(r => r.data),
  })
  const { data: cData } = useQuery({ queryKey: ['clients-sel'], queryFn: () => clientsApi.list({ limit: 200 }).then(r => r.data) })

  const items: any[] = (data?.items || data || []).sort((a:any,b:any) =>
    new Date(a.scheduled_at||0).getTime() - new Date(b.scheduled_at||0).getTime()
  )
  const clients: any[] = cData?.items || cData || []

  const createMut = useMutation({
    mutationFn: (d: any) => appointmentsApi.create(d),
    onSuccess: () => { toast.success('Cita creada'); qc.invalidateQueries({ queryKey: ['appointments'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => appointmentsApi.update(id, d),
    onSuccess: () => { toast.success('Cita actualizada'); qc.invalidateQueries({ queryKey: ['appointments'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => appointmentsApi.delete(id),
    onSuccess: () => { toast.success('Eliminada'); qc.invalidateQueries({ queryKey: ['appointments'] }) },
    onError: () => toast.error('Error al eliminar'),
  })

  function openCreate() { setForm({ ...EMPTY }); setSel(null); setModal('create') }
  function openEdit(a: any) { setForm({ ...a }); setSel(a); setModal('edit') }
  function save() {
    if (!form.title || !form.scheduled_at) return toast.error('Título y fecha son obligatorios')
    if (modal === 'create') createMut.mutate(form)
    else updateMut.mutate({ id: selected.id, d: form })
  }
  function markDone(a: any) {
    updateMut.mutate({ id: a.id, d: { ...a, status: 'completed' } })
  }

  // Group by day
  const today    = items.filter(a => a.scheduled_at && daysFromNow(a.scheduled_at) === 0)
  const upcoming = items.filter(a => a.scheduled_at && daysFromNow(a.scheduled_at) > 0 && daysFromNow(a.scheduled_at) <= 7)
  const later    = items.filter(a => a.scheduled_at && daysFromNow(a.scheduled_at) > 7)
  const past     = items.filter(a => a.scheduled_at && daysFromNow(a.scheduled_at) < 0)

  function ApptCard({ a }: { a: any }) {
    const dt  = a.scheduled_at ? new Date(a.scheduled_at) : null
    const typ = TYPES[a.type] || TYPES.presencial
    const st  = STATUS[a.status] || STATUS.scheduled
    const done = a.status === 'completed' || a.status === 'cancelled'

    return (
      <div className={`bg-white rounded-2xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm transition-all duration-300 ease-fluid hover:shadow-tinted-lg ${done ? 'opacity-70' : ''}`}>
        <div className="p-4 flex items-start gap-3">
          <div className={`w-14 flex-shrink-0 flex flex-col items-center justify-center rounded-xl py-2 text-center
            ${a.status==='completed' ? 'bg-gold-500/10' : 'bg-ink-900'}`}>
            <span className={`text-lg font-semibold leading-none tnum ${a.status==='completed' ? 'text-gold-700' : 'text-white'}`}>{dt ? dt.getDate() : '--'}</span>
            <span className={`text-[10px] font-bold uppercase mt-0.5 ${a.status==='completed' ? 'text-gold-500' : 'text-gold-400'}`}>{dt ? dt.toLocaleString('es-PY',{month:'short'}) : ''}</span>
            {dt && <span className={`text-[10px] mt-0.5 tnum ${a.status==='completed' ? 'text-ink-400' : 'text-white/50'}`}>{dt.toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit'})}</span>}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className={`font-semibold text-ink-900 ${done ? 'line-through text-ink-400' : ''}`}>{a.title}</p>
              <span className={`text-xs px-2 py-0.5 rounded-lg font-medium flex items-center gap-1 ${typ.cls}`}>
                <typ.icon className="w-3 h-3" />{typ.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${st.cls}`}>{st.label}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-ink-400">
              {a.client_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{a.client_name}</span>}
              {a.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.duration_minutes} min</span>}
              {a.location && <span className="flex items-center gap-1 truncate max-w-[200px]"><MapPin className="w-3 h-3 flex-shrink-0" />{a.location}</span>}
            </div>
            {a.notes && <p className="text-xs text-ink-400 mt-1 truncate">{a.notes}</p>}
          </div>

          <div className="flex gap-1 flex-shrink-0">
            {a.status === 'scheduled' && (
              <button onClick={() => markDone(a)} className="p-1.5 rounded-lg hover:bg-gold-400/10 text-ink-300 hover:text-gold-600 transition" title="Marcar realizada">
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-ink-900/5 text-ink-300 hover:text-ink-700 transition">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={() => { if (confirm('¿Eliminar esta cita?')) deleteMut.mutate(a.id) }}
              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-ink-300 hover:text-rose-600 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Stats
  const totalScheduled = items.filter(i => i.status === 'scheduled').length

  return (
    <AppLayout title="Agenda de citas">
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {[
          { l:'Programadas', v:totalScheduled,                                  accent:false },
          { l:'Hoy',         v:today.length,                                    accent:true  },
          { l:'Esta semana', v:upcoming.length,                                 accent:false },
          { l:'Realizadas',  v:items.filter(i=>i.status==='completed').length,  accent:true  },
        ].map((c,i) => (
          <div key={i} className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${c.accent ? 'bg-gold-400/10' : 'bg-ink-900/[0.05]'}`}>
              <CalendarClock className={`w-4 h-4 ${c.accent ? 'text-gold-600' : 'text-ink-500'}`} strokeWidth={1.7} />
            </div>
            <div><p className="text-xl font-semibold text-ink-900 tnum">{c.v}</p><p className="text-xs text-ink-400">{c.l}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex gap-1 p-1 bg-sand-100 rounded-xl">
          {[{v:'scheduled',l:'Programadas'},{v:'completed',l:'Realizadas'},{v:'',l:'Todas'}].map(s => (
            <button key={s.v} onClick={() => setStatusF(s.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusF===s.v?'bg-white text-ink-900 shadow-tinted-sm':'text-ink-500 hover:text-ink-700'}`}>
              {s.l}
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="ml-auto flex items-center gap-2 bg-ink-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid">
          <Plus className="w-4 h-4" strokeWidth={1.8} />Nueva cita
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <Calendar className="w-12 h-12 text-ink-200 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-ink-400 font-medium">Sin citas registradas</p>
          <button onClick={openCreate} className="mt-3 text-sm text-ink-700 hover:text-gold-600 font-medium transition">+ Agendar primera cita</button>
        </div>
      ) : statusF === 'scheduled' ? (
        <div className="space-y-5">
          {today.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gold-600 uppercase tracking-wider mb-2">Hoy ({today.length})</h3>
              <div className="space-y-2">{today.map(a => <ApptCard key={a.id} a={a} />)}</div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">Próximos 7 días ({upcoming.length})</h3>
              <div className="space-y-2">{upcoming.map(a => <ApptCard key={a.id} a={a} />)}</div>
            </div>
          )}
          {later.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2">Más adelante ({later.length})</h3>
              <div className="space-y-2">{later.map(a => <ApptCard key={a.id} a={a} />)}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">{items.map(a => <ApptCard key={a.id} a={a} />)}</div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-ink-950/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-tinted-lg overflow-hidden">
            <div className="bg-ink-950 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-white tracking-tight">{modal==='create'?'Nueva cita':'Editar cita'}</h2>
                <p className="text-xs text-white/50 mt-0.5">Agenda una reunión o consulta</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div><label className={lbl}>Título *</label><input className={inp} value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Consulta inicial / Reunión de seguimiento" /></div>
              <div><label className={lbl}>Cliente</label>
                <select className={inp} value={form.client_id||''} onChange={e=>setForm({...form,client_id:e.target.value})}>
                  <option value="">Sin cliente</option>
                  {clients.map((c:any) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Fecha y hora *</label><input type="datetime-local" className={inp} value={form.scheduled_at||''} onChange={e=>setForm({...form,scheduled_at:e.target.value})} /></div>
                <div><label className={lbl}>Duración (min)</label><input type="number" min="15" step="15" className={inp} value={form.duration_minutes||60} onChange={e=>setForm({...form,duration_minutes:+e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Tipo</label>
                  <select className={inp} value={form.type||'presencial'} onChange={e=>setForm({...form,type:e.target.value})}>
                    {Object.entries(TYPES).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
                  </select>
                </div>
                {modal === 'edit' && <div><label className={lbl}>Estado</label>
                  <select className={inp} value={form.status||'scheduled'} onChange={e=>setForm({...form,status:e.target.value})}>
                    {Object.entries(STATUS).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
                  </select>
                </div>}
              </div>
              <div><label className={lbl}>Lugar / Enlace</label><input className={inp} value={form.location||''} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Oficina principal / meet.google.com/…" /></div>
              <div><label className={lbl}>Notas</label><textarea rows={2} className={`${inp} resize-none`} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-ink-900/[0.07]">
              <button onClick={save} disabled={createMut.isPending||updateMut.isPending}
                className="flex-1 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid disabled:opacity-50">
                {createMut.isPending||updateMut.isPending ? 'Guardando…' : modal==='create' ? 'Crear cita' : 'Guardar cambios'}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-3 ring-1 ring-ink-900/10 rounded-full text-sm text-ink-700 hover:bg-ink-900/5 transition">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
