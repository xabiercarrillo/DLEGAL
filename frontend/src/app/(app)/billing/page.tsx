'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi, clientsApi, casesApi } from '@/lib/api'
import { formatPYG, formatDate } from '@/lib/utils'
import { useState } from 'react'
import { Receipt, Plus, X, CheckCircle, FileText, ExternalLink, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { validate, ruleRequired, rulePositive } from '@/lib/validation'

const EMPTY = { client_id: '', case_id: '', description: '', amount: '', vat_rate: 10, invoice_type: 'A', issue_date: new Date().toISOString().slice(0,10), due_date: '' }

const STATUS_MAP: Record<string,{label:string;cls:string}> = {
  draft: { label: 'Borrador', cls: 'bg-ink-900/[0.05] text-ink-600' },
  issued: { label: 'Emitida', cls: 'bg-ink-900/[0.05] text-ink-600' },
  emitida: { label: 'Emitida', cls: 'bg-ink-900/[0.05] text-ink-600' },
  enviada: { label: 'Enviada', cls: 'bg-ink-900/[0.05] text-ink-600' },
  sent: { label: 'Enviada', cls: 'bg-ink-900/[0.05] text-ink-600' },
  paid: { label: 'Pagada', cls: 'bg-gold-400/12 text-gold-700' },
  pagada: { label: 'Pagada', cls: 'bg-gold-400/12 text-gold-700' },
  vencida: { label: 'Vencida', cls: 'bg-rose-500/10 text-rose-700' },
  overdue: { label: 'Vencida', cls: 'bg-rose-500/10 text-rose-700' },
}

export default function BillingPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({...EMPTY})
  const [errors, setErrors] = useState<Record<string,string>>({})

  const setField = (k: string, v: any) => {
    setForm({ ...form, [k]: v })
    if (errors[k]) setErrors(prev => { const n = { ...prev }; delete n[k]; return n })
  }
  
  const { data, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => billingApi.invoices.list({ limit: 50 }).then(r => r.data) })
  const { data: clientsData } = useQuery({ queryKey: ['clients-sel'], queryFn: () => clientsApi.list({ limit: 200 }).then(r => r.data) })
  const { data: casesData } = useQuery({ queryKey: ['cases-sel'], queryFn: () => casesApi.list({ limit: 100 }).then(r => r.data) })

  const items: any[] = data?.items || data || []
  const clients: any[] = clientsData?.items || clientsData || []
  const cases: any[] = casesData?.items || casesData || []

  const createMut = useMutation({
    mutationFn: (d: any) => billingApi.invoices.create(d),
    onSuccess: () => { toast.success('Factura creada'); qc.invalidateQueries({ queryKey: ['invoices'] }); setModal(false) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const markPaidMut = useMutation({
    mutationFn: (id: string) => billingApi.invoices.markPaid(id),
    onSuccess: () => { toast.success('Marcada como pagada'); qc.invalidateQueries({ queryKey: ['invoices'] }) },
  })

  // IVA calc
  const amount = parseFloat(form.amount) || 0
  const iva = amount * (form.vat_rate / (100 + form.vat_rate))
  const net = amount - iva

  const save = () => {
    const errs = validate({
      description: { value: form.description, rules: [ruleRequired('La descripción es requerida')] },
      amount: { value: form.amount, rules: [rulePositive('El monto debe ser mayor a 0')] },
    })
    if (Object.keys(errs).length) { setErrors(errs); toast.error('Revisá los campos marcados'); return }
    setErrors({})
    createMut.mutate({ ...form, amount: parseFloat(form.amount) })
  }

  const openPdf = (id: string) => window.open(billingApi.invoices.pdfUrl(id), '_blank')

  const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
  const inpErr = 'w-full px-3 py-2.5 bg-white ring-1 ring-rose-400 rounded-xl text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-rose-400 transition'
  const err = (f: string) => errors[f] ? inpErr : inp
  const lbl = 'block text-[11px] font-semibold text-ink-500 mb-1.5 uppercase tracking-wider'

  const totalPending = items.filter(i => ['issued','emitida','enviada','sent','vencida','overdue'].includes(i.status)).reduce((s:number,i:any)=>s+(i.balance||i.amount||0),0)
  const totalMonth = items.filter(i => (i.paid_at||'').startsWith(new Date().toISOString().slice(0,7)) || (i.status==='paid'||i.status==='pagada')).reduce((s:number,i:any)=>s+(i.amount||0),0)

  return (
    <AppLayout title="Facturación SET">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <p className="text-xs text-ink-400 mb-1">Total facturas</p>
          <p className="text-2xl font-semibold text-ink-900 tnum">{items.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <p className="text-xs text-ink-400 mb-1">Por cobrar</p>
          <p className="text-xl font-semibold text-rose-600 tnum">{formatPYG(totalPending)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <p className="text-xs text-ink-400 mb-1">Cobrado (cobradas)</p>
          <p className="text-xl font-semibold text-gold-700 tnum">{formatPYG(totalMonth)}</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => { setForm({...EMPTY}); setErrors({}); setModal(true) }}
          className="flex items-center gap-2 bg-ink-900 text-white px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-ink-800 active:scale-[0.98] ease-fluid transition">
          <Plus className="w-4 h-4" strokeWidth={1.7} /> Nueva factura
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-20 bg-white rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <Receipt className="w-12 h-12 text-ink-200 mx-auto mb-3" strokeWidth={1.7} />
          <p className="text-ink-500">Sin facturas registradas</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-ink-900/[0.06] overflow-hidden shadow-tinted-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-paper border-b border-ink-900/[0.06]">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-ink-400 uppercase">N° / Timbrado</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-ink-400 uppercase">Cliente</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-ink-400 uppercase">Descripción</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-ink-400 uppercase">Fecha</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-ink-400 uppercase">Monto</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-ink-400 uppercase">Estado</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-ink-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/[0.05]">
                {items.map((inv: any) => {
                  const st = STATUS_MAP[inv.status] || { label: inv.status, cls: 'bg-ink-900/[0.05] text-ink-600' }
                  const isPaid = inv.status === 'paid' || inv.status === 'pagada'
                  return (
                    <tr key={inv.id} className="hover:bg-ink-900/[0.02] transition">
                      <td className="py-3 px-4">
                        <p className="font-mono font-semibold text-ink-800 tnum">{inv.number || inv.id?.slice(0,8)}</p>
                        {inv.timbrado_number && <p className="text-xs text-ink-400">Timb. {inv.timbrado_number}</p>}
                        <span className="text-xs text-ink-400 bg-ink-900/10 px-1.5 py-0.5 rounded">Tipo {inv.invoice_type||'A'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-ink-800">{inv.client?.full_name || '—'}</p>
                        {inv.client?.ruc && <p className="text-xs text-ink-400">RUC {inv.client.ruc}</p>}
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        <p className="text-ink-600 truncate text-sm">{inv.description}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-ink-600">{formatDate(inv.issue_date)}</p>
                        {inv.due_date && <p className="text-xs text-ink-400">Vence: {formatDate(inv.due_date)}</p>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="font-semibold text-ink-900 tnum">{formatPYG(inv.amount)}</p>
                        {inv.vat_rate && <p className="text-xs text-ink-400">IVA {inv.vat_rate}%</p>}
                        {inv.balance > 0 && inv.balance < inv.amount && (
                          <p className="text-xs text-rose-600 font-medium tnum">Saldo: {formatPYG(inv.balance)}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs px-2 py-1 rounded-lg font-medium ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openPdf(inv.id)} title="Ver/Imprimir PDF"
                            className="p-2 text-ink-400 hover:text-ink-900 hover:bg-ink-900/10 rounded-lg transition">
                            <FileText className="w-4 h-4" strokeWidth={1.7} />
                          </button>
                          {!isPaid && (
                            <button onClick={() => markPaidMut.mutate(inv.id)} title="Marcar como pagada"
                              className="p-2 text-ink-400 hover:text-gold-700 hover:bg-gold-400/12 rounded-lg transition">
                              <CheckCircle className="w-4 h-4" strokeWidth={1.7} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {modal && (
        <div className="fixed inset-0 bg-ink-950/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-tinted-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between bg-ink-900 px-6 py-4 mb-5">
              <div>
                <h2 className="font-display font-semibold text-white text-lg">Nueva factura SET</h2>
                <p className="text-white/50 text-xs">Comprobante para la SET</p>
              </div>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-white/60" strokeWidth={1.7} /></button>
            </div>
            <div className="px-6 pb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className={lbl}>Descripción *</label>
                <input className={err('description')} value={form.description} onChange={e=>setField('description',e.target.value)} placeholder="Servicios profesionales — Caso XYZ"/>
                {errors.description && <p className="mt-1 text-xs text-rose-600">{errors.description}</p>}
              </div>
              <div><label className={lbl}>Cliente</label>
                <select className={inp} value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}>
                  <option value="">Sin cliente</option>
                  {clients.map((c:any)=><option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Caso</label>
                <select className={inp} value={form.case_id} onChange={e=>setForm({...form,case_id:e.target.value})}>
                  <option value="">Sin caso</option>
                  {cases.map((c:any)=><option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Monto total (₲) *</label>
                <input type="number" min="0" className={err('amount')} value={form.amount} onChange={e=>setField('amount',e.target.value)} placeholder="0"/>
                {errors.amount && <p className="mt-1 text-xs text-rose-600">{errors.amount}</p>}
              </div>
              <div><label className={lbl}>IVA %</label>
                <select className={inp} value={form.vat_rate} onChange={e=>setForm({...form,vat_rate:+e.target.value})}>
                  <option value={10}>10%</option>
                  <option value={5}>5%</option>
                  <option value={0}>Exento</option>
                </select>
              </div>
              {amount > 0 && (
                <div className="col-span-2 bg-ink-900/[0.04] rounded-xl p-3 text-sm">
                  <div className="flex justify-between"><span className="text-ink-500">Neto:</span><span className="font-semibold tnum">{formatPYG(net)}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-ink-500">IVA {form.vat_rate}%:</span><span className="font-semibold tnum">{formatPYG(iva)}</span></div>
                  <div className="flex justify-between mt-1 pt-1 border-t border-ink-900/[0.06]"><span className="font-semibold">Total:</span><span className="font-semibold text-ink-900 tnum">{formatPYG(amount)}</span></div>
                </div>
              )}
              <div><label className={lbl}>Tipo Comprobante</label>
                <select className={inp} value={form.invoice_type} onChange={e=>setForm({...form,invoice_type:e.target.value})}>
                  {['A','B','C','E'].map(t=><option key={t} value={t}>Tipo {t}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Fecha emisión</label>
                <input type="date" className={inp} value={form.issue_date} onChange={e=>setForm({...form,issue_date:e.target.value})}/>
              </div>
              <div><label className={lbl}>Fecha vencimiento</label>
                <input type="date" className={inp} value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={save} disabled={createMut.isPending}
                className="flex-1 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] ease-fluid transition disabled:opacity-50">
                {createMut.isPending?'Creando...':'Crear factura'}
              </button>
              <button onClick={() => setModal(false)} className="px-5 py-3 ring-1 ring-ink-900/10 text-ink-600 hover:bg-ink-900/[0.03] rounded-xl text-sm transition">Cancelar</button>
            </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
