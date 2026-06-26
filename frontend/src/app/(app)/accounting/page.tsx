'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatPYG } from '@/lib/utils'
import { BookOpen, Plus, X, Trash2, TrendingUp, TrendingDown, Scale, FileText } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

const ACCOUNTS = [
  { code: '1.1.1', name: 'Caja', type: 'activo' },
  { code: '1.1.2', name: 'Banco', type: 'activo' },
  { code: '1.1.3', name: 'Cuentas por cobrar', type: 'activo' },
  { code: '1.2.1', name: 'Bienes de uso', type: 'activo' },
  { code: '2.1.1', name: 'Cuentas por pagar', type: 'pasivo' },
  { code: '2.1.2', name: 'IVA por pagar (10%)', type: 'pasivo' },
  { code: '2.1.3', name: 'Deudas bancarias', type: 'pasivo' },
  { code: '3.1.1', name: 'Capital social', type: 'patrimonio' },
  { code: '4.1.1', name: 'Honorarios profesionales', type: 'ingreso' },
  { code: '4.1.2', name: 'Anticipo de honorarios', type: 'ingreso' },
  { code: '4.1.3', name: 'Otros ingresos', type: 'ingreso' },
  { code: '5.1.1', name: 'Gastos operativos', type: 'egreso' },
  { code: '5.1.2', name: 'Gastos judiciales', type: 'egreso' },
  { code: '5.1.3', name: 'Remuneraciones', type: 'egreso' },
  { code: '5.1.4', name: 'Alquiler y servicios', type: 'egreso' },
  { code: '5.1.5', name: 'Honorarios a terceros', type: 'egreso' },
]
const ACC_LABELS: Record<string, string> = ACCOUNTS.reduce((a, x) => ({ ...a, [`${x.code} ${x.name}`]: x.name }), {})
const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const EMPTY = { entry_date: new Date().toISOString().slice(0,10), concept: '', account_debit: '', account_credit: '', amount: '', currency: 'PYG', reference: '' }
const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
const lbl = 'block text-[11px] font-semibold text-ink-500 mb-1.5 uppercase tracking-wider'

