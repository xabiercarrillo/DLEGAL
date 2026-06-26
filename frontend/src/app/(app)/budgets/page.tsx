'use client'
import AppLayout from '@/components/layout/AppLayout'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatPYG, formatDate } from '@/lib/utils'
import {
  FileCheck, Clock, CheckCircle, XCircle, Plus, Send,
  X, Edit3, Trash2, ChevronRight, DollarSign, Copy,
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-ink-900/[0.05] text-ink-600 border-ink-900/[0.06]',  icon: Clock      },
  enviado:    { label: 'Enviado',    cls: 'bg-ink-900/[0.05] text-ink-600 border-ink-900/[0.06]',  icon: Send       },
  aprobado:   { label: 'Aprobado',   cls: 'bg-gold-400/12 text-gold-700 border-gold-600/20',       icon: CheckCircle},
  rechazado:  { label: 'Rechazado',  cls: 'bg-rose-500/10 text-rose-700 border-rose-600/20',       icon: XCircle    },
  facturado:  { label: 'Facturado',  cls: 'bg-gold-400/12 text-gold-700 border-gold-600/20',       icon: FileCheck  },
}
const STATUS_FLOW: Record<string, string[]> = {
  pendiente: ['enviado', 'rechazado'],
  enviado:   ['aprobado', 'rechazado'],
  aprobado:  ['facturado'],
  rechazado: ['pendiente'],
  facturado: [],
}
const EMPTY = { title: '', amount: '', valid_until: '', description: '', client_name: '', notes: '' }
const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
const lbl = 'block text-[11px] font-semibold text-ink-500 mb-1.5 uppercase tracking-wider'

