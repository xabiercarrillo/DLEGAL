'use client'
import AppLayout from '@/components/layout/AppLayout'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import {
  Handshake, Plus, X, CheckCircle, XCircle, Clock,
  Circle, User, Building2, CalendarDays, Trash2, Edit3,
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

const STATUS: Record<string, { label: string; cls: string; icon: any; color: string }> = {
  pendiente:         { label: 'Pendiente',   cls: 'bg-gold-400/10 text-gold-700 ring-1 ring-gold-400/25',  icon: Clock,       color: 'text-gold-500' },
  en_proceso:        { label: 'En proceso',  cls: 'bg-ink-900/[0.05] text-ink-700 ring-1 ring-ink-900/10', icon: Circle,      color: 'text-ink-500'  },
  acuerdo_alcanzado: { label: 'Acuerdo',     cls: 'bg-gold-500/15 text-gold-800 ring-1 ring-gold-500/30',  icon: CheckCircle, color: 'text-gold-600' },
  sin_acuerdo:       { label: 'Sin acuerdo', cls: 'bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20',  icon: XCircle,     color: 'text-rose-500' },
  cancelada:         { label: 'Cancelada',   cls: 'bg-sand-100 text-ink-500 ring-1 ring-ink-900/[0.06]',   icon: X,           color: 'text-ink-400'  },
}
const CENTERS = [
  'Centro de Mediación y Arbitraje de la CCR',
  'Centro de Mediación del CEDHA',
  'Centro de Mediación del Colegio de Abogados',
  'Centro de Mediación del Poder Judicial',
  'Mediación privada',
  'Otro',
]
const EMPTY = { title:'', opposing_party:'', mediation_center:'', mediator_name:'', scheduled_at:'', description:'', case_number:'' }
const inp = 'w-full px-3.5 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
const lbl = 'block text-[11px] font-semibold text-ink-400 mb-1.5 uppercase tracking-wider'

export default function MediationsPage() {
  const qc = useQueryClient()
  const [modal, setModal]  = useState<'create'|'edit'|null>(null)
  const [form, setForm]    = useState<any>({ ...EMPTY })
  const [selected, setSel] = useState<any>(null)
  const [statusF, setStatusF] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['mediations'],
    queryFn: () => api.get('/mediations').then(r => r.data),
  })
  const allItems: any[] = data?.items || []
  const items = statusF ? allItems.filter(m => m.status === statusF) : allItems

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/mediations', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mediations'] }); setModal(null); toast.success('Mediación creada') },
    onError: () => toast.error('Error al crear'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => api.put(`/mediations/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mediations'] }); setModal(null); toast.success('Actualizada') },
    onError: () => toast.error('Error'),
  })
  const statusMut = useMutation({
    mutationFn: ({ id, status }: any) => api.put(`/mediations/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mediations'] }); toast.success('Estado actualizado') },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/mediations/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mediations'] }); toast.success('Eliminada') },
    onError: () => toast.error('Error al eliminar'),
  })

  function openCreate() { setForm({ ...EMPTY }); setSel(null); setModal('create') }
  function openEdit(m: any) { setForm({ ...m }); setSel(m); setModal('edit') }
  function save() {
    if (!form.title || !form.opposing_party) return toast.error('Título y contraparte son obligatorios')
    if (modal === 'create') createMut.mutate(form)
    else updateMut.mutate({ id: selected.id, d: form })
  }

  // Stats
  const counts = Object.keys(STATUS).reduce((acc, k) => ({ ...acc, [k]: allItems.filter((m: any) => m.status === k).length }), {} as Record<string,number>)

  return (
    <AppLayout title="Mediaciones y conciliaciones">
      <PageHeader
        icon={Handshake}
        title="Mediaciones"
        description="Procesos de mediación y conciliación en curso."
        actions={
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-ink-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid shadow-tinted-sm">
            <Plus className="w-4 h-4" strokeWidth={1.8} />Nueva mediación
          </button>
        }
      />
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
        {Object.entries(STATUS).map(([k, v]) => {
          const Icon = v.icon
          return (
            <button key={k} onClick={() => setStatusF(statusF === k ? '' : k)}
              className={`bg-white rounded-2xl p-4 shadow-tinted-sm text-left transition-all duration-300 ease-fluid hover:-translate-y-0.5 hover:shadow-tinted-lg ${statusF===k ? 'ring-2 ring-gold-400/60' : 'ring-1 ring-ink-900/[0.06]'}`}>
              <Icon className={`w-5 h-5 mb-2 ${v.color}`} strokeWidth={1.7} />
              <p className="text-xl font-semibold text-ink-900 tnum">{counts[k] || 0}</p>
              <p className="text-xs text-ink-400 mt-0.5">{v.label}</p>
            </button>
          )
        })}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-ink-900 tracking-tight">
            {statusF ? STATUS[statusF]?.label : 'Todas las mediaciones'}
          </h2>
          <span className="text-xs bg-sand-100 text-ink-500 px-2 py-0.5 rounded-lg tnum">{items.length}</span>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title={statusF ? 'Sin mediaciones en este estado' : 'Sin mediaciones registradas'}
          description={statusF ? 'No hay mediaciones que coincidan con el filtro seleccionado.' : 'Registrá tu primera mediación o conciliación para darle seguimiento.'}
          action={
            <button onClick={openCreate}
              className="flex items-center gap-2 bg-ink-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid shadow-tinted-sm">
              <Plus className="w-4 h-4" strokeWidth={1.8} />Registrar primera mediación
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((m: any) => {
            const s = STATUS[m.status] || STATUS.pendiente
            const Icon = s.icon
            return (
              <div key={m.id} className="bg-white rounded-2xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm transition-all duration-300 ease-fluid hover:shadow-tinted-lg">
                <div className="p-4 flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${s.cls}`}>
                    <Icon className="w-5 h-5" strokeWidth={1.7} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-ink-900">{m.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${s.cls}`}>{s.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-ink-400">
                      {m.opposing_party && <span className="flex items-center gap-1"><User className="w-3 h-3" />Contraparte: {m.opposing_party}</span>}
                      {m.mediation_center && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{m.mediation_center}</span>}
                      {m.scheduled_at && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{formatDate(m.scheduled_at)}</span>}
                      {m.mediator_name && <span>Mediador: {m.mediator_name}</span>}
                    </div>
                    {m.description && <p className="text-xs text-ink-400 mt-1 truncate">{m.description}</p>}
                    {/* Status change actions */}
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      {m.status !== 'acuerdo_alcanzado' && m.status !== 'cancelada' && (
                        <button onClick={() => statusMut.mutate({ id: m.id, status: 'acuerdo_alcanzado' })}
                          className="text-xs px-2.5 py-1 rounded-lg bg-gold-400/10 text-gold-700 ring-1 ring-gold-400/25 font-semibold hover:bg-gold-400/20 transition">
                          Acuerdo alcanzado
                        </button>
                      )}
                      {m.status === 'pendiente' && (
                        <button onClick={() => statusMut.mutate({ id: m.id, status: 'en_proceso' })}
                          className="text-xs px-2.5 py-1 rounded-lg bg-ink-900/[0.04] text-ink-700 ring-1 ring-ink-900/10 font-semibold hover:bg-ink-900/[0.08] transition">
                          En proceso
                        </button>
                      )}
                      {!['sin_acuerdo','cancelada','acuerdo_alcanzado'].includes(m.status) && (
                        <button onClick={() => statusMut.mutate({ id: m.id, status: 'sin_acuerdo' })}
                          className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20 font-semibold hover:bg-rose-500/20 transition">
                          Sin acuerdo
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-ink-900/5 text-ink-300 hover:text-ink-700 transition"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm(`¿Eliminar mediación "${m.title}"?`)) deleteMut.mutate(m.id) }}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-ink-300 hover:text-rose-600 transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-ink-950/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-tinted-lg overflow-hidden">
            <div className="bg-ink-950 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-white tracking-tight">{modal==='create'?'Nueva mediación':'Editar mediación'}</h2>
                <p className="text-xs text-white/50 mt-0.5">Mediaciones y conciliaciones extrajudiciales</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div><label className={lbl}>Título del conflicto *</label><input className={inp} value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ej: Conflicto laboral — Empresa ABC" /></div>
              <div><label className={lbl}>Contraparte *</label><input className={inp} value={form.opposing_party||''} onChange={e=>setForm({...form,opposing_party:e.target.value})} placeholder="Nombre de la contraparte o empresa" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Centro de mediación</label>
                  <input className={inp} list="centers-list" value={form.mediation_center||''} onChange={e=>setForm({...form,mediation_center:e.target.value})} placeholder="Seleccionar o escribir..." />
                  <datalist id="centers-list">{CENTERS.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div><label className={lbl}>Nombre del mediador</label><input className={inp} value={form.mediator_name||''} onChange={e=>setForm({...form,mediator_name:e.target.value})} placeholder="Dr. Nombre Apellido" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Fecha / Sesión</label><input type="datetime-local" className={inp} value={form.scheduled_at||''} onChange={e=>setForm({...form,scheduled_at:e.target.value})} /></div>
                <div><label className={lbl}>N° Expediente</label><input className={inp} value={form.case_number||''} onChange={e=>setForm({...form,case_number:e.target.value})} placeholder="Opcional" /></div>
              </div>
              <div><label className={lbl}>Descripción / Puntos en disputa</label><textarea rows={3} className={`${inp} resize-none`} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describir los puntos en disputa, pretensiones de cada parte…" /></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-ink-900/[0.07]">
              <button onClick={save} disabled={createMut.isPending||updateMut.isPending}
                className="flex-1 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid disabled:opacity-50">
                {createMut.isPending||updateMut.isPending ? 'Guardando…' : modal==='create' ? 'Crear mediación' : 'Guardar cambios'}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-3 ring-1 ring-ink-900/10 rounded-full text-sm text-ink-700 hover:bg-ink-900/5 transition">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
