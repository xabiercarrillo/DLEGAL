'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goalsApi } from '@/lib/api'
import { formatPYG } from '@/lib/utils'
import { useState } from 'react'
import { Target, Plus, X, CheckCircle, TrendingUp, Edit2, Trash2, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'

const GOAL_TYPES = [
  { value: 'ingresos', label: 'Ingresos', icon: '💰', unit: '₲' },
  { value: 'casos', label: 'Casos', icon: '⚖️', unit: 'casos' },
  { value: 'clientes', label: 'Clientes', icon: '👥', unit: 'clientes' },
  { value: 'horas', label: 'Horas Facturadas', icon: '⏱️', unit: 'horas' },
  { value: 'facturas', label: 'Facturas', icon: '🧾', unit: 'facturas' },
]

const EMPTY = {
  title: '', type: 'ingresos', target_value: '', unit: '₲',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().slice(0, 10),
}

function ProgressBar({ pct, completed }: { pct: number; completed: boolean }) {
  const clamped = Math.min(pct, 100)
  return (
    <div className="w-full bg-ink-900/10 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full transition-all duration-700 ${completed ? 'bg-gold-600' : clamped >= 80 ? 'bg-gold-500' : clamped >= 50 ? 'bg-gold-500' : 'bg-gold-400'}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export default function GoalsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const [updateVal, setUpdateVal] = useState<{ id: string; val: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsApi.list().then((r: any) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d: any) => goalsApi.create(d),
    onSuccess: () => {
      toast.success('Objetivo creado')
      setModal(false); setForm({ ...EMPTY })
      qc.invalidateQueries({ queryKey: ['goals'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al crear'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => goalsApi.update(id, data),
    onSuccess: () => {
      toast.success('Actualizado')
      setUpdateVal(null); setEditTarget(null)
      qc.invalidateQueries({ queryKey: ['goals'] })
    },
    onError: () => toast.error('Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => goalsApi.delete(id),
    onSuccess: () => { toast.success('Objetivo eliminado'); qc.invalidateQueries({ queryKey: ['goals'] }) },
    onError: () => toast.error('Error al eliminar'),
  })

  const goals = data?.items || data || []
  const active = goals.filter((g: any) => !g.is_completed)
  const completed = goals.filter((g: any) => g.is_completed)

  const GoalCard = ({ g }: { g: any }) => {
    const gtype = GOAL_TYPES.find(t => t.value === g.type) || GOAL_TYPES[0]
    const pct = g.progress_pct || 0
    const isMonetary = g.unit === '₲'
    const fmtVal = (v: number) => isMonetary ? formatPYG(v) : `${v.toLocaleString('es-PY')} ${g.unit}`
    return (
      <div className={`bg-white rounded-xl ring-1 p-5 hover:shadow-tinted transition ${g.is_completed ? 'ring-gold-400/30 bg-gold-400/[0.04]' : 'ring-ink-900/[0.06]'}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-ink-900">{g.title}</h3>
                {g.is_completed && <CheckCircle size={16} className="text-gold-600" strokeWidth={1.7} />}
              </div>
              <div className="text-xs text-ink-500">{gtype.label} · {g.start_date} → {g.end_date}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { setUpdateVal({ id: g.id, val: String(g.current_value) }) }}
              className="p-1.5 text-ink-400 hover:text-ink-700 hover:bg-ink-900/[0.05] rounded-lg transition">
              <Edit2 size={14} strokeWidth={1.7} />
            </button>
            <button onClick={() => deleteMut.mutate(g.id)}
              className="p-1.5 text-ink-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition">
              <Trash2 size={14} strokeWidth={1.7} />
            </button>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-ink-700 font-medium tnum">{fmtVal(g.current_value || 0)}</span>
            <span className="text-ink-400 tnum">de {fmtVal(g.target_value)}</span>
          </div>
          <ProgressBar pct={pct} completed={g.is_completed} />
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold tnum ${pct >= 100 ? 'text-gold-700' : pct >= 80 ? 'text-gold-700' : pct >= 50 ? 'text-ink-700' : 'text-ink-500'}`}>
            {pct.toFixed(0)}% completado
          </span>
          {updateVal?.id === g.id ? (
            <div className="flex items-center gap-2">
              <input type="number" value={updateVal.val}
                onChange={e => setUpdateVal({ ...updateVal, val: e.target.value })}
                className="w-28 bg-white ring-1 ring-ink-900/10 rounded-xl px-2 py-1 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition tnum"
                placeholder="Valor actual" autoFocus />
              <button onClick={() => updateMut.mutate({ id: g.id, data: { current_value: parseFloat(updateVal.val) } })}
                className="px-3 py-1 bg-ink-900 text-white text-sm rounded-full font-semibold hover:bg-ink-800 active:scale-[0.98] ease-fluid transition">
                OK
              </button>
              <button onClick={() => setUpdateVal(null)} className="text-ink-400 hover:text-ink-600"><X size={14} strokeWidth={1.7} /></button>
            </div>
          ) : (
            !g.is_completed && (
              <button
                onClick={() => updateMut.mutate({ id: g.id, data: { is_completed: true } })}
                className="text-xs text-gold-700 hover:text-gold-800 flex items-center gap-1">
                <CheckCircle size={13} strokeWidth={1.7} /> Marcar completado
              </button>
            )
          )}
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-semibold text-ink-900 flex items-center gap-2">
              <Target className="text-gold-500" size={28} strokeWidth={1.7} /> Objetivos
            </h1>
            <p className="text-ink-500 text-sm mt-1">Establezca y haga seguimiento de sus metas profesionales</p>
          </div>
          <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-ink-900 text-white px-4 py-2 rounded-full font-semibold hover:bg-ink-800 active:scale-[0.98] ease-fluid transition">
            <Plus size={18} strokeWidth={1.7} /> Nuevo objetivo
          </button>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Activos', val: active.length, icon: Target, cls: 'bg-ink-900/[0.04] border-ink-900/[0.06] text-ink-700' },
            { label: 'Completados', val: completed.length, icon: CheckCircle, cls: 'bg-gold-400/[0.12] border-gold-400/20 text-gold-700' },
            {
              label: 'Progreso promedio',
              val: active.length > 0
                ? `${(active.reduce((a: number, g: any) => a + (g.progress_pct || 0), 0) / active.length).toFixed(0)}%`
                : '—',
              icon: TrendingUp, cls: 'bg-ink-900/[0.04] border-ink-900/[0.06] text-ink-700'
            },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className={`rounded-xl border p-4 ${s.cls}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} strokeWidth={1.7} /> <span className="text-sm font-medium">{s.label}</span>
                </div>
                <div className="text-2xl font-semibold tnum">{s.val}</div>
              </div>
            )
          })}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-ink-400">Cargando...</div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
            <Target className="mx-auto mb-4 text-ink-300" size={48} strokeWidth={1.7} />
            <p className="text-lg font-medium text-ink-700">Sin objetivos definidos</p>
            <p className="text-sm text-ink-400 mt-1">Cree su primer objetivo para hacer seguimiento de sus metas</p>
            <button onClick={() => setModal(true)} className="mt-4 px-6 py-2 bg-ink-900 text-white rounded-full font-semibold hover:bg-ink-800 active:scale-[0.98] ease-fluid transition">
              Crear objetivo
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {active.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-ink-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <BarChart3 size={16} strokeWidth={1.7} /> En progreso ({active.length})
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {active.map((g: any) => <GoalCard key={g.id} g={g} />)}
                </div>
              </div>
            )}
            {completed.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-ink-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-gold-600" strokeWidth={1.7} /> Completados ({completed.length})
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {completed.map((g: any) => <GoalCard key={g.id} g={g} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-ink-950/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-tinted-lg">
            <div className="px-6 py-4 border-b border-ink-900/[0.06] flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-ink-900 flex items-center gap-2">
                <Target className="text-gold-500" size={20} strokeWidth={1.7} /> Nuevo objetivo
              </h2>
              <button onClick={() => { setModal(false); setForm({ ...EMPTY }) }} className="text-ink-400 hover:text-ink-600"><X size={22} strokeWidth={1.7} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-ink-500 mb-1.5 uppercase tracking-wider">Título *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej: Meta de ingresos Q2 2026"
                  className="w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-500 mb-1.5 uppercase tracking-wider">Tipo de objetivo *</label>
                <div className="grid grid-cols-3 gap-2">
                  {GOAL_TYPES.map(t => (
                    <button key={t.value} onClick={() => setForm({ ...form, type: t.value, unit: t.unit })}
                      className={`p-2 rounded-xl border text-center transition ${form.type === t.value ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-900/[0.06] text-ink-500 hover:bg-ink-900/[0.04]'}`}>
                      <div className="text-xs font-medium">{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-500 mb-1.5 uppercase tracking-wider">Meta ({form.unit}) *</label>
                <input type="number" value={form.target_value} onChange={e => setForm({ ...form, target_value: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition tnum" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-500 mb-1.5 uppercase tracking-wider">Fecha inicio</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-500 mb-1.5 uppercase tracking-wider">Fecha límite</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition" />
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end border-t border-ink-900/[0.06] pt-4">
              <button onClick={() => { setModal(false); setForm({ ...EMPTY }) }} className="px-4 py-2 ring-1 ring-ink-900/10 text-ink-600 rounded-xl text-sm hover:bg-ink-900/[0.03] transition">Cancelar</button>
              <button onClick={() => createMut.mutate({ ...form, target_value: parseFloat(form.target_value) })}
                disabled={!form.title || !form.target_value || createMut.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-ink-900 text-white rounded-full hover:bg-ink-800 active:scale-[0.98] ease-fluid transition disabled:opacity-40 text-sm font-semibold">
                <Plus size={16} strokeWidth={1.7} /> {createMut.isPending ? 'Creando...' : 'Crear objetivo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
