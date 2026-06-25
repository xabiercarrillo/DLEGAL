'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery } from '@tanstack/react-query'
import { casesApi, deadlinesApi, tasksApi, billingApi, hearingsApi, appointmentsApi } from '@/lib/api'
import { formatPYG, daysUntil, urgencyBadge } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
  Briefcase, Clock, DollarSign, CheckSquare, AlertTriangle,
  Calendar, Users, Scale, ChevronRight, Gavel,
  ArrowUpRight, Zap, Bell, Receipt, FileText, Bot,
} from 'lucide-react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const STATUS_LBL: Record<string, string> = {
  new: 'Nuevo', active: 'Activo', investigation: 'Investig.', negotiation: 'Negoc.',
  trial: 'En Juicio', appeal: 'Apelación', resolution: 'Resoluc.',
  closed_won: 'Ganado', closed_lost: 'Perdido', closed_settled: 'Transado', archived: 'Archivado',
}
// Paleta cohesiva (oro · tinta · arena) — un solo tono de alerta para "perdido"
const STATUS_CLR: Record<string, string> = {
  new: '#cead52', active: '#c2a14a', investigation: '#a4843a', negotiation: '#80662e',
  trial: '#474e72', appeal: '#2f3556', resolution: '#222845',
  closed_won: '#c2a14a', closed_lost: '#b4533f', closed_settled: '#6b7396', archived: '#968d76',
}

