'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, casesApi, usersApi } from '@/lib/api'
import { formatDate, daysUntil, urgencyBadge } from '@/lib/utils'
import { useState } from 'react'
import { CheckSquare, Plus, X, CheckCircle2, Trash2, Edit3, Filter, Scale, Calendar, User } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY = { title: '', case_id: '', due_date: '', priority: 'medium', description: '', assigned_to: '' }

const PRI: Record<string, { label: string; cls: string; dot: string }> = {
  low:      { label: 'Baja',     cls: 'bg-ink-900/[0.04] text-ink-500', dot: 'bg-ink-300'  },
  medium:   { label: 'Media',    cls: 'bg-ink-900/[0.05] text-ink-600', dot: 'bg-ink-400'  },
  high:     { label: 'Alta',     cls: 'bg-gold-400/12 text-gold-700',   dot: 'bg-gold-500' },
  critical: { label: 'Urgente', cls: 'bg-rose-500/10 text-rose-600',    dot: 'bg-rose-500' },
}

const STATUS_TABS = [
  { v: 'pendiente',   l: 'Pendientes'  },
  { v: 'en_proceso',  l: 'En proceso'  },
  { v: 'completada',  l: 'Completadas' },
  { v: '',            l: 'Todas'       },
]

const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
const lbl = 'block text-[11px] font-bold text-ink-400 mb-1.5 uppercase tracking-wider'

