'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Lock, Mail, Eye, EyeOff, LogOut, Briefcase, FileText, DollarSign, Calendar, Clock, MapPin } from 'lucide-react'
import Logo, { LogoMark, Wordmark } from '@/components/Logo'

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

function usePortalAuth() {
  const [token, setToken] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('xlegal_portal_token'))
    }
  }, [])
  const login = (t: string) => {
    localStorage.setItem('xlegal_portal_token', t)
    setToken(t)
  }
  const logout = () => {
    localStorage.removeItem('xlegal_portal_token')
    setToken(null)
  }
  return { token, login, logout }
}

function portalApi(token: string) {
  return axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ── Login Form ──────────────────────────────────────────────────────────────
function PortalLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password })
      if (data.user.role !== 'client_portal') {
        toast.error('Este acceso es solo para clientes. Abogados ingresan por el sistema principal.')
        setLoading(false)
        return
      }
      onLogin(data.access_token)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Credenciales incorrectas')
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950 flex items-center justify-center p-4">
      <div className="pointer-events-none absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(147,48,42,0.16),transparent_65%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(34,40,69,0.9),transparent_70%)]" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <LogoMark size={52} />
          <Wordmark dark className="mt-3 text-2xl" />
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">Portal del cliente</p>
        </div>

        <div className="bg-white rounded-3xl p-8 ring-1 ring-ink-900/[0.06] shadow-tinted-lg">
          <h2 className="font-display text-xl font-semibold text-ink-900 tracking-tight mb-6">Ingresá a tu expediente</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" strokeWidth={1.7} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="tu@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" strokeWidth={1.7} />
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600 transition">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-ink-900 text-white font-semibold rounded-full hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid disabled:opacity-60">
              {loading ? 'Ingresando…' : 'Ingresar al portal'}
            </button>
          </form>
          <p className="text-center text-xs text-ink-400 mt-6">
            ¿Problemas para ingresar? Contactá a tu estudio jurídico.<br />
            <a href="https://wa.me/595993397400" target="_blank" rel="noreferrer"
              className="text-gold-600 hover:text-gold-700 font-medium transition">
              WhatsApp: 0993397400
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Portal Dashboard ──────────────────────────────────────────────────────
function PortalDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tab, setTab] = useState<'casos' | 'facturas' | 'documentos' | 'audiencias'>('casos')
  const [me, setMe] = useState<any>(null)
  const [cases, setCases] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [hearings, setHearings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const api = portalApi(token)

  const formatPYG = (n: number) => '₲ ' + Math.round(n).toLocaleString('es-PY')

  useEffect(() => {
    const load = async () => {
      try {
        const [meR, casesR, invR, docsR, hrR] = await Promise.all([
          api.get('/portal/me'),
          api.get('/portal/cases'),
          api.get('/portal/invoices'),
          api.get('/portal/documents'),
          api.get('/portal/hearings'),
        ])
        setMe(meR.data)
        setCases(casesR.data.items || [])
        setInvoices(invR.data.items || [])
        setDocs(docsR.data.items || [])
        setHearings(hrR.data.items || [])
      } catch (err: any) {
        if (err.response?.status === 401) onLogout()
        toast.error('Error al cargar tu portal')
      }
      setLoading(false)
    }
    load()
  }, [])

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-gold-500/15 text-gold-800 ring-1 ring-gold-500/30',
      pending: 'bg-sand-100 text-ink-600 ring-1 ring-ink-900/[0.06]',
      overdue: 'bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20',
      paid: 'bg-ink-900/[0.05] text-ink-700 ring-1 ring-ink-900/10',
      closed: 'bg-sand-100 text-ink-500 ring-1 ring-ink-900/[0.06]',
      scheduled: 'bg-ink-900/[0.05] text-ink-700 ring-1 ring-ink-900/10',
      completed: 'bg-gold-500/15 text-gold-800 ring-1 ring-gold-500/30',
    }
    return map[status] || 'bg-sand-100 text-ink-500 ring-1 ring-ink-900/[0.06]'
  }

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: 'Activo', pending: 'Pendiente', overdue: 'Vencido',
      paid: 'Pagado', closed: 'Cerrado', scheduled: 'Programada', completed: 'Realizada',
    }
    return map[status] || status
  }

  const pendingTotal = invoices
    .filter(i => i.status === 'pending' || i.status === 'overdue')
    .reduce((acc, i) => acc + (i.total || 0), 0)

  const nextHearing = hearings
    .filter(h => h.status === 'scheduled' && h.hearing_date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.hearing_date.localeCompare(b.hearing_date))[0]

  if (loading) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="text-center">
        <LogoMark size={44} className="mx-auto mb-3 animate-pulse" />
        <p className="text-ink-500 text-sm">Cargando tu portal…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="bg-ink-950 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo dark size={36} tagline={null} textSize="text-lg" />
          <span className="text-white/40 text-sm hidden sm:block border-l border-white/15 pl-3">Portal del cliente</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/70 hidden sm:block">
            Hola, {me?.full_name?.split(' ')[0] || 'Cliente'}
          </span>
          <button onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition text-sm">
            <LogOut className="w-4 h-4" strokeWidth={1.7} /> Salir
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Casos activos', value: cases.filter(c => c.status === 'active').length, icon: Briefcase, accent: false },
            { label: 'Facturas pendientes', value: pendingTotal > 0 ? formatPYG(pendingTotal) : '₲ 0', icon: DollarSign, accent: pendingTotal > 0, danger: pendingTotal > 0 },
            { label: 'Documentos', value: docs.length, icon: FileText, accent: false },
            { label: 'Próxima audiencia', value: nextHearing ? nextHearing.hearing_date : 'Sin agenda', icon: Calendar, accent: true },
          ].map((s: any, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.danger ? 'bg-rose-500/10' : s.accent ? 'bg-gold-400/10' : 'bg-ink-900/[0.05]'}`}>
                <s.icon className={`w-5 h-5 ${s.danger ? 'text-rose-600' : s.accent ? 'text-gold-600' : 'text-ink-500'}`} strokeWidth={1.7} />
              </div>
              <div className="font-semibold text-ink-900 text-lg leading-tight tnum">{s.value}</div>
              <div className="text-xs text-ink-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
          <div className="flex border-b border-ink-900/[0.07] overflow-x-auto">
            {(['casos', 'facturas', 'documentos', 'audiencias'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-6 py-4 text-sm font-medium capitalize whitespace-nowrap transition border-b-2 ${tab === t ? 'border-gold-500 text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-800'}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Casos */}
            {tab === 'casos' && (
              cases.length === 0
                ? <div className="text-center py-12 text-ink-400">
                    <Briefcase className="w-10 h-10 mx-auto mb-3 text-ink-200" strokeWidth={1.5} />
                    <p>No hay casos registrados aún</p>
                  </div>
                : <div className="space-y-3">
                    {cases.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-4 ring-1 ring-ink-900/[0.06] rounded-xl hover:bg-sand-50 transition">
                        <div>
                          <p className="font-medium text-ink-900">{c.title}</p>
                          <p className="text-sm text-ink-400 mt-0.5">
                            {c.case_number && <span className="mr-3 tnum">#{c.case_number}</span>}
                            {c.case_type && <span>{c.case_type}</span>}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusBadge(c.status)}`}>
                          {statusLabel(c.status)}
                        </span>
                      </div>
                    ))}
                  </div>
            )}

            {/* Facturas */}
            {tab === 'facturas' && (
              invoices.length === 0
                ? <div className="text-center py-12 text-ink-400">
                    <DollarSign className="w-10 h-10 mx-auto mb-3 text-ink-200" strokeWidth={1.5} />
                    <p>No hay facturas registradas</p>
                  </div>
                : <>
                    {pendingTotal > 0 && (
                      <div className="bg-gold-400/10 ring-1 ring-gold-400/25 rounded-xl p-4 mb-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gold-800">Saldo pendiente</p>
                          <p className="text-2xl font-semibold text-gold-700 tnum">{formatPYG(pendingTotal)}</p>
                        </div>
                        <a href={`https://wa.me/595993397400?text=Hola, quiero consultar sobre mi saldo pendiente`}
                           target="_blank" rel="noreferrer"
                           className="px-4 py-2 bg-ink-900 text-white rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid">
                          Consultar pago
                        </a>
                      </div>
                    )}
                    <div className="space-y-3">
                      {invoices.map((inv: any) => (
                        <div key={inv.id} className="flex items-center justify-between p-4 ring-1 ring-ink-900/[0.06] rounded-xl">
                          <div>
                            <p className="font-medium text-ink-900">
                              {inv.invoice_number ? `Factura #${inv.invoice_number}` : 'Factura'}
                            </p>
                            <p className="text-sm text-ink-400 mt-0.5">
                              Vence: {inv.due_date || '—'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-ink-900 tnum">{formatPYG(inv.total)}</p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(inv.status)}`}>
                              {statusLabel(inv.status)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
            )}

            {/* Documentos */}
            {tab === 'documentos' && (
              docs.length === 0
                ? <div className="text-center py-12 text-ink-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-ink-200" strokeWidth={1.5} />
                    <p>No hay documentos compartidos aún</p>
                  </div>
                : <div className="space-y-3">
                    {docs.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between p-4 ring-1 ring-ink-900/[0.06] rounded-xl hover:bg-sand-50 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gold-400/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-gold-600" strokeWidth={1.7} />
                          </div>
                          <div>
                            <p className="font-medium text-ink-900">{d.name}</p>
                            <p className="text-xs text-ink-400">{d.document_type || 'Documento'}</p>
                          </div>
                        </div>
                        {d.file_url && (
                          <a href={d.file_url} target="_blank" rel="noreferrer"
                             className="px-4 py-2 bg-ink-900 text-white rounded-full text-xs font-medium hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid">
                            Ver
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
            )}

            {/* Audiencias */}
            {tab === 'audiencias' && (
              hearings.length === 0
                ? <div className="text-center py-12 text-ink-400">
                    <Calendar className="w-10 h-10 mx-auto mb-3 text-ink-200" strokeWidth={1.5} />
                    <p>No hay audiencias agendadas</p>
                  </div>
                : <div className="space-y-3">
                    {hearings.sort((a, b) => a.hearing_date.localeCompare(b.hearing_date)).map((h: any) => (
                      <div key={h.id} className="flex items-center justify-between p-4 ring-1 ring-ink-900/[0.06] rounded-xl">
                        <div>
                          <p className="font-medium text-ink-900">{h.title}</p>
                          <p className="text-sm text-ink-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{h.hearing_date}</span>
                            {h.hearing_time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{h.hearing_time}</span>}
                            {h.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{h.location}</span>}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusBadge(h.status)}`}>
                          {statusLabel(h.status)}
                        </span>
                      </div>
                    ))}
                  </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-ink-400 mt-6">
          DLEGAL — Portal seguro · Soporte: <a href="tel:0993397400" className="hover:text-ink-700 transition">0993397400</a>
        </p>
      </div>
    </div>
  )
}

// ── Main Portal Page ──────────────────────────────────────────────────────
export default function PortalPage() {
  const { token, login, logout } = usePortalAuth()

  if (!token) return <PortalLogin onLogin={login} />
  return <PortalDashboard token={token} onLogout={logout} />
}
