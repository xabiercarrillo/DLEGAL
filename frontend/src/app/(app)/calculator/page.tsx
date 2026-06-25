'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useState } from 'react'
import { calculatorApi } from '@/lib/api'
import { formatPYG } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Calculator, Loader2, Scale, Gavel, BookOpen, Copy, Check, AlertTriangle } from 'lucide-react'

const SMIN = 2680373  // Salario mínimo Paraguay 2024

/* ── Aranceles Colegio de Abogados PY (% sobre monto litigado) ─────────── */
const HONORARIO_ESCALAS = [
  { hasta: 10_000_000,   pct: 20 },
  { hasta: 30_000_000,   pct: 18 },
  { hasta: 100_000_000,  pct: 15 },
  { hasta: 500_000_000,  pct: 12 },
  { hasta: 2_000_000_000,pct: 10 },
  { hasta: Infinity,     pct: 8  },
]

/* Tasas judiciales PY (Ley 4/92 modificada) - base salario mínimo */
const TASAS_JUZGADO = [
  { label: 'Tasa básica de actuación',           monto: Math.round(SMIN * 0.05) },
  { label: 'Escrito judicial ordinario',          monto: Math.round(SMIN * 0.02) },
  { label: 'Demanda o reconvención (≤10M)',       monto: Math.round(SMIN * 0.10) },
  { label: 'Demanda o reconvención (>10M)',       monto: Math.round(SMIN * 0.15) },
  { label: 'Contestación de demanda',             monto: Math.round(SMIN * 0.08) },
  { label: 'Recurso de apelación',                monto: Math.round(SMIN * 0.15) },
  { label: 'Recurso de casación',                 monto: Math.round(SMIN * 0.25) },
  { label: 'Juicio ejecutivo — inicio',           monto: Math.round(SMIN * 0.12) },
  { label: 'Amparo constitucional',               monto: Math.round(SMIN * 0.05) },
  { label: 'Diligencia de notificación',          monto: Math.round(SMIN * 0.01) },
]

function calcHonorarios(monto: number) {
  let result = 0
  let remaining = monto
  let prev = 0
  for (const escala of HONORARIO_ESCALAS) {
    if (remaining <= 0) break
    const tramo = Math.min(remaining, escala.hasta === Infinity ? remaining : escala.hasta - prev)
    result += tramo * escala.pct / 100
    remaining -= tramo
    prev = escala.hasta === Infinity ? monto : escala.hasta
  }
  return result
}