export default function TasksPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('pendiente')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const [editId, setEditId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, priorityFilter],
    queryFn: () => tasksApi.list({ status: statusFilter || undefined, priority: priorityFilter || undefined, limit: 100 }).then(r => r.data),
  })
  const { data: casesData } = useQuery({ queryKey: ['cases-sel'], queryFn: () => casesApi.list({ limit: 200 }).then(r => r.data) })
  const { data: usersData } = useQuery({ queryKey: ['users-sel'], queryFn: () => usersApi.list().then(r => r.data) })

  const items: any[] = data?.items || data || []
  const cases: any[] = casesData?.items || casesData || []
  const team: any[]  = usersData?.items || usersData || []

  // Count by status for badges
  const { data: allData } = useQuery({ queryKey: ['tasks-all-count'], queryFn: () => tasksApi.list({ limit: 200 }).then(r => r.data) })
  const allItems: any[] = allData?.items || allData || []
  const countByStatus = (s: string) => s ? allItems.filter(t => t.status === s).length : allItems.length

  const createMut = useMutation({
    mutationFn: (d: any) => tasksApi.create(d),
    onSuccess: () => { toast.success('Tarea creada'); qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['tasks-all-count'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tasksApi.update(id, data),
    onSuccess: () => { toast.success('Tarea actualizada'); qc.invalidateQueries({ queryKey: ['tasks'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const completeMut = useMutation({
    mutationFn: (id: string) => tasksApi.complete(id),
    onSuccess: () => { toast.success('¡Completada! ✓'); qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['tasks-all-count'] }) },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => { toast.success('Eliminada'); qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['tasks-all-count'] }) },
  })

  function openCreate() { setForm({ ...EMPTY }); setModal('create') }
  function openEdit(t: any) {
    setForm({ title: t.title, case_id: t.case_id || '', due_date: t.due_date || '', priority: t.priority, description: t.description || '', assigned_to: t.assigned_to || '' })
    setEditId(t.id); setModal('edit')
  }
  function save() {
    if (!form.title) return toast.error('Título requerido')
    if (modal === 'edit' && editId) updateMut.mutate({ id: editId, data: form })
    else createMut.mutate(form)
  }

  const pending = createMut.isPending || updateMut.isPending

  return (
    <AppLayout title="Tareas">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* Status tabs */}
        <div className="flex gap-1 bg-sand-100 p-1 rounded-full">
          {STATUS_TABS.map(s => {
            const cnt = countByStatus(s.v)
            return (
              <button key={s.v} onClick={() => setStatusFilter(s.v)}
                className={`px-3 py-2 rounded-full text-sm font-semibold transition flex items-center gap-1.5
                  ${statusFilter === s.v ? 'bg-ink-900 text-white shadow-tinted-sm' : 'text-ink-500 hover:text-ink-700'}`}>
                {s.l}
                <span className={`text-xs rounded-md px-1.5 py-0.5 tnum ${statusFilter === s.v ? 'bg-white/20' : 'bg-white text-ink-500'}`}>{cnt}</span>
              </button>
            )
          })}
        </div>

        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition ${showFilters || priorityFilter ? 'bg-ink-900 text-white' : 'bg-white ring-1 ring-ink-900/10 text-ink-700 hover:bg-ink-900/5'}`}>
          <Filter strokeWidth={1.7} className="w-4 h-4" />Filtros
        </button>

        <button onClick={openCreate}
          className="flex items-center gap-2 bg-ink-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid ml-auto">
          <Plus strokeWidth={1.7} className="w-4 h-4" />Nueva Tarea
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-4 bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm flex flex-wrap gap-3">
          <div>
            <label className={lbl}>Prioridad</label>
            <div className="flex gap-1.5">
              <button onClick={() => setPriorityFilter('')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${!priorityFilter ? 'bg-ink-900 text-white' : 'ring-1 ring-ink-900/10 text-ink-500 hover:ring-ink-900/20'}`}>
                Todas
              </button>
              {Object.entries(PRI).map(([k, v]) => (
                <button key={k} onClick={() => setPriorityFilter(priorityFilter === k ? '' : k)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${priorityFilter === k ? `${v.cls}` : 'ring-1 ring-ink-900/10 text-ink-500 hover:ring-ink-900/20'}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-white rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <CheckSquare strokeWidth={1.7} className="w-12 h-12 text-ink-200 mx-auto mb-3" />
          <p className="text-ink-400 font-medium">Sin tareas en este estado</p>
          <button onClick={openCreate} className="mt-4 px-5 py-2 bg-ink-900 text-white rounded-full text-sm font-semibold hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid">
            + Crear primera tarea
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map(t => {
            const days = t.due_date ? daysUntil(t.due_date) : null
            const badge = days !== null ? urgencyBadge(days) : null
            const completed = t.status === 'completada'
            const p = PRI[t.priority] || PRI.medium
            return (
              <div key={t.id}
                className={`bg-white rounded-2xl px-4 py-3.5 ring-1 transition-all duration-300 ease-fluid group
                  ${completed ? 'ring-ink-900/[0.06] opacity-60' : 'ring-ink-900/[0.06] shadow-tinted-sm hover:shadow-tinted-lg hover:-translate-y-0.5'}`}>
                <div className="flex items-center gap-3">
                  {/* Complete button */}
                  <button onClick={() => !completed && completeMut.mutate(t.id)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition
                      ${completed ? 'bg-gold-500 border-gold-500' : 'border-ink-300 hover:border-gold-400 hover:bg-gold-400/10'}`}>
                    {completed && <CheckCircle2 strokeWidth={1.7} className="w-3.5 h-3.5 text-white" />}
                  </button>

                  {/* Priority dot */}
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.dot}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-tight ${completed ? 'line-through text-ink-400' : 'text-ink-800'}`}>{t.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {t.case_title && <span className="text-xs text-ink-400 truncate flex items-center gap-1"><Scale strokeWidth={1.7} className="w-3 h-3" />{t.case_title}</span>}
                      {t.due_date && <span className="text-xs text-ink-400 flex items-center gap-1"><Calendar strokeWidth={1.7} className="w-3 h-3" />{formatDate(t.due_date)}</span>}
                      {t.assigned_name && <span className="text-xs text-ink-400 flex items-center gap-1"><User strokeWidth={1.7} className="w-3 h-3" />{t.assigned_name}</span>}
                    </div>
                  </div>

                  {/* Badges + Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${p.cls}`}>{p.label}</span>
                    {badge && !completed && days !== null && days <= 7 && (
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${badge.cls}`}>{badge.label}</span>
                    )}

                    {/* Actions - visible on hover */}
                    {!completed && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                        <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-ink-900/5 text-ink-500 hover:text-ink-900 transition">
                          <Edit3 strokeWidth={1.7} className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { if (confirm('¿Eliminar esta tarea?')) deleteMut.mutate(t.id) }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-ink-400 hover:text-rose-600 transition">
                          <Trash2 strokeWidth={1.7} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {t.description && (
                  <p className="text-xs text-ink-400 mt-2 ml-10 leading-relaxed">{t.description}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-ink-950 px-6 py-5 flex items-center justify-between">
              <h2 className="font-display font-semibold tracking-tight text-white">{modal === 'edit' ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 transition"><X strokeWidth={1.7} className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={lbl}>Título *</label>
                <input className={inp} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej: Presentar escrito de contestación" autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Prioridad</label>
                  <div className="flex flex-col gap-1">
                    {Object.entries(PRI).map(([k, v]) => (
                      <label key={k} className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer border-2 transition
                        ${form.priority === k ? 'border-ink-900 bg-ink-900/5' : 'border-sand-200 hover:border-ink-900/20'}`}>
                        <input type="radio" name="priority" value={k} checked={form.priority === k} onChange={() => setForm({ ...form, priority: k })} className="sr-only" />
                        <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                        <span className="text-sm font-medium text-ink-700">{v.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={lbl}>Fecha límite</label>
                    <input type="date" className={inp} value={form.due_date || ''} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>Caso</label>
                    <select className={inp} value={form.case_id || ''} onChange={e => setForm({ ...form, case_id: e.target.value })}>
                      <option value="">Sin caso</option>
                      {cases.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Asignar a</label>
                    <select className={inp} value={form.assigned_to || ''} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                      <option value="">Sin asignar</option>
                      {team.map((u: any) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className={lbl}>Descripción</label>
                <textarea rows={2} className={`${inp} resize-none`} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detalles adicionales…" />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={save} disabled={pending}
                  className="flex-1 py-3 bg-ink-900 text-white rounded-full font-bold text-sm hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid disabled:opacity-50">
                  {pending ? 'Guardando…' : modal === 'edit' ? 'Guardar cambios' : 'Crear Tarea'}
                </button>
                <button onClick={() => setModal(null)} className="px-5 py-3 ring-1 ring-ink-900/10 rounded-full text-sm text-ink-700 hover:bg-ink-900/5 transition">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
