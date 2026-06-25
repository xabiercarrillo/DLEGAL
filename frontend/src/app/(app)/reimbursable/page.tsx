'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, casesApi } from '@/lib/api'
import { formatPYG, formatDate } from '@/lib/utils'
import { Receipt, CheckCircle, Clock, Plus, X, Trash2, FileText } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

const CATEGORIES: Record<string, { label: string; emoji: string }> = {
  judicial:   { label: 'Judicial / Tasas',  emoji: '⚖️' },
  notarial:   { label: 'Notarial',          emoji: '📜' },
  registro:   { label: 'Registro / Inscripción', emoji: '🏛️' },
  peritos:    { label: 'Peritos / Informes', emoji: '🔬' },
  transporte: { label: 'Transporte',        emoji: '🚗' },
  copias:     { label: 'Fotocopias / Docs', emoji: '📋' },
  correo:     { label: 'Correo / Courier',  emoji: '📮' },
  otros:      { label: 'Otros',             emoji: '📎' },
}
const EMPTY = { description: '', amount: '', expense_date: new Date().toISOString().slice(0,10), category: 'judicial', case_id: '', notes: '' }
const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
const lbl = 'block text-[11px] font-semibold text-ink-500 mb-1.5 uppercase tracking-wider'

export default function ReimbursablePage() {
  const qc = useQueryClient()
  const [modal, setModal]   = useState<'create'|null>(null)
  const [form, setForm]     = useState<any>({ ...EMPTY })
  const [showBilled, setShowBilled] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['reimbursable'],
    queryFn: () => api.get('/reimbursable').then(r => r.data),
  })
  const { data: casesData } = useQuery({ queryKey: ['cases-sel'], queryFn: () => casesApi.list({ limit: 200 }).then(r => r.data) })

  const allItems: any[] = data?.items || []
  const cases: any[]    = casesData?.items || casesData || []
  const pending = allItems.filter(e => !e.is_billed)
  const billed  = allItems.filter(e =>  e.is_billed)
  const totalPending = pending.reduce((s: number, e: any) => s + (e.amount||0), 0)
  const totalBilled  = billed.reduce((s: number, e: any) =>  s + (e.amount||0), 0)
  const items = showBilled ? billed : pending

  // Group by case
  const byCase = items.reduce((acc: any, e: any) => {
    const key = e.case_title || 'Sin caso'
    if (!acc[key]) acc[key] = []
    acc[key].push(e)
    return acc
  }, {})

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/reimbursable', { ...d, amount: parseFloat(d.amount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reimbursable'] }); setModal(null); toast.success('Gasto registrado') },
    onError: () => toast.error('Error al registrar'),
  })
  const billMut = useMutation({
    mutationFn: (id: string) => api.post(`/reimbursable/${id}/mark-billed`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reimbursable'] }); toast.success('Marcado como facturado') },
    onError: () => toast.error('Error'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/reimbursable/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reimbursable'] }); toast.success('Eliminado') },
    onError: () => toast.error('Error al eliminar'),
  })

  function exportPending() {
    const rows = ['Descripción,Categoría,Caso,Fecha,Monto (₲)']
    pending.forEach((e: any) => rows.push(`"${e.description}","${CATEGORIES[e.category]?.label||e.category}","${e.case_title||''}","${e.expense_date}",${e.amount}`))
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gastos_reembolsables.csv'; a.click()
    toast.success('CSV exportado')
  }

  return (
    <AppLayout title="Gastos Reembolsables">
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <Clock className="w-5 h-5 text-ink-400 mb-1.5" strokeWidth={1.7} />
          <p className="text-xl font-semibold text-rose-600 tnum">{formatPYG(totalPending)}</p>
          <p className="text-xs text-ink-400 mt-0.5">Pendiente a facturar ({pending.length})</p>
        </div>
        <div className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <CheckCircle className="w-5 h-5 text-ink-400 mb-1.5" strokeWidth={1.7} />
          <p className="text-xl font-semibold text-gold-700 tnum">{formatPYG(totalBilled)}</p>
          <p className="text-xs text-ink-400 mt-0.5">Ya facturado ({billed.length})</p>
        </div>
        <div className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <Receipt className="w-5 h-5 text-ink-400 mb-1.5" strokeWidth={1.7} />
          <p className="text-xl font-semibold text-ink-900 tnum">{allItems.length}</p>
          <p className="text-xs text-ink-400 mt-0.5">Total registros</p>
        </div>
        <div className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm flex items-center justify-center">
          <button onClick={() => { setForm({ ...EMPTY, expense_date: new Date().toISOString().slice(0,10) }); setModal('create') }}
            className="flex flex-col items-center gap-2 text-ink-400 hover:text-ink-900 transition">
            <div className="w-10 h-10 rounded-xl bg-ink-900/10 hover:bg-gold-400/12 flex items-center justify-center transition">
              <Plus className="w-5 h-5" strokeWidth={1.7} />
            </div>
            <span className="text-xs font-semibold">Registrar gasto</span>
          </button>
        </div>
      </div>

      {/* Tabs + Export */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex gap-1 p-1 bg-ink-900/10 rounded-xl">
          <button onClick={() => setShowBilled(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!showBilled?'bg-white text-ink-900 shadow-tinted-sm':'text-ink-500'}`}>
            Pendientes ({pending.length})
          </button>
          <button onClick={() => setShowBilled(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${showBilled?'bg-white text-ink-900 shadow-tinted-sm':'text-ink-500'}`}>
            Facturados ({billed.length})
          </button>
        </div>
        {!showBilled && pending.length > 0 && (
          <button onClick={exportPending} className="flex items-center gap-2 px-3 py-2 ring-1 ring-ink-900/10 rounded-xl text-xs font-medium text-ink-600 hover:bg-ink-900/[0.03] transition ml-auto">
            <FileText className="w-3.5 h-3.5" strokeWidth={1.7} />Exportar CSV
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <Receipt className="w-10 h-10 text-ink-200 mx-auto mb-3" strokeWidth={1.7} />
          <p className="text-ink-400 font-medium">{showBilled ? 'Sin gastos facturados' : 'Sin gastos pendientes de facturar'}</p>
          {!showBilled && <button onClick={() => setModal('create')} className="mt-3 text-sm text-ink-900 hover:underline font-medium">+ Registrar gasto reembolsable</button>}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCase).map(([caseName, expenses]: [string, any]) => (
            <div key={caseName}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">{caseName}</p>
                <span className="text-xs text-ink-400 tnum">({expenses.length} gastos · {formatPYG(expenses.reduce((s:number,e:any)=>s+(e.amount||0),0))})</span>
              </div>
              <div className="space-y-2">
                {expenses.map((e: any) => (
                  <div key={e.id} className={`bg-white rounded-2xl ring-1 transition hover:bg-ink-900/[0.02] flex items-center gap-4 p-4 ${e.is_billed ? 'ring-gold-600/20 opacity-75' : 'ring-ink-900/[0.06]'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${e.is_billed ? 'bg-gold-400/12' : 'bg-ink-900/[0.05]'}`}>
                      <Receipt className={`w-5 h-5 ${e.is_billed ? 'text-gold-700' : 'text-ink-400'}`} strokeWidth={1.7} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink-800 truncate">{e.description}</p>
                      <p className="text-xs text-ink-400 mt-0.5">
                        {CATEGORIES[e.category]?.label || e.category} · {formatDate(e.expense_date)}
                        {e.notes && ` · ${e.notes}`}
                      </p>
                    </div>
                    <p className={`font-semibold flex-shrink-0 tnum ${e.is_billed ? 'text-gold-700' : 'text-rose-600'}`}>{formatPYG(e.amount)}</p>
                    {!e.is_billed && (
                      <button onClick={() => billMut.mutate(e.id)}
                        className="text-xs px-3 py-1.5 bg-ink-900 text-white rounded-full font-semibold hover:bg-ink-800 active:scale-[0.98] ease-fluid transition flex-shrink-0">
                        Facturar
                      </button>
                    )}
                    {e.is_billed && <span className="text-xs text-gold-700 font-semibold flex-shrink-0">Facturado</span>}
                    <button onClick={() => { if(confirm('¿Eliminar?')) deleteMut.mutate(e.id) }}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-ink-300 hover:text-rose-600 transition flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.7} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-ink-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-tinted-lg overflow-hidden">
            <div className="bg-ink-900 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-white">Nuevo gasto reembolsable</h2>
                <p className="text-xs text-white/50 mt-0.5">Tasas judiciales, aranceles, transporte, etc.</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 transition"><X className="w-4 h-4" strokeWidth={1.7} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className={lbl}>Descripción *</label><input className={inp} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Ej: Arancel judicial — 1er Juzgado Civil" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Monto (₲) *</label><input type="number" className={inp} value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="75000" /></div>
                <div><label className={lbl}>Fecha *</label><input type="date" className={inp} value={form.expense_date||''} onChange={e=>setForm({...form,expense_date:e.target.value})} /></div>
              </div>
              <div><label className={lbl}>Categoría</label>
                <select className={inp} value={form.category||'judicial'} onChange={e=>setForm({...form,category:e.target.value})}>
                  {Object.entries(CATEGORIES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Caso</label>
                <select className={inp} value={form.case_id||''} onChange={e=>setForm({...form,case_id:e.target.value})}>
                  <option value="">Sin caso</option>
                  {cases.map((c:any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Referencia / Recibo</label><input className={inp} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="N° de recibo, expediente…" /></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-ink-900/[0.06]">
              <button onClick={() => { if(!form.description||!form.amount||!form.expense_date) return toast.error('Completar campos obligatorios'); createMut.mutate(form) }}
                disabled={createMut.isPending}
                className="flex-1 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] ease-fluid transition disabled:opacity-50">
                {createMut.isPending ? 'Guardando…' : 'Registrar gasto'}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-3 ring-1 ring-ink-900/10 text-ink-600 hover:bg-ink-900/[0.03] rounded-xl transition text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
