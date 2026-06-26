'use client'
import AppLayout from '@/components/layout/AppLayout'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatPYG, formatDate } from '@/lib/utils'
import {
  DollarSign, AlertTriangle, Bell, Clock, CheckCircle,
  Send, MessageSquare, FileText, ChevronDown, ChevronUp,
  CreditCard, TrendingUp, History, X, Phone,
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

const STATUS_CLS: Record<string, string> = {
  emitida: 'bg-ink-900/[0.05] text-ink-600 border-ink-900/[0.06]',
  enviada: 'bg-ink-900/[0.05] text-ink-600 border-ink-900/[0.06]',
  vencida: 'bg-rose-500/10 text-rose-700 border-rose-600/20',
  cobrada: 'bg-gold-400/12 text-gold-700 border-gold-600/20',
  pagada:  'bg-gold-400/12 text-gold-700 border-gold-600/20',
}
const STATUS_LABEL: Record<string, string> = {
  emitida: 'Emitida', enviada: 'Enviada', vencida: 'Vencida', cobrada: 'Cobrada', pagada: 'Cobrada',
}
const PAID_ST = ['cobrada', 'pagada', 'paid']

const CONTACT_METHODS = [
  { key: 'email',    icon: Send,          label: 'Email',      cls: 'bg-ink-900/[0.04] text-ink-600 border-ink-900/[0.08] hover:bg-ink-900/[0.07]' },
  { key: 'whatsapp', icon: MessageSquare, label: 'WhatsApp',   cls: 'bg-gold-400/12 text-gold-700 border-gold-600/20 hover:bg-gold-400/20' },
  { key: 'phone',    icon: Phone,         label: 'Llamada',    cls: 'bg-ink-900/[0.04] text-ink-600 border-ink-900/[0.08] hover:bg-ink-900/[0.07]' },
]

function daysOverdue(dateStr: string) {
  if (!dateStr) return 0
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

export default function CollectionsPage() {
  const qc = useQueryClient()
  const [statusF, setStatusF] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'overdue'>('overdue')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [payModal, setPayModal] = useState<any>(null)
  const [payAmt, setPayAmt] = useState('')

  const { data: stats } = useQuery({
    queryKey: ['collection-stats'],
    queryFn: () => api.get('/collections/stats').then(r => r.data),
  })
  const { data, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: () => api.get('/collections').then(r => r.data),
  })

  const allItems: any[] = data?.items || []

  const filtered = statusF ? allItems.filter(c => c.status === statusF) : allItems
  const items = [...filtered].sort((a, b) => {
    if (sortBy === 'amount')  return (b.amount || 0) - (a.amount || 0)
    if (sortBy === 'overdue') return daysOverdue(b.due_date) - daysOverdue(a.due_date)
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })

  const isPaidSt = (s: string) => PAID_ST.includes(s)
  const balOf = (c: any) => (c.balance ?? c.total ?? c.amount ?? 0)
  const pendingAmt   = stats?.pending_amount   ?? allItems.filter(c => !isPaidSt(c.status)).reduce((s: number, c: any) => s + balOf(c), 0)
  const overdueAmt   = stats?.overdue_amount   ?? allItems.filter(c => c.status === 'vencida').reduce((s: number, c: any) => s + balOf(c), 0)
  const overdueCount = stats?.overdue_count    ?? allItems.filter(c => c.status === 'vencida').length
  const collectedAmt = stats?.collected_amount ?? allItems.filter(c => isPaidSt(c.status)).reduce((s: number, c: any) => s + (c.total||c.amount||0), 0)
  const collectedCount = stats?.collected_count ?? allItems.filter(c => isPaidSt(c.status)).length

  const reminderMut = useMutation({
    mutationFn: (id: string) => api.post(`/collections/${id}/send-reminder`),
    onSuccess: () => { toast.success('Recordatorio enviado por email'); qc.invalidateQueries({ queryKey: ['collections'] }) },
    onError: () => toast.error('Error al enviar recordatorio'),
  })
  const whatsappMut = useMutation({
    mutationFn: (id: string) => api.post(`/collections/${id}/send-whatsapp`),
    onSuccess: () => { toast.success('Mensaje WhatsApp enviado'); qc.invalidateQueries({ queryKey: ['collections'] }) },
    onError: () => toast.error('Error al enviar WhatsApp'),
  })
  const markPaidMut = useMutation({
    mutationFn: (id: string) => api.post(`/collections/${id}/mark-paid`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['collection-stats'] })
      toast.success('Factura marcada como pagada')
    },
    onError: () => toast.error('Error al marcar como pagada'),
  })
  const partialPayMut = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.post(`/collections/${id}/partial-payment`, { amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['collection-stats'] })
      toast.success('Pago parcial registrado')
      setPayModal(null)
      setPayAmt('')
    },
    onError: () => toast.error('Error al registrar pago'),
  })

  const handleSendContact = (method: string, item: any) => {
    if (method === 'email')    reminderMut.mutate(item.id)
    if (method === 'whatsapp') whatsappMut.mutate(item.id)
    if (method === 'phone') {
      const phone = item.client_phone || item.client?.phone
      if (phone) window.open(`tel:${phone}`)
      else toast.error('Sin teléfono registrado')
    }
  }

  const recTasa = collectedCount > 0
    ? Math.round((collectedCount / Math.max(allItems.length, 1)) * 100) : 0

  return (
    <AppLayout title="Gestión de Cobranzas">
      <PageHeader
        icon={DollarSign}
        title="Cobranzas"
        description="Cobranzas pendientes y gestión de cuentas por cobrar."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <div className="bg-ink-900 rounded-2xl p-5 text-white">
          <DollarSign className="w-5 h-5 text-gold-400 mb-2" strokeWidth={1.7} />
          <p className="text-2xl font-semibold text-gold-400 tnum">{formatPYG(pendingAmt)}</p>
          <p className="text-white/60 text-xs mt-0.5">Total por cobrar</p>
        </div>
        <div className="bg-white rounded-2xl p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <AlertTriangle className="w-5 h-5 text-rose-500 mb-2" strokeWidth={1.7} />
          <p className="text-2xl font-semibold text-rose-600 tnum">{formatPYG(overdueAmt)}</p>
          <p className="text-ink-400 text-xs mt-0.5">Vencido ({overdueCount} factura{overdueCount !== 1 ? 's' : ''})</p>
        </div>
        <div className="bg-white rounded-2xl p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <CheckCircle className="w-5 h-5 text-gold-500 mb-2" strokeWidth={1.7} />
          <p className="text-2xl font-semibold text-gold-700 tnum">{formatPYG(collectedAmt)}</p>
          <p className="text-ink-400 text-xs mt-0.5">Cobrado este mes</p>
        </div>
        <div className="bg-white rounded-2xl p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <TrendingUp className="w-5 h-5 text-gold-500 mb-2" strokeWidth={1.7} />
          <p className="text-2xl font-semibold text-ink-900 tnum">{recTasa}%</p>
          <p className="text-ink-400 text-xs mt-0.5">Tasa de recuperación</p>
        </div>
      </div>

      {/* Filters + Sort */}
      <div className="flex flex-wrap justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          {(['', 'emitida', 'enviada', 'vencida', 'cobrada'] as const).map(s => (
            <button key={s} onClick={() => setStatusF(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                statusF === s
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white text-ink-600 ring-1 ring-ink-900/10 border-transparent hover:bg-ink-900/[0.03]'
              }`}>
              {s === '' ? 'Todas' : STATUS_LABEL[s]}
              {s !== '' && <span className="ml-1.5 opacity-60">({allItems.filter(c => c.status === s).length})</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400">Ordenar:</span>
          {[['overdue', 'Atraso'], ['amount', 'Monto'], ['date', 'Fecha']].map(([k, l]) => (
            <button key={k} onClick={() => setSortBy(k as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                sortBy === k ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-500 ring-1 ring-ink-900/10 border-transparent hover:bg-ink-900/[0.03]'
              }`}>{l}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm p-4 flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-ink-900/[0.04] animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-40 rounded bg-ink-900/[0.04] animate-pulse" />
                <div className="h-3 w-56 rounded bg-ink-900/[0.04] animate-pulse" />
                <div className="h-7 w-48 rounded-xl bg-ink-900/[0.04] animate-pulse mt-2" />
              </div>
              <div className="h-5 w-24 rounded bg-ink-900/[0.04] animate-pulse" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title={statusF ? `Sin facturas "${STATUS_LABEL[statusF]}"` : 'Sin facturas en cobranza'}
          description={statusF
            ? 'No hay facturas con ese estado. Probá con otro filtro.'
            : 'Las facturas emitidas desde facturación aparecerán aquí para su seguimiento y cobro.'}
        />
      ) : (
        <div className="space-y-2">
          {items.map((c: any) => {
            const cls = STATUS_CLS[c.status] || 'bg-ink-900/[0.05] text-ink-600 border-ink-900/[0.06]'
            const overdue = daysOverdue(c.due_date)
            const isOpen = expanded === c.id
            const isPaid = PAID_ST.includes(c.status)
            const paid = c.paid_amount || 0
            const total = c.total || c.amount || 0
            const balance = total - paid
            const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0

            return (
              <div key={c.id} className={`bg-white rounded-2xl ring-1 transition ${
                c.status === 'vencida' ? 'ring-rose-600/20 shadow-tinted-sm' : 'ring-ink-900/[0.06]'
              }`}>
                {/* Main row */}
                <div className="p-4 flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-bold border ${cls}`}>
                    <FileText className="w-5 h-5" strokeWidth={1.7} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-display font-semibold text-ink-900">{c.client_name || c.client?.full_name || 'Cliente'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold border ${cls}`}>
                        {STATUS_LABEL[c.status] || c.status}
                      </span>
                      {c.status === 'vencida' && overdue > 0 && (
                        <span className="text-xs bg-rose-500/10 text-rose-700 border border-rose-600/20 px-2 py-0.5 rounded-lg font-semibold">
                          {overdue}d atrasado
                        </span>
                      )}
                      {c.number && (
                        <span className="text-xs text-ink-400">Fac. #{c.number}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-ink-400">
                      {c.description && <span className="truncate max-w-xs">{c.description}</span>}
                      {c.due_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" strokeWidth={1.7} />Vence: {formatDate(c.due_date)}</span>}
                    </div>

                    {/* Partial payment progress */}
                    {paid > 0 && total > 0 && !isPaid && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-ink-400 mb-0.5 tnum">
                          <span>Pagado: {formatPYG(paid)}</span>
                          <span>Saldo: {formatPYG(balance)}</span>
                        </div>
                        <div className="h-1.5 bg-ink-900/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gold-500 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {!isPaid && (
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {CONTACT_METHODS.map(m => (
                          <button key={m.key} onClick={() => handleSendContact(m.key, c)}
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border font-semibold transition ${m.cls}`}>
                            <m.icon className="w-3 h-3" strokeWidth={1.7} />{m.label}
                          </button>
                        ))}
                        <button onClick={() => { setPayModal(c); setPayAmt('') }}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border bg-ink-900/[0.04] text-ink-600 border-ink-900/[0.08] font-semibold hover:bg-ink-900/[0.07] transition">
                          <CreditCard className="w-3 h-3" strokeWidth={1.7} />Pago parcial
                        </button>
                        <button
                          onClick={() => { if (confirm(`¿Marcar como PAGADA la factura de ${c.client_name}?`)) markPaidMut.mutate(c.id) }}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border bg-gold-400/12 text-gold-700 border-gold-600/20 font-semibold hover:bg-gold-400/20 transition">
                          <CheckCircle className="w-3 h-3" strokeWidth={1.7} />Marcar pagada
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-semibold text-ink-900 tnum">{formatPYG(total)}</p>
                    {/* History toggle */}
                    <button onClick={() => setExpanded(isOpen ? null : c.id)}
                      className="mt-1 flex items-center gap-1 text-[11px] text-ink-400 hover:text-ink-600 transition ml-auto">
                      <History className="w-3 h-3" strokeWidth={1.7} />Historial
                      {isOpen ? <ChevronUp className="w-3 h-3" strokeWidth={1.7} /> : <ChevronDown className="w-3 h-3" strokeWidth={1.7} />}
                    </button>
                  </div>
                </div>

                {/* Expanded history */}
                {isOpen && (
                  <div className="border-t border-ink-900/[0.06] px-4 py-3 bg-paper rounded-b-2xl">
                    {(c.contact_history?.length || c.actions?.length) ? (
                      <div className="space-y-1.5">
                        {(c.contact_history || c.actions || []).map((h: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-ink-500">
                            <span className="text-ink-300">{formatDate(h.date || h.created_at)}</span>
                            <Bell className="w-3 h-3 text-ink-400" strokeWidth={1.7} />
                            <span>{h.action || h.type || h.description || 'Acción'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-ink-400 text-center py-2">Sin historial de contacto</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Partial Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-ink-950/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-tinted-lg overflow-hidden">
            <div className="flex justify-between items-start bg-ink-900 px-6 py-4">
              <div>
                <h3 className="font-display font-semibold text-white text-lg">Registrar pago parcial</h3>
                <p className="text-sm text-white/50 mt-0.5">{payModal.client_name || 'Cliente'}</p>
              </div>
              <button onClick={() => setPayModal(null)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" strokeWidth={1.7} />
              </button>
            </div>

            <div className="p-6">
            <div className="bg-paper rounded-xl p-3 mb-4 flex justify-between text-sm">
              <div>
                <p className="text-ink-400 text-xs">Total factura</p>
                <p className="font-semibold text-ink-900 tnum">{formatPYG(payModal.total || payModal.amount || 0)}</p>
              </div>
              {(payModal.paid_amount || 0) > 0 && (
                <div>
                  <p className="text-ink-400 text-xs">Ya pagado</p>
                  <p className="font-semibold text-gold-700 tnum">{formatPYG(payModal.paid_amount)}</p>
                </div>
              )}
              <div>
                <p className="text-ink-400 text-xs">Saldo pendiente</p>
                <p className="font-semibold text-rose-600 tnum">
                  {formatPYG((payModal.total || payModal.amount || 0) - (payModal.paid_amount || 0))}
                </p>
              </div>
            </div>

            <label className="block text-[11px] font-semibold text-ink-500 mb-1.5 uppercase tracking-wider">Monto recibido (₲)</label>
            <input
              type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)}
              placeholder="Ej: 500000"
              className="w-full bg-white ring-1 ring-ink-900/10 rounded-xl px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition mb-4 tnum"
            />

            <div className="grid grid-cols-4 gap-2 mb-4">
              {[25, 50, 75, 100].map(pct => (
                <button key={pct} onClick={() => setPayAmt(String(Math.round(((payModal.total || payModal.amount || 0) - (payModal.paid_amount || 0)) * pct / 100)))}
                  className="py-1.5 text-xs font-semibold rounded-lg ring-1 ring-ink-900/10 hover:bg-ink-900/[0.03] hover:text-ink-900 transition text-ink-500 tnum">
                  {pct}%
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setPayModal(null)}
                className="flex-1 py-2.5 rounded-xl ring-1 ring-ink-900/10 text-sm font-semibold text-ink-600 hover:bg-ink-900/[0.03] transition">
                Cancelar
              </button>
              <button
                disabled={!payAmt || Number(payAmt) <= 0 || partialPayMut.isPending}
                onClick={() => partialPayMut.mutate({ id: payModal.id, amount: Number(payAmt) })}
                className="flex-1 py-2.5 rounded-full bg-ink-900 text-white text-sm font-semibold hover:bg-ink-800 active:scale-[0.98] ease-fluid transition disabled:opacity-50">
                {partialPayMut.isPending ? 'Registrando…' : 'Registrar pago'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