const HOUR_GREET = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: caseStats, isLoading: loadingCS } = useQuery({
    queryKey: ['case-stats'], queryFn: () => casesApi.stats().then(r => r.data),
  })
  const { data: deadlinesData } = useQuery({
    queryKey: ['deadlines-all'], queryFn: () => deadlinesApi.list({ is_completed: false, limit: 20 }).then(r => r.data),
  })
  const { data: tasksData } = useQuery({
    queryKey: ['tasks-dash'], queryFn: () => tasksApi.list({ status: 'pending', limit: 5 }).then(r => r.data),
  })
  const { data: incomeStats } = useQuery({
    queryKey: ['income-stats'], queryFn: () => billingApi.income.stats().then(r => r.data),
  })
  const { data: hearingsData } = useQuery({
    queryKey: ['hearings-upcoming'],
    queryFn: () => hearingsApi.list({ limit: 5, upcoming: true }).then(r => r.data),
  })
  const { data: apptData } = useQuery({
    queryKey: ['appt-today'],
    queryFn: () => appointmentsApi.list({ limit: 5, upcoming: true }).then(r => r.data),
  })

  const urgentDeadlines = (deadlinesData?.items || []).filter((d: any) => daysUntil(d.due_date) <= 7)
  const allDeadlines    = (deadlinesData?.items || []).slice(0, 6)
  const isNewUser = !loadingCS && (caseStats?.total || 0) === 0
  const hearings        = hearingsData?.items || hearingsData || []
  const tasks           = tasksData?.items || tasksData || []
  const appts           = apptData?.items || apptData || []

  const chartData = Object.entries(caseStats?.by_status || {})
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => ({ name: STATUS_LBL[k] || k, value: v as number, color: STATUS_CLR[k] || '#968d76' }))

  const today = new Date().toLocaleDateString('es-PY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const KPIS = [
    { label: 'Casos activos', value: loadingCS ? '…' : caseStats?.active || 0, icon: Briefcase, href: '/cases', sub: `${caseStats?.total || 0} en total`, accent: false },
    { label: 'Plazos críticos', value: urgentDeadlines.length, icon: Clock, href: '/deadlines', sub: urgentDeadlines.length > 0 ? 'Requieren atención' : 'Todo al día', accent: urgentDeadlines.length > 0 },
    { label: 'Ingresos del mes', value: formatPYG(incomeStats?.total_month || 0), icon: DollarSign, href: '/income', sub: `${incomeStats?.count_month || 0} registro${incomeStats?.count_month !== 1 ? 's' : ''}`, accent: false },
    { label: 'Tareas pendientes', value: tasksData?.total || tasks.length, icon: CheckSquare, href: '/tasks', sub: 'Sin completar', accent: false },
  ]

  const QUICK = [
    { href: '/cases', label: 'Nuevo caso', icon: Scale },
    { href: '/clients', label: 'Cliente', icon: Users },
    { href: '/billing', label: 'Factura', icon: Receipt },
    { href: '/hearings', label: 'Audiencia', icon: Gavel },
    { href: '/tasks', label: 'Tarea', icon: CheckSquare },
    { href: '/deadlines', label: 'Plazo', icon: Clock },
  ]

  return (
    <AppLayout title="Dashboard">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-7 animate-fade-up">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-600 mb-2 capitalize">{today}</p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 tracking-tight">
            {HOUR_GREET()}, {user?.full_name?.split(' ')[0]}.
          </h2>
        </div>
        {urgentDeadlines.length > 0 && (
          <Link href="/deadlines" className="group flex items-center gap-2 rounded-full bg-rose-500/10 ring-1 ring-rose-500/25 text-rose-700 pl-4 pr-3 py-2.5 text-sm font-semibold hover:bg-rose-500/15 transition-all duration-300 ease-fluid">
            <Bell className="w-4 h-4" strokeWidth={1.8} />
            {urgentDeadlines.length} plazo{urgentDeadlines.length !== 1 ? 's' : ''} urgente{urgentDeadlines.length !== 1 ? 's' : ''}
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        )}
      </div>

      {/* Onboarding */}
      {isNewUser && (
        <div className="relative overflow-hidden rounded-4xl bg-ink-950 p-7 text-white mb-6 animate-fade-up">
          <div className="pointer-events-none absolute -top-20 -right-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(147,48,42,0.16),transparent_65%)]" />
          <div className="relative">
            <span className="inline-flex items-center rounded-full bg-white/[0.06] ring-1 ring-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-gold-300">Primeros pasos</span>
            <h2 className="font-display text-2xl font-semibold mt-4 mb-1">Bienvenido a DLEGAL.</h2>
            <p className="text-white/55 text-sm mb-6">Tu estudio está listo. Empezá por aquí:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { href: '/clients', icon: Users, title: 'Agregá un cliente', desc: 'Registrá tu cartera' },
                { href: '/cases', icon: Briefcase, title: 'Creá un caso', desc: 'Abrí un expediente' },
                { href: '/billing', icon: Receipt, title: 'Emití una factura', desc: 'Con IVA 10%' },
                { href: '/ai', icon: Bot, title: 'Probá LEXI IA', desc: 'Analizá contratos' },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="group rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/10 p-4 transition-all duration-300 ease-fluid">
                  <item.icon className="w-5 h-5 text-gold-300 mb-3" strokeWidth={1.6} />
                  <p className="font-semibold text-sm group-hover:text-gold-300 transition">{item.title}</p>
                  <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-5">
        {KPIS.map((c, i) => (
          <Link key={i} href={c.href}
            className="group relative rounded-3xl bg-white p-5 shadow-tinted-sm ring-1 ring-ink-900/[0.06] hover:shadow-tinted-lg hover:-translate-y-1 transition-all duration-500 ease-fluid">
            <div className="flex items-start justify-between mb-5">
              <span className={`grid h-11 w-11 place-items-center rounded-2xl transition-colors ${c.accent ? 'bg-rose-500/10 ring-1 ring-rose-500/20' : 'bg-ink-900 ring-1 ring-gold-400/15'}`}>
                <c.icon className={`w-5 h-5 ${c.accent ? 'text-rose-600' : 'text-gold-400'}`} strokeWidth={1.7} />
              </span>
              <ChevronRight className="w-4 h-4 text-ink-200 group-hover:text-gold-500 group-hover:translate-x-0.5 transition-all duration-300" />
            </div>
            <p className="font-display text-3xl font-semibold text-ink-900 tnum leading-none">{c.value}</p>
            <p className="text-sm font-medium text-ink-700 mt-2">{c.label}</p>
            <p className="text-xs text-ink-400 mt-1">{c.sub}</p>
          </Link>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 mb-5">
        {/* Case Status Chart */}
        <section className="rounded-3xl bg-white p-6 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gold-500" strokeWidth={1.7} />Casos por estado
            </h3>
            <Link href="/cases" className="text-xs text-ink-400 hover:text-gold-600 font-medium flex items-center gap-1 transition">
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={186}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9aa1bb' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9aa1bb' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(20,24,43,0.04)' }}
                  formatter={(v: any) => [v, 'casos']}
                  contentStyle={{ borderRadius: 12, border: '1px solid rgba(20,24,43,0.08)', fontSize: 12, boxShadow: '0 8px 24px -8px rgba(20,24,43,0.18)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[186px] flex items-center justify-center text-ink-200 text-sm">Sin casos aún</div>
          )}
        </section>

        {/* Plazos */}
        <section className="rounded-3xl bg-white p-6 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gold-500" strokeWidth={1.7} />Plazos próximos
            </h3>
            <Link href="/deadlines" className="text-xs text-ink-400 hover:text-gold-600 font-medium flex items-center gap-1 transition">
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {allDeadlines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[160px] text-center">
              <CheckSquare className="w-9 h-9 text-ink-200 mb-2" strokeWidth={1.4} />
              <p className="text-sm text-ink-400 font-medium">Sin plazos próximos</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {allDeadlines.map((d: any) => {
                const days = daysUntil(d.due_date)
                const badge = urgencyBadge(days)
                return (
                  <li key={d.id} className="flex items-center gap-3 rounded-xl px-2 py-2 -mx-2 hover:bg-ink-900/[0.03] transition">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 tnum ${badge.cls}`}>{badge.label}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-800 truncate">{d.title}</p>
                      {d.case_title && <p className="text-xs text-ink-400 truncate">{d.case_title}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Tareas + Acceso rápido */}
        <div className="space-y-4 sm:space-y-5">
          <section className="rounded-3xl bg-white p-6 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-gold-500" strokeWidth={1.7} />Tareas
              </h3>
              <Link href="/tasks" className="text-xs text-ink-400 hover:text-gold-600 font-medium flex items-center gap-1 transition">
                Ver todas <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {!tasks.length ? (
              <p className="text-sm text-ink-400 text-center py-4">Sin tareas pendientes</p>
            ) : (
              <ul className="space-y-2.5">
                {tasks.map((t: any) => (
                  <li key={t.id} className="flex items-center gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.priority === 'critical' ? 'bg-rose-500' : t.priority === 'high' ? 'bg-gold-500' : 'bg-ink-300'}`} />
                    <p className="text-sm text-ink-700 truncate flex-1">{t.title}</p>
                    {t.due_date && (() => { const d = daysUntil(t.due_date); const b = urgencyBadge(d); return d <= 3 ? <span className={`text-xs px-1.5 py-0.5 rounded-lg font-bold flex-shrink-0 ${b.cls}`}>{b.label}</span> : null })()}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl bg-white p-5 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
            <h3 className="font-display text-base font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-gold-500" strokeWidth={1.8} />Acceso rápido
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {QUICK.map(a => (
                <Link key={a.href} href={a.href}
                  className="group flex flex-col items-center gap-1.5 rounded-2xl bg-paper-deep/60 hover:bg-ink-900 ring-1 ring-ink-900/[0.05] px-2 py-3 text-center transition-all duration-300 ease-fluid">
                  <a.icon className="w-[18px] h-[18px] text-ink-500 group-hover:text-gold-400 transition-colors" strokeWidth={1.6} />
                  <span className="text-[11px] font-semibold text-ink-600 group-hover:text-white transition-colors leading-tight">{a.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        {/* Audiencias */}
        <section className="rounded-3xl bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-ink-900/[0.06] flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
              <Gavel className="w-4 h-4 text-gold-500" strokeWidth={1.7} />Próximas audiencias
            </h3>
            <Link href="/hearings" className="text-xs text-ink-400 hover:text-gold-600 font-medium flex items-center gap-1 transition">
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {hearings.length === 0 ? (
            <div className="py-12 text-center text-ink-300 text-sm flex flex-col items-center gap-2">
              <Gavel className="w-8 h-8 text-ink-200" strokeWidth={1.3} />Sin audiencias próximas
            </div>
          ) : (
            <div className="divide-y divide-ink-900/[0.05]">
              {hearings.slice(0, 5).map((h: any) => {
                const d = h.scheduled_at ? new Date(h.scheduled_at) : null
                return (
                  <div key={h.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-ink-900/[0.02] transition">
                    <div className="w-11 h-11 rounded-2xl bg-ink-900 text-gold-400 flex flex-col items-center justify-center flex-shrink-0 text-xs font-bold ring-1 ring-gold-400/15">
                      {d ? <><span className="font-display text-base leading-none">{d.getDate()}</span><span className="leading-none text-[9px] text-white/50 mt-0.5">{d.toLocaleString('es-PY', { month: 'short' }).toUpperCase()}</span></> : '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink-800 truncate">{h.title || h.case_title}</p>
                      <div className="flex items-center gap-2 text-xs text-ink-400 mt-0.5">
                        {d && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}</span>}
                        {h.court && <span className="truncate">{h.court}</span>}
                      </div>
                    </div>
                    {h.hearing_type && (
                      <span className="text-xs bg-gold-400/12 text-gold-700 px-2 py-0.5 rounded-lg font-medium flex-shrink-0 capitalize">{h.hearing_type}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Citas */}
        <section className="rounded-3xl bg-white ring-1 ring-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-ink-900/[0.06] flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold-500" strokeWidth={1.7} />Próximas citas
            </h3>
            <Link href="/appointments" className="text-xs text-ink-400 hover:text-gold-600 font-medium flex items-center gap-1 transition">
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {appts.length === 0 ? (
            <div className="py-12 text-center text-ink-300 text-sm flex flex-col items-center gap-2">
              <Calendar className="w-8 h-8 text-ink-200" strokeWidth={1.3} />Sin citas programadas
            </div>
          ) : (
            <div className="divide-y divide-ink-900/[0.05]">
              {appts.slice(0, 5).map((a: any) => {
                const d = a.scheduled_at ? new Date(a.scheduled_at) : null
                return (
                  <div key={a.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-ink-900/[0.02] transition">
                    <div className="w-11 h-11 rounded-2xl bg-paper-deep text-ink-700 flex flex-col items-center justify-center flex-shrink-0 text-xs font-bold ring-1 ring-ink-900/[0.06]">
                      {d ? <><span className="font-display text-base leading-none">{d.getDate()}</span><span className="leading-none text-[9px] text-ink-400 mt-0.5">{d.toLocaleString('es-PY', { month: 'short' }).toUpperCase()}</span></> : '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink-800 truncate">{a.title}</p>
                      <div className="flex items-center gap-2 text-xs text-ink-400 mt-0.5">
                        {d && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}</span>}
                        {a.client_name && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{a.client_name}</span>}
                      </div>
                    </div>
                    {a.meeting_type && (
                      <span className="text-xs px-2 py-0.5 rounded-lg font-medium flex-shrink-0 capitalize bg-ink-900/[0.05] text-ink-500">{a.meeting_type}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
