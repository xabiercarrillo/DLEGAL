'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsExtApi, billingApi } from '@/lib/api'
import { formatPYG } from '@/lib/utils'
import { useState } from 'react'
import {
  CreditCard, Banknote, ShieldCheck, Clock, CheckCircle,
  ExternalLink, RefreshCw, X, AlertCircle, Receipt, Smartphone,
  DollarSign, TrendingUp, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

const PROVIDERS = [
  {
    id: 'bancard',
    name: 'Bancard',
    description: 'Tarjetas Paraguay (Visa/MC/AmEx)',
    logo: '🇵🇾',
    currency: 'PYG',
    fee: '3.5% + IVA',
    local: true,
    color: 'bg-ink-900',
    border: 'border-gold-500',
    bg: 'bg-gold-400/[0.06]',
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    description: 'Tarjetas + transferencias bancarias',
    logo: '💳',
    currency: 'PYG',
    fee: '4.99%',
    local: true,
    color: 'bg-ink-900',
    border: 'border-gold-500',
    bg: 'bg-gold-400/[0.06]',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Tarjetas internacionales (USD)',
    logo: '🌎',
    currency: 'USD',
    fee: '2.9% + $0.30',
    local: false,
    color: 'bg-ink-900',
    border: 'border-gold-500',
    bg: 'bg-gold-400/[0.06]',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'PayPal / tarjetas internacionales',
    logo: '🔵',
    currency: 'USD',
    fee: '3.49% + comisión fija',
    local: false,
    color: 'bg-ink-900',
    border: 'border-gold-500',
    bg: 'bg-gold-400/[0.06]',
  },
]

const TX_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente', cls: 'bg-ink-900/[0.05] text-ink-600' },
  completed: { label: 'Completado', cls: 'bg-gold-400/12 text-gold-700' },
  failed:    { label: 'Fallido', cls: 'bg-rose-500/10 text-rose-700' },
  refunded:  { label: 'Reembolsado', cls: 'bg-ink-900/[0.05] text-ink-600' },
}

const QUICK_AMOUNTS = [75_000, 300_000, 500_000]

