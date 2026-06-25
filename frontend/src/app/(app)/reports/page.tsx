'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/lib/api'
import { formatPYG, MATTER, CASE_STATUS } from '@/lib/utils'
import { useState } from 'react'
import { TrendingUp, TrendingDown, Scale, Users, Download, BarChart3, DollarSign, FileSpreadsheet } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function BarChart({ data, maxVal, color = '#c2a14a' }: { data: {label: string; value: number}[]; maxVal: number; color?: string }) {
  if (!data.length) return <p className="text-ink-400 text-sm text-center py-4">Sin datos</p>
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => {
        const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-ink-400 leading-none tnum">{d.value > 0 ? (d.value >= 1000000 ? `${(d.value/1000000).toFixed(1)}M` : `${(d.value/1000).toFixed(0)}K`) : ''}</span>
            <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(pct, 2)}%`, backgroundColor: color, opacity: 0.85 + (i % 3) * 0.05 }} />
            <span className="text-[9px] text-ink-400 leading-none">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function PieSlices({ data }: { data: {label: string; count: number; color: string}[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (!total) return <p className="text-ink-400 text-sm text-center py-4">Sin datos</p>
  let cumPct = 0
  return (
    <div className="flex gap-4 items-center">
      <svg viewBox="0 0 36 36" className="w-28 h-28 flex-shrink-0">
        {data.map((d, i) => {
          const pct = d.count / total * 100
          const dash = `${pct} ${100 - pct}`
          const offset = 25 - cumPct
          cumPct += pct
          return (
            <circle key={i} cx="18" cy="18" r="15.9" fill="none" stroke={d.color}
              strokeWidth="6" strokeDasharray={dash} strokeDashoffset={offset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
          )
        })}
        <text x="18" y="18" textAnchor="middle" dy="0.35em" fontSize="6" fill="#14182b" fontWeight="bold">{total}</text>
      </svg>
      <div className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-ink-600 flex-1 truncate">{d.label}</span>
            <span className="font-semibold text-ink-900 tnum">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const MATTER_COLORS: Record<string,string> = {
  civil: '#c2a14a', penal: '#a4843a', laboral: '#474e72', familia: '#222845',
  comercial: '#968d76', administrativo: '#c2a14a', tributario: '#a4843a', otro: '#474e72',
}

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const token = typeof window !== 'undefined' ? localStorage.getItem('xlegal_token') : ''

  const { data: summary } = useQuery({ queryKey: ['report-summary', year], queryFn: () => reportsApi.summary(year).then(r => r.data) })
  const { data: byMatter } = useQuery({ queryKey: ['report-matter'], queryFn: () => reportsApi.byMatter().then(r => r.data) })
  const { data: byStatus } = useQuery({ queryKey: ['report-status'], queryFn: () => reportsApi.byStatus().then(r => r.data) })
  const { data: byMonth } = useQuery({ queryKey: ['report-month', year], queryFn: () => reportsApi.byMonth(year).then(r => r.data) })
  const { data: topClients } = useQuery({ queryKey: ['report-clients'], queryFn: () => reportsApi.topClients().then(r => r.data) })

  // Monthly data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, '0')}`
    const found = byMonth?.data?.find((d: any) => d.month === month)
    return { label: MONTHS_ES[i], value: found?.total || 0 }
  })
  const maxMonthly = Math.max(...monthlyData.map(d => d.value), 1)

  // Matter pie
  const matterPie = (byMatter?.data || []).map((d: any) => ({
    label: MATTER[d.matter] || d.matter,
    count: d.count,
    color: MATTER_COLORS[d.matter] || '#968d76',
  }))

  // Status pie
  const STATUS_COLORS: Record<string,string> = {
    active: '#c2a14a', new: '#a4843a', trial: '#474e72', negotiation: '#222845',
    investigation: '#968d76', closed_won: '#c2a14a', closed_lost: '#a4843a',
    closed_settled: '#474e72', appeal: '#222845', resolution: '#968d76',
  }
  const statusPie = (byStatus?.data || []).map((d: any) => ({
    label: CASE_STATUS[d.status]?.label || d.status,
    count: d.count,
    color: STATUS_COLORS[d.status] || '#968d76',
  }))

  function exportCSV(type: 'income' | 'expenses') {
    const url = `${API_URL}/reports/export/${type}-csv?year=${year}`
    const a = document.createElement('a')
    a.href = url
    a.click()
  }

  return (
    <AppLayout title="Reportes y Estadísticas">
      {/* Year selector + exports */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm rounded-xl px-3 py-2">
          <span className="text-sm text-ink-500">Año:</span>
          <select value={year} onChange={e => setYear(+e.target.value)} className="text-sm font-semibold text-ink-800 focus:outline-none bg-transparent">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => exportCSV('income')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gold-600 text-white rounded-xl text-sm font-semibold hover:bg-gold-700 active:scale-[0.98] ease-fluid transition">
            <Download className="w-4 h-4" strokeWidth={1.7} /> Ingresos CSV
          </button>
          <button onClick={() => exportCSV('expenses')}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 active:scale-[0.98] ease-fluid transition">
            <Download className="w-4 h-4" strokeWidth={1.7} /> Gastos CSV
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Ingresos ' + year, value: formatPYG(summary?.total_income || 0), icon: TrendingUp, cls: 'text-gold-400' },
          { label: 'Gastos ' + year, value: formatPYG(summary?.total_expenses || 0), icon: TrendingDown, cls: 'text-rose-300' },
          { label: 'Resultado neto', value: formatPYG(summary?.net || 0), icon: DollarSign, cls: (summary?.net || 0) >= 0 ? 'text-gold-400' : 'text-rose-300' },
          { label: 'Por cobrar', value: formatPYG(summary?.pending_invoices || 0), icon: Scale, cls: 'text-gold-400' },
        ].map((k, i) => (
          <div key={i} className="bg-ink-900 rounded-2xl p-5 text-white shadow-tinted-sm">
            <k.icon className="w-6 h-6 mb-3 text-white/40" strokeWidth={1.7} />
            <p className={`text-xl font-semibold leading-tight tnum ${k.cls}`}>{k.value}</p>
            <p className="text-white/60 text-xs mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Income by month */}
        <div className="bg-white rounded-2xl p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <h3 className="font-display font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gold-500" strokeWidth={1.7} /> Ingresos por mes — {year}
          </h3>
          <BarChart data={monthlyData} maxVal={maxMonthly} color="#c2a14a" />
        </div>

        {/* Cases by matter */}
        <div className="bg-white rounded-2xl p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <h3 className="font-display font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Scale className="w-4 h-4 text-ink-400" strokeWidth={1.7} /> Casos por materia
          </h3>
          <PieSlices data={matterPie} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Cases by status */}
        <div className="bg-white rounded-2xl p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <h3 className="font-display font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Scale className="w-4 h-4 text-ink-400" strokeWidth={1.7} /> Casos por estado
          </h3>
          <PieSlices data={statusPie} />
        </div>

        {/* Top clients */}
        <div className="bg-white rounded-2xl p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <h3 className="font-display font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-gold-500" strokeWidth={1.7} /> Top clientes por casos
          </h3>
          {!topClients?.data?.length ? (
            <p className="text-ink-400 text-sm text-center py-4">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {topClients.data.slice(0, 8).map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-ink-400 tnum">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-ink-900 truncate">{c.client}</span>
                      <span className="text-xs font-semibold text-ink-900 ml-2 tnum">{c.cases} casos</span>
                    </div>
                    <div className="w-full bg-ink-900/10 rounded-full h-1.5">
                      <div className="h-1.5 bg-gold-500 rounded-full" style={{ width: `${(c.cases / topClients.data[0].cases) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Productivity section */}
      <div className="mt-6 bg-white rounded-2xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm p-5">
        <h3 className="font-display font-semibold text-ink-900 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-gold-500" strokeWidth={1.7} /> Exportar reportes
        </h3>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Reporte Financiero', desc: 'Ingresos y gastos del año', url: '/reports/financial?format=pdf' },
            { label: 'Cartera de Casos', desc: 'Estado actual de todos los casos', url: '/reports/cases?format=pdf' },
            { label: 'Libro Diario', desc: 'Asientos contables del período', url: '/accounting/export?format=csv' },
            { label: 'Nómina de Clientes', desc: 'Listado completo de clientes', url: '/clients/export?format=csv' },
          ].map((r, i) => (
            <a key={i} href={`${API_URL}${r.url}`} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-xl ring-1 ring-ink-900/[0.06] hover:bg-ink-900/[0.03] transition group">
              <div className="w-8 h-8 rounded-lg bg-ink-900/5 group-hover:bg-gold-400/10 flex items-center justify-center flex-shrink-0 transition">
                <Download className="w-4 h-4 text-ink-400 group-hover:text-gold-600" strokeWidth={1.7} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">{r.label}</p>
                <p className="text-xs text-ink-400">{r.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