export default function CalculatorPage() {
  const [tab, setTab] = useState<'laboral'|'int'|'honorarios'|'aranceles'>('laboral')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const [lab, setLab] = useState({ salario_mensual: '', fecha_ingreso: '', fecha_egreso: '', tipo_egreso: 'despido_injustificado', vacaciones_pendientes_dias: '0' })
  const [ints, setInts] = useState({ capital: '', tasa_anual: '24', fecha_inicio: '', fecha_fin: '', tipo: 'simple' })
  const [honMonto, setHonMonto] = useState('')
  const [honTipo, setHonTipo] = useState<'extrajudicial'|'judicial_primera'|'judicial_segunda'|'ejecucion'>('judicial_primera')

  const inp = "w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition"
  const lbl = "block text-xs font-semibold text-ink-600 mb-1.5"

  const FACTOR: Record<string, number> = {
    extrajudicial: 0.75, judicial_primera: 1, judicial_segunda: 0.6, ejecucion: 0.5,
  }
  const FACTOR_LABEL: Record<string, string> = {
    extrajudicial: 'Extrajudicial (75%)', judicial_primera: 'Judicial 1ª instancia (100%)',
    judicial_segunda: 'Apelación / 2ª instancia (60%)', ejecucion: 'Ejecución de sentencia (50%)',
  }

  async function calcLab() {
    if (!lab.salario_mensual || !lab.fecha_ingreso || !lab.fecha_egreso) return toast.error('Completar todos los campos')
    setLoading(true)
    try {
      const { data } = await calculatorApi.laboral({ ...lab, salario_mensual: parseFloat(lab.salario_mensual), vacaciones_pendientes_dias: parseInt(lab.vacaciones_pendientes_dias) })
      setResult({ type: 'laboral', data })
    } catch(e: any) { toast.error(e.response?.data?.detail || 'Error al calcular') }
    finally { setLoading(false) }
  }

  async function calcInts() {
    if (!ints.capital || !ints.fecha_inicio || !ints.fecha_fin) return toast.error('Completar todos los campos')
    setLoading(true)
    try {
      const { data } = await calculatorApi.interests({ ...ints, capital: parseFloat(ints.capital), tasa_anual: parseFloat(ints.tasa_anual) })
      setResult({ type: 'intereses', data })
    } catch(e: any) { toast.error(e.response?.data?.detail || 'Error al calcular') }
    finally { setLoading(false) }
  }

  function calcHon() {
    if (!honMonto) return toast.error('Ingresá el monto')
    const monto = parseFloat(honMonto)
    const base = calcHonorarios(monto)
    const factor = FACTOR[honTipo]
    const neto = base * factor
    const iva = neto * 0.10
    const total = neto + iva
    const desglose = HONORARIO_ESCALAS.map((e, i) => {
      const prev = i === 0 ? 0 : HONORARIO_ESCALAS[i-1].hasta
      const tramo = Math.min(Math.max(0, monto - prev), e.hasta === Infinity ? Math.max(0, monto - prev) : e.hasta - prev)
      return tramo > 0 ? { label: `Tramo hasta ${e.hasta === Infinity ? '∞' : formatPYG(e.hasta)} (${e.pct}%)`, monto: tramo * e.pct / 100 } : null
    }).filter(Boolean)
    setResult({ type: 'honorarios', data: { monto, base, factor, factor_label: FACTOR_LABEL[honTipo], neto, iva, total, desglose } })
  }

  function copiarResultado() {
    if (!result) return
    let txt = ''
    if (result.type === 'honorarios') {
      txt = `Honorarios profesionales\nMonto litigado: ${formatPYG(result.data.monto)}\nHonorario base (escala): ${formatPYG(result.data.base)}\nAplicando ${result.data.factor_label}: ${formatPYG(result.data.neto)}\nIVA 10%: ${formatPYG(result.data.iva)}\nTOTAL: ${formatPYG(result.data.total)}`
    } else if (result.type === 'laboral') {
      txt = `Liquidación laboral\nSalario base: ${formatPYG(result.data.salario_base)}\nTotal neto: ${formatPYG(result.data.total_neto)}`
    } else {
      txt = `Cálculo de intereses\nCapital: ${formatPYG(result.data.capital)}\nTotal: ${formatPYG(result.data.total)}`
    }
    navigator.clipboard.writeText(txt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copiado al portapapeles')
  }

  const TABS = [
    { key: 'laboral',    label: 'Liquidación Laboral',  icon: Gavel },
    { key: 'int',        label: 'Intereses',             icon: Calculator },
    { key: 'honorarios', label: 'Honorarios',            icon: Scale },
    { key: 'aranceles',  label: 'Aranceles Judiciales',  icon: BookOpen },
  ] as const

  return (
    <AppLayout title="Calculadora Jurídica">
      <div className="max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setTab(key); setResult(null) }}
              className={"flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition " + (tab === key ? 'bg-ink-900 text-white' : 'bg-white ring-1 ring-ink-900/10 text-ink-600 hover:bg-paper')}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* Aranceles tab - full width table */}
        {tab === 'aranceles' ? (
          <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl overflow-hidden">
            <div className="bg-ink-900 text-white p-5">
              <h3 className="font-display font-semibold text-lg tracking-tight flex items-center gap-2"><BookOpen className="w-5 h-5 text-gold-500" />Tasas y aranceles judiciales — Paraguay</h3>
              <p className="text-white/50 text-xs mt-1">Base: Salario mínimo ₲{SMIN.toLocaleString('es-PY')} · Ley 4/92 y modificaciones</p>
            </div>
            <div className="divide-y divide-ink-900/[0.06]">
              {TASAS_JUZGADO.map((t, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-paper transition">
                  <span className="text-sm text-ink-700">{t.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-ink-900 tnum">{formatPYG(t.monto)}</span>
                    <button onClick={() => { navigator.clipboard.writeText(formatPYG(t.monto)); toast.success('Copiado') }}
                      className="p-1.5 hover:bg-sand-100 rounded-lg transition text-ink-400">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gold-400/10 border-t border-ink-900/[0.06] px-6 py-4">
              <p className="text-xs text-ink-600 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-gold-600 flex-shrink-0" />Los montos son referenciales basados en el salario mínimo vigente. Verificar tasas actualizadas en el Poder Judicial.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left panel — inputs */}
            <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl p-6">
              <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-5 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-gold-500" />Datos
              </h3>

              {tab === 'laboral' && (
                <div className="space-y-4">
                  <div><label className={lbl}>Salario mensual (₲)</label>
                    <input type="number" className={inp} placeholder={"Mín: " + SMIN.toLocaleString('es-PY')} value={lab.salario_mensual} onChange={e => setLab({...lab, salario_mensual: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>Fecha ingreso</label><input type="date" className={inp} value={lab.fecha_ingreso} onChange={e => setLab({...lab, fecha_ingreso: e.target.value})} /></div>
                    <div><label className={lbl}>Fecha egreso</label><input type="date" className={inp} value={lab.fecha_egreso} onChange={e => setLab({...lab, fecha_egreso: e.target.value})} /></div>
                  </div>
                  <div><label className={lbl}>Tipo de egreso</label>
                    <select className={inp} value={lab.tipo_egreso} onChange={e => setLab({...lab, tipo_egreso: e.target.value})}>
                      <option value="despido_injustificado">Despido injustificado</option>
                      <option value="renuncia">Renuncia voluntaria</option>
                      <option value="mutuo_acuerdo">Mutuo acuerdo</option>
                    </select></div>
                  <div><label className={lbl}>Vacaciones pendientes (días)</label><input type="number" min="0" className={inp} value={lab.vacaciones_pendientes_dias} onChange={e => setLab({...lab, vacaciones_pendientes_dias: e.target.value})} /></div>
                  <button onClick={calcLab} disabled={loading}
                    className="w-full bg-ink-900 text-white py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-70">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}Calcular liquidación
                  </button>
                </div>
              )}

              {tab === 'int' && (
                <div className="space-y-4">
                  <div><label className={lbl}>Capital (₲)</label><input type="number" className={inp} placeholder="1000000" value={ints.capital} onChange={e => setInts({...ints, capital: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>Tasa anual (%)</label><input type="number" className={inp} value={ints.tasa_anual} onChange={e => setInts({...ints, tasa_anual: e.target.value})} /></div>
                    <div><label className={lbl}>Tipo</label>
                      <select className={inp} value={ints.tipo} onChange={e => setInts({...ints, tipo: e.target.value})}>
                        <option value="simple">Simple</option><option value="compuesto">Compuesto</option>
                      </select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>Fecha inicio</label><input type="date" className={inp} value={ints.fecha_inicio} onChange={e => setInts({...ints, fecha_inicio: e.target.value})} /></div>
                    <div><label className={lbl}>Fecha fin</label><input type="date" className={inp} value={ints.fecha_fin} onChange={e => setInts({...ints, fecha_fin: e.target.value})} /></div>
                  </div>
                  <button onClick={calcInts} disabled={loading}
                    className="w-full bg-ink-900 text-white py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-70">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}Calcular intereses
                  </button>
                </div>
              )}

              {tab === 'honorarios' && (
                <div className="space-y-4">
                  <div><label className={lbl}>Monto litigado / cuantía (₲)</label>
                    <input type="number" className={inp} placeholder="50000000" value={honMonto} onChange={e => setHonMonto(e.target.value)} />
                    <p className="text-xs text-gray-400 mt-1">Valor económico del asunto o monto demandado</p>
                  </div>
                  <div><label className={lbl}>Tipo de actuación</label>
                    <select className={inp} value={honTipo} onChange={e => setHonTipo(e.target.value as any)}>
                      {Object.entries(FACTOR_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="bg-gold-400/10 rounded-xl p-3 text-xs text-ink-700">
                    <p className="font-semibold mb-1">Escala arancelaria del Colegio de Abogados del PY</p>
                    {HONORARIO_ESCALAS.filter(e => e.hasta !== Infinity).map((e, i) => (
                      <p key={i}>Hasta {formatPYG(e.hasta)}: <strong>{e.pct}%</strong></p>
                    ))}
                    <p>Más de {formatPYG(HONORARIO_ESCALAS[4].hasta)}: <strong>8%</strong></p>
                  </div>
                  <button onClick={calcHon}
                    className="w-full bg-ink-900 text-white py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 hover:bg-ink-800 active:scale-[0.98] transition ease-fluid">
                    <Scale className="w-4 h-4" />Calcular honorarios
                  </button>
                </div>
              )}
            </div>

            {/* Right panel — result */}
            <div className="bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-semibold text-ink-900 tracking-tight">Resultado</h3>
                {result && (
                  <button onClick={copiarResultado} className="flex items-center gap-1.5 text-xs px-3 py-1.5 ring-1 ring-ink-900/10 rounded-xl hover:bg-paper transition text-ink-600">
                    {copied ? <Check className="w-3.5 h-3.5 text-gold-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                )}
              </div>
              {!result ? (
                <div className="flex flex-col items-center justify-center h-52 text-ink-400">
                  <Calculator className="w-10 h-10 mb-2 text-ink-200" />
                  <p className="text-sm">Ingresá los datos y presioná Calcular</p>
                </div>
              ) : result.type === 'honorarios' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-paper rounded-xl text-xs text-ink-500">
                    Cuantía: <strong className="text-ink-900 tnum">{formatPYG(result.data.monto)}</strong>
                    {' · '}{result.data.factor_label}
                  </div>
                  <div className="space-y-1.5">
                    {result.data.desglose.map((d: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm py-1.5 border-b border-ink-900/[0.06]">
                        <span className="text-ink-500 text-xs">{d.label}</span>
                        <span className="font-medium tnum">{formatPYG(d.monto)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm py-1.5 border-b border-ink-900/[0.06]">
                      <span className="text-ink-600">Honorario base</span>
                      <span className="font-semibold tnum">{formatPYG(result.data.base)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1.5 border-b border-ink-900/[0.06]">
                      <span className="text-ink-600">Aplicando factor ({result.data.factor * 100}%)</span>
                      <span className="font-semibold tnum">{formatPYG(result.data.neto)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1.5 border-b border-ink-900/[0.06]">
                      <span className="text-ink-600">IVA 10%</span>
                      <span className="text-ink-700 font-medium tnum">{formatPYG(result.data.iva)}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-ink-900 rounded-xl text-white flex justify-between font-bold text-lg">
                    <span>TOTAL CON IVA</span>
                    <span className="text-gold-400 tnum">{formatPYG(result.data.total)}</span>
                  </div>
                  <p className="text-xs text-ink-400 italic">Basado en arancel orientativo del Colegio de Abogados del Paraguay. El honorario definitivo es libre.</p>
                </div>
              ) : result.type === 'laboral' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-paper rounded-xl text-sm">
                    <div className="grid grid-cols-2 gap-2 text-xs text-ink-500">
                      <span>Salario base: <strong className="text-ink-900 tnum">{formatPYG(result.data.salario_base)}</strong></span>
                      <span>Años trabajados: <strong className="text-ink-900">{result.data.años_trabajados}</strong></span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {result.data.desglose?.map((d: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-ink-900/[0.06] text-sm">
                        <span className="text-ink-600 text-xs">{d.concepto}</span>
                        <span className="font-semibold tnum">{formatPYG(d.monto)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-ink-900 rounded-xl text-white">
                    <div className="flex justify-between text-sm mb-1"><span>IPS (9%)</span><span className="text-rose-300 tnum">- {formatPYG(result.data.iips)}</span></div>
                    <div className="flex justify-between font-bold text-lg"><span>TOTAL NETO</span><span className="text-gold-400 tnum">{formatPYG(result.data.total_neto)}</span></div>
                  </div>
                  {result.data.nota && <p className="text-xs text-ink-400 italic">{result.data.nota}</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  {[['Capital', formatPYG(result.data.capital)], ['Tasa anual', result.data.tasa_anual + '%'], ['Días', result.data.dias], ['Tipo', result.data.tipo], ['Intereses', formatPYG(result.data.intereses)]].map(([k,v]) => (
                    <div key={k} className="flex justify-between text-sm py-2 border-b border-ink-900/[0.06]">
                      <span className="text-ink-500">{k}</span><span className="font-medium tnum">{v}</span>
                    </div>
                  ))}
                  <div className="p-4 bg-ink-900 rounded-xl text-white flex justify-between font-bold text-lg">
                    <span>TOTAL</span><span className="text-gold-400 tnum">{formatPYG(result.data.total)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
