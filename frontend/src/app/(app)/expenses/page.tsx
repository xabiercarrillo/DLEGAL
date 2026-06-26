'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi, casesApi } from '@/lib/api'
import { formatPYG, formatDate } from '@/lib/utils'
import { useState } from 'react'
import { TrendingDown, Plus, X, Trash2, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES: Record<string,{ label:string; emoji:string; cls:string }> = {
  tribunal:       { label:'Tribunal',       emoji:'⚖️', cls:'bg-ink-900/[0.05] text-ink-600' },
  notarial:       { label:'Notarial',       emoji:'📜', cls:'bg-ink-900/[0.05] text-ink-600' },
  registro:       { label:'Registro',       emoji:'🏛️', cls:'bg-ink-900/[0.05] text-ink-600' },
  transporte:     { label:'Transporte',     emoji:'🚗', cls:'bg-ink-900/[0.05] text-ink-600' },
  comunicaciones: { label:'Comunicaciones', emoji:'📞', cls:'bg-ink-900/[0.05] text-ink-600' },
  materiales:     { label:'Materiales',     emoji:'📦', cls:'bg-ink-900/[0.05] text-ink-600' },
  peritos:        { label:'Peritos',        emoji:'🔬', cls:'bg-ink-900/[0.05] text-ink-600' },
  otro:           { label:'Otro',           emoji:'📎', cls:'bg-ink-900/[0.05] text-ink-600' },
}
const PAY = ['efectivo','transferencia','cheque','tarjeta','otro']
const EMPTY = { description:'', amount:'', case_id:'', expense_date:new Date().toISOString().slice(0,10), category:'tribunal', payment_method:'efectivo', notes:'', is_reimbursable:true }
const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
const lbl = 'block text-[11px] font-semibold text-ink-500 mb-1.5 uppercase tracking-wider'

export default function ExpensesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'create'|null>(null)
  const [form, setForm]   = useState<any>({ ...EMPTY })
  const [catF, setCatF]   = useState('')
  const [billF, setBillF] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['expenses'], queryFn: () => billingApi.expenses.list({ limit: 200 }).then(r => r.data) })
  const { data: casesData } = useQuery({ queryKey: ['cases-sel'], queryFn: () => casesApi.list({ limit: 200 }).then(r => r.data) })

  const allItems: any[] = data?.items || data || []
  const cases: any[]    = casesData?.items || casesData || []

  const items = allItems.filter(i => {
    if (catF  && i.category !== catF)                              return false
    if (billF === 'yes' && !i.is_reimbursable)                         return false
    if (billF === 'no'  &&  i.is_reimbursable)                         return false
    return true
  })

  const total      = items.reduce((s:number, i:any) => s + (i.amount||0), 0)
  const totalAll   = allItems.reduce((s:number, i:any) => s + (i.amount||0), 0)
  const billable   = allItems.filter(i => i.is_reimbursable).reduce((s:number, i:any) => s + (i.amount||0), 0)

  // Category breakdown
  const catBreak = Object.entries(CATEGORIES).map(([k, v]) => ({
    key:k, ...v,
    total: allItems.filter(i => i.category === k).reduce((s:number, i:any) => s + (i.amount||0), 0),
    count: allItems.filter(i => i.category === k).length,
  })).filter(c => c.count > 0).sort((a,b) => b.total - a.total)

  const createMut = useMutation({
    mutationFn: (d: any) => billingApi.expenses.create({ ...d, amount: parseFloat(d.amount) }),
    onSuccess: () => { toast.success('Gasto registrado'); qc.invalidateQueries({ queryKey: ['expenses'] }); setModal(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => billingApi.expenses.delete?.(id) || Promise.reject('no delete'),
    onSuccess: () => { toast.success('Eliminado'); qc.invalidateQueries({ queryKey: ['expenses'] }) },
    onError: () => toast.error('Error'),
  })

  return (
    <AppLayout title="Gastos">
      {/* Header stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <div className="xl:col-span-2 bg-ink-900 rounded-2xl p-5 text-white shadow-tinted">
          <p className="text-white/60 text-xs mb-1">Total gastos</p>
          <p className="text-3xl font-display font-semibold text-rose-300 tnum">{formatPYG(totalAll)}</p>
          <p className="text-white/40 text-xs mt-1 tnum">{allItems.length} registros</p>
        </div>
        <div className="bg-white rounded-2xl p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <p className="text-xl font-semibold text-gold-700 tnum">{formatPYG(billable)}</p>
          <p className="text-xs text-ink-400 mt-0.5">Reembolsables a clientes</p>
        </div>
        <div className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm flex items-center justify-center">
          <button onClick={() => { setForm({ ...EMPTY, expense_date: new Date().toISOString().slice(0,10) }); setModal('create') }}
            className="flex flex-col items-center gap-2 text-ink-400 hover:text-ink-900 transition">
            <div className="w-10 h-10 rounded-xl bg-ink-900/[0.05] hover:bg-ink-900/10 flex items-center justify-center transition">
              <Plus className="w-5 h-5" strokeWidth={1.7} />
            </div>
            <span className="text-xs font-semibold">Registrar gasto</span>
          </button>
        </div>
      </div>

      {/* Category breakdown */}
      {catBreak.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm p-5 mb-5">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Desglose por categoría</p>
          <div className="space-y-2">
            {catBreak.map(c => (
              <button key={c.key} onClick={() => setCatF(catF === c.key ? '' : c.key)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 transition text-left ${catF === c.key ? 'bg-ink-900/[0.04] ring-1 ring-ink-900/15' : 'hover:bg-ink-900/[0.02]'}`}>
                <span className="text-sm font-medium text-ink-700 flex-1">{c.label}</span>
                <span className="text-xs text-ink-400 tnum">{c.count} reg.</span>
                <div className="w-24 h-1.5 bg-ink-900/10 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-400 rounded-full" style={{ width: `${totalAll ? (c.total / totalAll) * 100 : 0}%` }} />
                </div>
                <span className="text-sm font-semibold text-ink-900 w-28 text-right tnum">{formatPYG(c.total)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {catF && (
          <span className="flex items-center gap-1.5 bg-rose-500/10 text-rose-700 ring-1 ring-rose-600/20 px-3 py-1.5 rounded-xl text-xs font-semibold">
            {CATEGORIES[catF]?.label}
            <button onClick={() => setCatF('')} className="hover:text-rose-900"><X className="w-3 h-3" strokeWidth={1.7} /></button>
          </span>
        )}
        <select className="px-3 py-2 bg-white ring-1 ring-ink-900/10 rounded-xl text-xs text-ink-700 focus:outline-none focus:ring-2 focus:ring-gold-400/70"
          value={billF} onChange={e => setBillF(e.target.value)}>
          <option value="">Todos (facturable/no)</option>
          <option value="yes">Solo facturables</option>
          <option value="no">No facturables</option>
        </select>
        <span className="text-xs text-ink-400 ml-auto tnum">{items.length} registros · {formatPYG(total)}</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <TrendingDown className="w-12 h-12 text-ink-200 mx-auto mb-3" strokeWidth={1.7} />
          <p className="text-ink-400 font-medium">Sin gastos registrados{catF ? ` en "${CATEGORIES[catF]?.label}"` : ''}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper border-b border-ink-900/[0.06]">
              <tr>
                {['Descripción','Categoría','Caso','Fecha','Facturable','Monto',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/[0.05]">
              {items.map((i:any) => {
                const cat = CATEGORIES[i.category]
                return (
                  <tr key={i.id} className="hover:bg-ink-900/[0.02] transition">
                    <td className="px-4 py-3 font-medium text-ink-800 max-w-[200px] truncate">{i.description}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${cat?.cls || 'bg-ink-900/[0.05] text-ink-600'}`}>
                        {cat?.label || i.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-500 text-xs max-w-[120px] truncate">{i.case_title || '—'}</td>
                    <td className="px-4 py-3 text-ink-500 text-xs whitespace-nowrap tnum">{formatDate(i.expense_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${i.is_reimbursable ? 'bg-gold-400/12 text-gold-700' : 'bg-ink-900/[0.05] text-ink-400'}`}>
                        {i.is_reimbursable ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-rose-600 whitespace-nowrap tnum">{formatPYG(i.amount)}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => { if (confirm('¿Eliminar este gasto?')) deleteMut.mutate(i.id) }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-ink-300 hover:text-rose-500 transition">
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.7} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-paper border-t border-ink-900/[0.06]">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase">Total ({items.length} items)</td>
                <td className="px-4 py-3 font-semibold text-rose-600 tnum">{formatPYG(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-ink-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-tinted-lg overflow-hidden">
            <div className="bg-ink-900 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-white">Registrar gasto</h2>
                <p className="text-xs text-white/50 mt-0.5">Tasas, honorarios, transporte y más</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 transition"><X className="w-4 h-4" strokeWidth={1.7} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div><label className={lbl}>Descripción *</label><input className={inp} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Ej: Tasa de presentación — Juzgado Civil 3er turno" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Monto (₲) *</label><input type="number" min="0" className={inp} value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="50000" /></div>
                <div><label className={lbl}>Fecha</label><input type="date" className={inp} value={form.expense_date||''} onChange={e=>setForm({...form,expense_date:e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Categoría</label>
                  <select className={inp} value={form.category||'tribunal'} onChange={e=>setForm({...form,category:e.target.value})}>
                    {Object.entries(CATEGORIES).map(([k,v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Método de pago</label>
                  <select className={inp} value={form.payment_method||'efectivo'} onChange={e=>setForm({...form,payment_method:e.target.value})}>
                    {PAY.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={lbl}>Caso vinculado</label>
                <select className={inp} value={form.case_id||''} onChange={e=>setForm({...form,case_id:e.target.value})}>
                  <option value="">Sin caso</option>
                  {cases.map((c:any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_reimbursable} onChange={e=>setForm({...form,is_reimbursable:e.target.checked})} className="w-4 h-4 accent-ink-900" />
                <div>
                  <p className="text-sm font-semibold text-ink-800">Gasto facturable al cliente</p>
                  <p className="text-xs text-ink-400">Aparecerá en el resumen de gastos reembolsables</p>
                </div>
              </label>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-ink-900/[0.06]">
              <button onClick={() => { if(!form.description||!form.amount) return toast.error('Descripción y monto requeridos'); createMut.mutate(form) }}
                disabled={createMut.isPending}
                className="flex-1 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] ease-fluid transition disabled:opacity-50">
                {createMut.isPending ? 'Guardando…' : 'Registrar gasto'}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-3 ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-600 hover:bg-ink-900/[0.03] transition">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