export default function CheckoutPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'new' | 'history'>('new')
  const [provider, setProvider] = useState('bancard')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [caseId, setCaseId] = useState('')

  const sel = PROVIDERS.find(p => p.id === provider)!

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['payment-history'],
    queryFn: () => paymentsExtApi.list({ limit: 50 }).then((r: any) => r.data),
    enabled: tab === 'history',
  })

  const { data: summary } = useQuery({
    queryKey: ['payment-summary'],
    queryFn: () => paymentsExtApi.summary().then((r: any) => r.data),
  })

  const checkoutMut = useMutation({
    mutationFn: (data: any) => paymentsExtApi.createCheckout(data),
    onSuccess: (resp: any) => {
      const url = resp.data?.checkout_url
      if (url) {
        toast.success('Redirigiendo al portal de pago...')
        window.open(url, '_blank')
      } else {
        toast.success('Pago procesado exitosamente')
      }
      qc.invalidateQueries({ queryKey: ['payment-history'] })
      qc.invalidateQueries({ queryKey: ['payment-summary'] })
      setAmount('')
      setDescription('')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al crear sesión de pago'),
  })

  const handlePay = () => {
    if (!amount || !description) return toast.error('Ingrese monto y descripción')
    const numAmount = parseFloat(amount.replace(/\D/g, ''))
    if (!numAmount || numAmount <= 0) return toast.error('Monto inválido')
    checkoutMut.mutate({
      amount: numAmount,
      currency: sel.currency,
      description,
      provider,
      invoice_id: invoiceId || undefined,
      case_id: caseId || undefined,
      success_url: `${window.location.origin}/checkout?status=success`,
      cancel_url: `${window.location.origin}/checkout?status=cancel`,
    })
  }

  const txList = history?.items || history || []
  const stats = summary || { total_collected: 0, pending_count: 0, completed_count: 0, failed_count: 0 }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-semibold text-ink-900 flex items-center gap-2">
              <CreditCard className="text-ink-400" size={28} strokeWidth={1.7} /> Pagos
            </h1>
            <p className="text-ink-500 text-sm mt-1">Procese pagos de clientes con Bancard, MercadoPago, Stripe o PayPal</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTab('new')} className={`px-4 py-2 rounded-full text-sm font-medium transition ${tab === 'new' ? 'bg-ink-900 text-white' : 'bg-ink-900/[0.05] text-ink-600 hover:bg-ink-900/10'}`}>
              Nuevo pago
            </button>
            <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-full text-sm font-medium transition ${tab === 'history' ? 'bg-ink-900 text-white' : 'bg-ink-900/[0.05] text-ink-600 hover:bg-ink-900/10'}`}>
              Historial
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total recaudado', val: formatPYG(stats.total_collected || 0), icon: TrendingUp, cls: 'text-gold-700 bg-gold-400/[0.06] border-gold-600/20' },
            { label: 'Completados', val: stats.completed_count || 0, icon: CheckCircle, cls: 'text-ink-700 bg-white border-ink-900/[0.06]' },
            { label: 'Pendientes', val: stats.pending_count || 0, icon: Clock, cls: 'text-ink-700 bg-white border-ink-900/[0.06]' },
            { label: 'Fallidos', val: stats.failed_count || 0, icon: AlertCircle, cls: 'text-rose-700 bg-rose-500/10 border-rose-600/20' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className={`rounded-xl border p-4 ${s.cls}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} strokeWidth={1.7} />
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
                <div className="text-xl font-semibold tnum">{s.val}</div>
              </div>
            )
          })}
        </div>

        {tab === 'new' ? (
          <div className="grid grid-cols-5 gap-6">
            {/* Provider selector */}
            <div className="col-span-2 space-y-3">
              <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-wide">Método de pago</h2>
              {PROVIDERS.map(p => (
                <button key={p.id} onClick={() => setProvider(p.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition ${provider === p.id ? `${p.border} ${p.bg}` : 'border-ink-900/[0.06] bg-white hover:border-ink-900/15'}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink-800">{p.name}</span>
                        {p.local && <span className="text-xs bg-gold-400/12 text-gold-700 px-1.5 py-0.5 rounded-full">Local</span>}
                      </div>
                      <div className="text-xs text-ink-500">{p.description}</div>
                    </div>
                    {provider === p.id && <CheckCircle size={18} className="text-gold-600 flex-shrink-0" strokeWidth={1.7} />}
                  </div>
                  <div className="mt-2 text-xs text-ink-400 flex gap-4">
                    <span>Comisión: {p.fee}</span>
                    <span>Moneda: {p.currency}</span>
                  </div>
                </button>
              ))}

              <div className="bg-paper rounded-xl p-4 ring-1 ring-ink-900/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={16} className="text-gold-600" strokeWidth={1.7} />
                  <span className="text-sm font-medium text-ink-700">Pagos seguros</span>
                </div>
                <p className="text-xs text-ink-500 leading-relaxed">
                  Todos los pagos son procesados de forma segura. DLEGAL no almacena datos de tarjetas.
                  Integración certificada con cada proveedor.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="col-span-3">
              <div className="bg-white rounded-2xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
                {/* Provider header */}
                <div className="bg-ink-900 p-5 text-white">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-display font-semibold text-lg">{sel.name}</div>
                      <div className="text-white/60 text-sm">{sel.description}</div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Amount */}
                  <div>
                    <label className="text-sm font-medium text-ink-700 mb-2 block">
                      Monto ({sel.currency}) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 font-medium">
                        {sel.currency === 'PYG' ? '₲' : '$'}
                      </span>
                      <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-8 bg-white ring-1 ring-ink-900/10 rounded-xl px-4 py-3 text-lg tnum text-ink-900 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
                    </div>
                    {/* Quick amounts */}
                    {sel.currency === 'PYG' && (
                      <div className="flex gap-2 mt-2">
                        {QUICK_AMOUNTS.map(a => (
                          <button key={a} onClick={() => setAmount(String(a))}
                            className="text-xs px-3 py-1.5 bg-ink-900/[0.05] hover:bg-gold-400/12 text-ink-600 hover:text-gold-700 rounded-lg transition tnum">
                            {formatPYG(a)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-ink-700 mb-1 block">Descripción *</label>
                    <input value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="Ej: Honorarios caso nro. 1234 — Enero 2026"
                      className="w-full bg-white ring-1 ring-ink-900/10 rounded-xl px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
                  </div>

                  {/* Optional links */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-ink-700 mb-1 block">ID factura (opcional)</label>
                      <div className="relative">
                        <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={14} strokeWidth={1.7} />
                        <input value={invoiceId} onChange={e => setInvoiceId(e.target.value)}
                          placeholder="ID de factura"
                          className="w-full pl-8 bg-white ring-1 ring-ink-900/10 rounded-lg px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-ink-700 mb-1 block">ID expediente (opcional)</label>
                      <input value={caseId} onChange={e => setCaseId(e.target.value)}
                        placeholder="ID del caso"
                        className="w-full bg-white ring-1 ring-ink-900/10 rounded-lg px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
                    </div>
                  </div>

                  {/* Summary */}
                  {amount && parseFloat(amount) > 0 && (
                    <div className="bg-paper rounded-xl p-4 ring-1 ring-ink-900/[0.06]">
                      <div className="text-sm font-medium text-ink-700 mb-2">Resumen</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-ink-600">
                          <span>Monto</span>
                          <span className="tnum">{sel.currency === 'PYG' ? formatPYG(+amount) : `$${(+amount).toFixed(2)}`}</span>
                        </div>
                        <div className="flex justify-between text-ink-500 text-xs">
                          <span>Comisión proveedor ({sel.fee})</span>
                          <span>A cargo del cliente</span>
                        </div>
                        <div className="border-t border-ink-900/[0.06] pt-1 mt-1 flex justify-between font-semibold text-ink-900">
                          <span>Total a pagar</span>
                          <span className="tnum">{sel.currency === 'PYG' ? formatPYG(+amount) : `$${(+amount).toFixed(2)}`}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button onClick={handlePay} disabled={!amount || !description || checkoutMut.isPending}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-ink-900 text-white rounded-full hover:bg-ink-800 active:scale-[0.98] ease-fluid font-semibold text-base disabled:opacity-40 transition">
                    {checkoutMut.isPending ? (
                      <><RefreshCw className="animate-spin" size={18} strokeWidth={1.7} /> Procesando...</>
                    ) : (
                      <><CreditCard size={18} strokeWidth={1.7} /> Procesar pago con {sel.name} <ExternalLink size={14} strokeWidth={1.7} /></>
                    )}
                  </button>

                  <p className="text-xs text-ink-400 text-center">
                    Se abrirá el portal seguro de {sel.name} en una nueva pestaña.
                    El pago se registrará automáticamente al completarse.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Historial */
          <div className="bg-white rounded-xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-ink-900/[0.06] flex items-center justify-between">
              <h2 className="font-display font-semibold text-ink-900">Historial de transacciones</h2>
              <button onClick={() => qc.invalidateQueries({ queryKey: ['payment-history'] })} className="text-ink-400 hover:text-ink-600 p-1 rounded">
                <RefreshCw size={16} strokeWidth={1.7} />
              </button>
            </div>
            {loadingHistory ? (
              <div className="p-12 text-center text-ink-400">
                <RefreshCw className="animate-spin mx-auto mb-3" size={32} strokeWidth={1.7} />Cargando...
              </div>
            ) : txList.length === 0 ? (
              <div className="p-12 text-center text-ink-400">
                <CreditCard className="mx-auto mb-3 text-ink-300" size={40} strokeWidth={1.7} />
                <p className="font-medium">Sin transacciones aún</p>
                <p className="text-sm mt-1">Los pagos procesados aparecerán aquí</p>
              </div>
            ) : (
              <div className="divide-y divide-ink-900/[0.05]">
                {txList.map((tx: any) => {
                  const st = TX_STATUS[tx.status] || TX_STATUS['pending']
                  const prov = PROVIDERS.find(p => p.id === tx.provider)
                  return (
                    <div key={tx.id} className="px-6 py-4 hover:bg-ink-900/[0.02] transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-ink-800">{tx.description || 'Pago'}</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                            </div>
                            <div className="text-sm text-ink-500 flex gap-3 mt-0.5">
                              <span>{prov?.name || tx.provider}</span>
                              {tx.invoice_id && <span>Factura #{tx.invoice_id.slice(0, 8)}</span>}
                              {tx.created_at && <span className="tnum">{new Date(tx.created_at).toLocaleDateString('es-PY')}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-ink-900 tnum">
                            {tx.currency === 'PYG' ? formatPYG(tx.amount) : `$${tx.amount?.toFixed(2)}`}
                          </div>
                          {tx.external_id && (
                            <div className="text-xs text-ink-400 tnum mt-0.5">{tx.external_id.slice(0, 16)}...</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