export default function AccountingPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState<any>({ ...EMPTY })
  const [monthF, setMonthF]     = useState('')

  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`

  const { data: summary } = useQuery({
    queryKey: ['accounting-summary'],
    queryFn: () => api.get('/accounting/summary').then(r => r.data),
  })
  const { data, isLoading } = useQuery({
    queryKey: ['accounting'],
    queryFn: () => api.get('/accounting/entries').then(r => r.data),
  })

  const allEntries: any[] = data?.entries || data?.items || []

  // Filter by month
  const entries = monthF
    ? allEntries.filter((e: any) => e.entry_date?.slice(0,7) === monthF)
    : allEntries

  // Compute P&L from entries
  const ingresos = allEntries.filter((e: any) => e.account_credit?.startsWith('4')).reduce((s: number, e: any) => s + (e.amount||0), 0)
  const egresos  = allEntries.filter((e: any) => e.account_debit?.startsWith('5')).reduce((s: number, e: any) => s + (e.amount||0), 0)

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/accounting/entries', { ...d, amount: parseFloat(d.amount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting'] })
      qc.invalidateQueries({ queryKey: ['accounting-summary'] })
      setShowForm(false); setForm({ ...EMPTY })
      toast.success('Asiento registrado')
    },
    onError: () => toast.error('Error al registrar'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/accounting/entries/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounting'] }); toast.success('Asiento eliminado') },
    onError: () => toast.error('Error al eliminar'),
  })

  function exportCSV() {
    const rows = ['Fecha,Concepto,Debe,Haber,Monto (₲),Referencia']
    entries.forEach((e: any) => rows.push(`"${e.entry_date}","${e.concept}","${e.account_debit}","${e.account_credit}",${e.amount},"${e.reference||''}"`) )
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'libro_diario.csv'; a.click()
    toast.success('CSV exportado')
  }

  // Group by month for the mini bar chart
  const byMonth: Record<string, number> = {}
  allEntries.forEach((e: any) => {
    const m = e.entry_date?.slice(0,7) || 'Desconocido'
    byMonth[m] = (byMonth[m] || 0) + (e.amount || 0)
  })
  const monthKeys = Object.keys(byMonth).sort().slice(-6)
  const maxMonth = Math.max(...monthKeys.map(k => byMonth[k]), 1)

  return (
    <AppLayout title="Contabilidad — Libro Diario">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <div className="bg-ink-900 rounded-2xl p-5 text-white">
          <Scale className="w-5 h-5 text-gold-400 mb-2" strokeWidth={1.7} />
          <p className="text-2xl font-semibold text-gold-400 tnum">{formatPYG(ingresos - egresos)}</p>
          <p className="text-white/60 text-xs mt-0.5">Resultado neto</p>
        </div>
        <div className="bg-white rounded-2xl p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <TrendingUp className="w-5 h-5 text-gold-600 mb-2" strokeWidth={1.7} />
          <p className="text-2xl font-semibold text-gold-700 tnum">{formatPYG(ingresos)}</p>
          <p className="text-ink-400 text-xs mt-0.5">Total ingresos (Cta. 4.x)</p>
        </div>
        <div className="bg-white rounded-2xl p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <TrendingDown className="w-5 h-5 text-rose-500 mb-2" strokeWidth={1.7} />
          <p className="text-2xl font-semibold text-rose-600 tnum">{formatPYG(egresos)}</p>
          <p className="text-ink-400 text-xs mt-0.5">Total egresos (Cta. 5.x)</p>
        </div>
        <div className="bg-white rounded-2xl p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <BookOpen className="w-5 h-5 text-ink-400 mb-2" strokeWidth={1.7} />
          <p className="text-2xl font-semibold text-ink-900 tnum">{allEntries.length}</p>
          <p className="text-ink-400 text-xs mt-0.5">Asientos totales</p>
        </div>
      </div>

      {/* Mini bar chart */}
      {monthKeys.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm p-5 mb-5">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-4">Movimiento últimos 6 meses</p>
          <div className="flex items-end gap-2 h-20">
            {monthKeys.map(mk => {
              const [yr, mo] = mk.split('-')
              const pct = (byMonth[mk] / maxMonth) * 100
              return (
                <button key={mk} onClick={() => setMonthF(monthF === mk ? '' : mk)}
                  className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full flex items-end justify-center" style={{ height: '64px' }}>
                    <div
                      className={`w-full rounded-t-lg transition-all ${monthF===mk ? 'bg-gold-500' : 'bg-ink-900/10 group-hover:bg-ink-900/20'}`}
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-ink-400 font-medium">{MONTHS_ES[parseInt(mo)-1]} {yr.slice(2)}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select value={monthF} onChange={e => setMonthF(e.target.value)}
          className="px-3 py-2 ring-1 ring-ink-900/10 rounded-xl text-xs bg-white text-ink-700 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition">
          <option value="">Todos los períodos</option>
          {monthKeys.map(mk => {
            const [yr, mo] = mk.split('-')
            return <option key={mk} value={mk}>{MONTHS_ES[parseInt(mo)-1]} {yr}</option>
          })}
        </select>
        <span className="text-xs text-ink-400 tnum">{entries.length} asientos · {formatPYG(entries.reduce((s: number, e: any) => s + (e.amount||0), 0))}</span>
        <div className="ml-auto flex gap-2">
          {entries.length > 0 && (
            <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 ring-1 ring-ink-900/10 text-ink-600 hover:bg-ink-900/[0.03] rounded-xl text-xs font-medium transition">
              <FileText className="w-3.5 h-3.5" strokeWidth={1.7} />CSV
            </button>
          )}
          <button onClick={() => { setForm({ ...EMPTY, entry_date: new Date().toISOString().slice(0,10) }); setShowForm(true) }}
            className="flex items-center gap-2 bg-ink-900 text-white px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-ink-800 active:scale-[0.98] ease-fluid transition">
            <Plus className="w-4 h-4" strokeWidth={1.7} />Nuevo asiento
          </button>
        </div>
      </div>

      {/* Libro diario table */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="h-14 bg-white rounded-2xl animate-pulse ring-1 ring-ink-900/[0.06]" />)}</div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <BookOpen className="w-10 h-10 text-ink-200 mx-auto mb-3" strokeWidth={1.7} />
          <p className="text-ink-400 font-medium">Sin asientos contables</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-ink-900 hover:underline font-medium">+ Registrar primer asiento</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper border-b border-ink-900/[0.06]">
              <tr>
                {['Fecha','Concepto','Debe','Haber','Monto','Ref.',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/[0.05]">
              {entries.map((e: any) => (
                <tr key={e.id} className="hover:bg-ink-900/[0.02] transition group">
                  <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap tnum">{e.entry_date}</td>
                  <td className="px-4 py-3 font-medium text-ink-800 max-w-[180px] truncate">{e.concept}</td>
                  <td className="px-4 py-3 text-xs text-ink-500 max-w-[140px] truncate">{e.account_debit}</td>
                  <td className="px-4 py-3 text-xs text-ink-500 max-w-[140px] truncate">{e.account_credit}</td>
                  <td className="px-4 py-3 font-semibold text-ink-900 whitespace-nowrap tnum">{formatPYG(e.amount)}</td>
                  <td className="px-4 py-3 text-xs text-ink-400">{e.reference || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if(confirm('¿Eliminar asiento?')) deleteMut.mutate(e.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-500/10 text-ink-300 hover:text-rose-600 transition">
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.7} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-paper border-t border-ink-900/[0.06]">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase">Total período</td>
                <td className="px-4 py-3 font-semibold text-ink-900 tnum">{formatPYG(entries.reduce((s: number, e: any) => s + (e.amount||0), 0))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-ink-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-tinted-lg overflow-hidden">
            <div className="bg-ink-900 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-white">Nuevo asiento contable</h2>
                <p className="text-xs text-white/50 mt-0.5">Libro diario — Plan de cuentas Paraguay</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 transition"><X className="w-4 h-4" strokeWidth={1.7} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Fecha *</label><input type="date" className={inp} value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})} /></div>
                <div><label className={lbl}>Referencia</label><input className={inp} value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} placeholder="Nro. Factura, Recibo…" /></div>
              </div>
              <div><label className={lbl}>Concepto *</label><input className={inp} value={form.concept} onChange={e => setForm({...form, concept: e.target.value})} placeholder="Descripción del movimiento contable" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Cuenta Deudora (Debe) *</label>
                  <input className={inp} list="acc-list" value={form.account_debit} onChange={e => setForm({...form, account_debit: e.target.value})} placeholder="Ej: 1.1.2 Banco" />
                  <datalist id="acc-list">{ACCOUNTS.map(a => <option key={a.code} value={`${a.code} ${a.name}`} />)}</datalist>
                </div>
                <div><label className={lbl}>Cuenta Acreedora (Haber) *</label>
                  <input className={inp} list="acc-list" value={form.account_credit} onChange={e => setForm({...form, account_credit: e.target.value})} placeholder="Ej: 4.1.1 Honorarios" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Monto (₲) *</label><input type="number" min="0" className={inp} value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="500000" /></div>
                <div><label className={lbl}>Moneda</label>
                  <select className={inp} value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                    <option value="PYG">₲ Guaraníes (PYG)</option>
                    <option value="USD">$ Dólares (USD)</option>
                    <option value="BRL">R$ Reales (BRL)</option>
                  </select>
                </div>
              </div>
              {/* Quick presets */}
              <div>
                <p className={lbl}>Asientos rápidos</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Cobro honorarios', d: '1.1.2 Banco', h: '4.1.1 Honorarios profesionales' },
                    { label: 'Pago gastos op.', d: '5.1.1 Gastos operativos', h: '1.1.1 Caja' },
                    { label: 'IVA por pagar', d: '2.1.2 IVA por pagar (10%)', h: '1.1.2 Banco' },
                  ].map(p => (
                    <button key={p.label} type="button" onClick={() => setForm({...form, account_debit: p.d, account_credit: p.h})}
                      className="text-xs px-2.5 py-1 bg-ink-900/[0.05] text-ink-600 rounded-xl hover:bg-ink-900/10 transition font-medium">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-ink-900/[0.06]">
              <button onClick={() => {
                if (!form.concept || !form.amount || !form.account_debit || !form.account_credit)
                  return toast.error('Completar concepto, cuentas y monto')
                createMut.mutate(form)
              }} disabled={createMut.isPending}
                className="flex-1 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] ease-fluid transition disabled:opacity-50">
                {createMut.isPending ? 'Guardando…' : 'Registrar asiento'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-3 ring-1 ring-ink-900/10 text-ink-600 hover:bg-ink-900/[0.03] rounded-xl text-sm transition">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