export default function BudgetsPage() {
  const qc = useQueryClient()
  const [modal, setModal]  = useState<'create'|'edit'|null>(null)
  const [form, setForm]    = useState<any>({ ...EMPTY })
  const [selected, setSel] = useState<any>(null)
  const [statusF, setStatusF] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.get('/budgets').then(r => r.data),
  })

  const allItems: any[] = data?.items || []
  const items = statusF ? allItems.filter(b => b.status === statusF) : allItems

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/budgets', { ...d, amount: parseFloat(d.amount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); setModal(null); toast.success('Presupuesto creado') },
    onError: () => toast.error('Error al crear'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => api.put(`/budgets/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); setModal(null); toast.success('Actualizado') },
    onError: () => toast.error('Error al actualizar'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/budgets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); toast.success('Eliminado') },
    onError: () => toast.error('Error al eliminar'),
  })
  const statusMut = useMutation({
    mutationFn: ({ id, status }: any) => api.put(`/budgets/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); toast.success('Estado actualizado') },
    onError: () => toast.error('Error'),
  })

  function openCreate() { setForm({ ...EMPTY }); setSel(null); setModal('create') }
  function openEdit(b: any) { setForm({ ...b, amount: b.amount?.toString() }); setSel(b); setModal('edit') }
  function save() {
    if (!form.title || !form.amount) return toast.error('Título y monto son obligatorios')
    if (modal === 'create') createMut.mutate(form)
    else updateMut.mutate({ id: selected.id, d: { ...form, amount: parseFloat(form.amount) } })
  }

  // Stats
  const pending  = allItems.filter(b => b.status === 'pendiente').length
  const approved = allItems.filter(b => b.status === 'aprobado').length
  const totalApproved = allItems.filter(b => b.status === 'aprobado').reduce((s: number, b: any) => s + b.amount, 0)
  const totalAll = allItems.reduce((s: number, b: any) => s + (b.amount || 0), 0)

  return (
    <AppLayout title="Presupuestos y Cotizaciones">
      <PageHeader
        icon={FileCheck}
        title="Presupuestos"
        description="Presupuestos y honorarios propuestos a clientes."
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 bg-ink-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid shadow-tinted-sm flex-shrink-0">
            <Plus className="w-4 h-4" strokeWidth={1.7} />Nuevo presupuesto
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {[
          { l:'Pendientes de respuesta', v:pending,                 cls:'text-ink-900',   bg:'bg-paper'  },
          { l:'Aprobados',               v:approved,                cls:'text-gold-700',  bg:'bg-paper'  },
          { l:'Total aprobado',          v:formatPYG(totalApproved),cls:'text-gold-700',  bg:'bg-paper'  },
          { l:'Valor total cartera',     v:formatPYG(totalAll),     cls:'text-ink-900',   bg:'bg-paper'  },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
            <p className={`text-xl font-semibold tnum ${c.cls}`}>{c.v}</p>
            <p className="text-xs text-ink-400 mt-0.5">{c.l}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex gap-1 p-1 bg-ink-900/[0.05] ring-1 ring-ink-900/[0.06] rounded-xl flex-wrap">
          <button onClick={() => setStatusF('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!statusF?'bg-white text-ink-900 shadow-tinted-sm':'text-ink-500 hover:text-ink-700'}`}>
            Todos ({allItems.length})
          </button>
          {Object.entries(STATUS).map(([v, { label }]) => (
            <button key={v} onClick={() => setStatusF(statusF === v ? '' : v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusF===v?'bg-white text-ink-900 shadow-tinted-sm':'text-ink-500 hover:text-ink-700'}`}>
              {label} ({allItems.filter(b => b.status === v).length})
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-24 bg-ink-900/[0.04] rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title={statusF ? `Sin presupuestos "${STATUS[statusF]?.label}"` : 'Sin presupuestos'}
          description={statusF ? 'No hay presupuestos en este estado. Probá con otro filtro.' : 'Cotizá tus servicios jurídicos y hacé seguimiento de cada propuesta enviada al cliente.'}
          action={
            <button onClick={openCreate} className="flex items-center gap-2 bg-ink-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid shadow-tinted-sm">
              <Plus className="w-4 h-4" strokeWidth={1.7} />Crear primer presupuesto
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((b: any) => {
            const s = STATUS[b.status] || STATUS.pendiente
            const Icon = s.icon
            const nextSteps = STATUS_FLOW[b.status] || []
            const isExpired = b.valid_until && new Date(b.valid_until) < new Date() && !['aprobado','facturado'].includes(b.status)

            return (
              <div key={b.id} className={`bg-white rounded-2xl ring-1 transition hover:bg-ink-900/[0.02] ${isExpired ? 'ring-rose-600/20' : 'ring-ink-900/[0.06]'}`}>
                <div className="p-4 flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${s.cls}`}>
                    <Icon className="w-5 h-5" strokeWidth={1.7} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <p className="font-display font-semibold text-ink-900 truncate">{b.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold border ${s.cls}`}>{s.label}</span>
                      {isExpired && <span className="text-xs bg-rose-500/10 text-rose-700 px-2 py-0.5 rounded-lg font-semibold">Vencido</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-ink-400">
                      {b.client_name && <span>Cliente: {b.client_name}</span>}
                      {b.valid_until && <span>Válido hasta: {formatDate(b.valid_until)}</span>}
                      <span>Creado: {formatDate(b.created_at)}</span>
                    </div>
                    {b.description && <p className="text-xs text-ink-400 mt-1 truncate">{b.description}</p>}
                    {/* Status flow buttons */}
                    {nextSteps.length > 0 && (
                      <div className="flex gap-2 mt-2.5">
                        {nextSteps.map(ns => (
                          <button key={ns} onClick={() => statusMut.mutate({ id: b.id, status: ns })}
                            className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition hover:bg-ink-900/[0.02] ${STATUS[ns]?.cls}`}>
                            → {STATUS[ns]?.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="font-semibold text-ink-900 text-lg tnum">{formatPYG(b.amount)}</p>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-ink-900/10 text-ink-400 hover:text-ink-600 transition"><Edit3 className="w-3.5 h-3.5" strokeWidth={1.7} /></button>
                      <button onClick={() => { navigator.clipboard.writeText(`Presupuesto: ${b.title}\nMonto: ${formatPYG(b.amount)}\n${b.description||''}`); toast.success('Copiado') }}
                        className="p-1.5 rounded-lg hover:bg-ink-900/10 text-ink-400 hover:text-ink-600 transition"><Copy className="w-3.5 h-3.5" strokeWidth={1.7} /></button>
                      <button onClick={() => { if (confirm(`¿Eliminar "${b.title}"?`)) deleteMut.mutate(b.id) }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-ink-400 hover:text-rose-600 transition"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.7} /></button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-ink-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-tinted-lg overflow-hidden">
            <div className="bg-ink-900 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-white">{modal==='create'?'Nuevo presupuesto':'Editar presupuesto'}</h2>
                <p className="text-xs text-white/50 mt-0.5">Cotización de servicios jurídicos</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 transition"><X className="w-4 h-4" strokeWidth={1.7} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div><label className={lbl}>Título / Servicio *</label><input className={inp} value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ej: Asesoría legal — Contrato de arrendamiento" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Monto (₲) *</label><input type="number" min="0" className={inp} value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="500000" /></div>
                <div><label className={lbl}>Válido hasta</label><input type="date" className={inp} value={form.valid_until||''} onChange={e=>setForm({...form,valid_until:e.target.value})} /></div>
              </div>
              <div><label className={lbl}>Cliente / Empresa</label><input className={inp} value={form.client_name||''} onChange={e=>setForm({...form,client_name:e.target.value})} placeholder="Nombre del cliente" /></div>
              <div><label className={lbl}>Descripción / Alcance del servicio</label><textarea rows={3} className={`${inp} resize-none`} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Detallar el alcance, condiciones, plazos…" /></div>
              <div><label className={lbl}>Notas internas</label><input className={inp} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Para uso interno, no se muestra al cliente" /></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-ink-900/[0.06]">
              <button onClick={save} disabled={createMut.isPending||updateMut.isPending}
                className="flex-1 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] ease-fluid transition disabled:opacity-50">
                {createMut.isPending||updateMut.isPending ? 'Guardando…' : modal==='create' ? 'Crear presupuesto' : 'Guardar cambios'}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-3 ring-1 ring-ink-900/10 text-ink-600 hover:bg-ink-900/[0.03] rounded-xl transition text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
