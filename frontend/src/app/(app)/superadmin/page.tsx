'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, businessApi } from '@/lib/api'
import { formatPYG } from '@/lib/utils'
import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Building2, Users, DollarSign, AlertTriangle, Plus, Bell, CheckCircle,
  Clock, TrendingUp, Phone, MessageCircle, ToggleLeft, ToggleRight,
  Shield, CreditCard, UserPlus, Search, LogIn, Trash2, Download, Edit3,
  X, ChevronRight, Activity, Database, Key, Send,
  RefreshCw, ExternalLink, Settings, BarChart2, Zap, Mail,
  Megaphone, Globe, Share2, Target, Layers, BarChart3, Smartphone, Eye, MousePointer, Link2,
} from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────
const PHONE = '0993397400'
const PLANS = ['solo', 'bufete_s', 'bufete_m', 'bufete_l']
const PLAN_SHORT: Record<string, string> = { solo: 'Solo', bufete_s: 'S', bufete_m: 'M', bufete_l: 'L' }
const PLAN_PRICE: Record<string, string> = { solo: '₲75k', bufete_s: '₲300k', bufete_m: '₲500k', bufete_l: 'Consultar' }
const PLAN_CLR: Record<string, { bg: string; text: string }> = {
  solo:     { bg: 'bg-ink-900/[0.05]',  text: 'text-ink-600'  },
  bufete_s: { bg: 'bg-ink-900/[0.05]',  text: 'text-ink-700'  },
  bufete_m: { bg: 'bg-gold-400/12',     text: 'text-gold-700' },
  bufete_l: { bg: 'bg-gold-400/12',     text: 'text-gold-700' },
}
const PAY: Record<string, { label: string; dot: string; badge: string }> = {
  trial:     { label: 'En prueba', dot: 'bg-ink-400',   badge: 'bg-ink-900/[0.05] text-ink-600' },
  active:    { label: 'Activo',    dot: 'bg-gold-500',  badge: 'bg-gold-400/12 text-gold-700'   },
  overdue:   { label: 'Vencido',   dot: 'bg-rose-500',  badge: 'bg-rose-500/10 text-rose-600'   },
  pending:   { label: 'Pendiente', dot: 'bg-ink-400',   badge: 'bg-ink-900/[0.05] text-ink-600' },
  cancelled: { label: 'Cancelado', dot: 'bg-ink-300',   badge: 'bg-ink-900/[0.05] text-ink-400' },
}
const ROLE_LBL: Record<string, string> = {
  super_admin: 'Super admin', firm_admin: 'Admin bufete', lawyer: 'Abogado',
  secretary: 'Secretaria', solo_lawyer: 'Independiente', client_portal: 'Portal cliente',
}
const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
const lbl = 'block text-[11px] font-bold text-ink-400 mb-1.5 uppercase tracking-wider'

type Tab = 'dashboard' | 'tenants' | 'billing' | 'users' | 'new-tenant' | 'new-user' | 'broadcast' | 'tools' | 'ads' | 'analytics' | 'social' | 'marketing' | 'bi'

interface Tenant {
  id: string; name: string; legal_name?: string; ruc?: string; email?: string; phone?: string
  whatsapp?: string; admin_name?: string; admin_email?: string; admin_phone?: string; city?: string
  plan: string; plan_info?: any; is_active: boolean; payment_status: string
  trial_ends_at?: string; next_payment_at?: string; last_payment_at?: string
  payment_notes?: string; notes?: string; db_schema?: string; user_count: number; created_at?: string
}
interface TUser { id: string; full_name: string; email: string; role: string; is_active: boolean; tenant_id: string; created_at?: string }

// ── Tiny Components ───────────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan: string }) {
  const c = PLAN_CLR[plan] || { bg: 'bg-ink-900/[0.05]', text: 'text-ink-600' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${c.bg} ${c.text}`}>{PLAN_SHORT[plan] || plan}</span>
}
function StatusPill({ status }: { status: string }) {
  const s = PAY[status] || PAY.trial
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [payFilter, setPayFilter] = useState('')
  const [userSearch, setUserSearch] = useState('')

  // Drawer
  const [drawerT, setDrawerT]     = useState<Tenant | null>(null)
  const [editMode, setEditMode]   = useState(false)
  const [editForm, setEditForm]   = useState<Partial<Tenant>>({})

  // Modals
  const [payModal, setPayModal]   = useState(false)
  const [payT, setPayT]           = useState<Tenant | null>(null)
  const [payDate, setPayDate]     = useState(new Date().toISOString().split('T')[0])
  const [payNote, setPayNote]     = useState('')
  const [pwModal, setPwModal]     = useState(false)
  const [pwUser, setPwUser]       = useState<TUser | null>(null)
  const [newPw, setNewPw]         = useState('')

  // Forms
  const [tf, setTf] = useState({ firm_name:'', legal_name:'', admin_name:'', email:'', password:'', phone:'', whatsapp:'', plan:'solo', city:'Asunción', ruc:'', notes:'' })
  const [uf, setUf] = useState({ tenant_id:'', full_name:'', email:'', password:'', role:'lawyer' })
  const [bSubject, setBSubject]   = useState('')
  const [bMessage, setBMessage]   = useState('')
  const [bActive, setBActive]     = useState(true)
  const [bTpl, setBTpl]           = useState('')

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ['sa-dash'], refetchInterval: 60000,
    queryFn: () => api.get('/superadmin/dashboard').then(r => r.data),
  })
  const { data: tenantsData, isLoading: loadingT } = useQuery({
    queryKey: ['sa-tenants', search, planFilter, payFilter],
    queryFn: () => api.get('/superadmin/tenants', { params: { search: search||undefined, plan: planFilter||undefined, payment_status: payFilter||undefined, limit:100 } }).then(r => r.data),
    enabled: tab === 'tenants',
  })
  const { data: billingData } = useQuery({
    queryKey: ['sa-billing'],
    queryFn: () => api.get('/superadmin/billing').then(r => r.data),
    enabled: tab === 'billing',
  })
  const { data: usersData } = useQuery({
    queryKey: ['sa-users'],
    queryFn: () => api.get('/superadmin/users', { params: { limit:100 } }).then(r => r.data),
    enabled: tab === 'users',
  })
  const { data: revenueData } = useQuery({
    queryKey: ['sa-revenue'],
    queryFn: () => api.get('/superadmin/revenue-history', { params: { months:12 } }).then(r => r.data),
  })
  const { data: signups } = useQuery({
    queryKey: ['sa-signups'],
    queryFn: () => api.get('/superadmin/recent-signups', { params: { limit:8 } }).then(r => r.data),
  })
  const { data: drawerDetail } = useQuery({
    queryKey: ['sa-detail', drawerT?.id],
    queryFn: () => api.get(`/superadmin/tenants/${drawerT!.id}/detail`).then(r => r.data),
    enabled: !!drawerT,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const mCreateT = useMutation({
    mutationFn: (d: any) => api.post('/superadmin/tenants', d),
    onSuccess: (r) => { toast.success(r.data.message); qc.invalidateQueries({queryKey:['sa-tenants']}); qc.invalidateQueries({queryKey:['sa-dash']}); setTf({firm_name:'',legal_name:'',admin_name:'',email:'',password:'',phone:'',whatsapp:'',plan:'solo',city:'Asunción',ruc:'',notes:''}); setTab('tenants') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const mCreateU = useMutation({
    mutationFn: (d: any) => api.post('/superadmin/users', d),
    onSuccess: (r) => { toast.success(r.data.message); qc.invalidateQueries({queryKey:['sa-users']}); setTab('users') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })
  const mUpdateT = useMutation({
    mutationFn: ({id, data}: {id:string; data:any}) => api.put(`/superadmin/tenants/${id}`, data),
    onSuccess: () => { toast.success('Actualizado'); qc.invalidateQueries({queryKey:['sa-tenants']}); qc.invalidateQueries({queryKey:['sa-detail', drawerT?.id]}); setEditMode(false) },
  })
  const mPlan = useMutation({
    mutationFn: ({id, plan}: {id:string; plan:string}) => api.put(`/superadmin/tenants/${id}/plan`, {plan}),
    onSuccess: (r) => { toast.success(r.data.message); qc.invalidateQueries({queryKey:['sa-tenants']}); qc.invalidateQueries({queryKey:['sa-detail', drawerT?.id]}) },
  })
  const mToggleT = useMutation({
    mutationFn: (id:string) => api.put(`/superadmin/tenants/${id}/toggle`),
    onSuccess: (r) => { toast.success(r.data.message); qc.invalidateQueries({queryKey:['sa-tenants']}); qc.invalidateQueries({queryKey:['sa-dash']}) },
  })
  const mDeleteT = useMutation({
    mutationFn: (id:string) => api.delete(`/superadmin/tenants/${id}`),
    onSuccess: (r) => { toast.success(r.data.message); qc.invalidateQueries({queryKey:['sa-tenants']}); qc.invalidateQueries({queryKey:['sa-dash']}); setDrawerT(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al eliminar'),
  })
  const mPay = useMutation({
    mutationFn: ({id, data}: {id:string; data:any}) => api.post(`/superadmin/tenants/${id}/register-payment`, data),
    onSuccess: () => { toast.success('Pago registrado'); qc.invalidateQueries({queryKey:['sa-billing']}); qc.invalidateQueries({queryKey:['sa-tenants']}); qc.invalidateQueries({queryKey:['sa-detail', payT?.id]}); setPayModal(false); setPayNote('') },
  })
  const mRemind = useMutation({
    mutationFn: (id:string) => api.post(`/superadmin/billing/send-reminder/${id}`),
    onSuccess: (r) => toast.success(`Recordatorio enviado a ${r.data.contact}`),
    onError: () => toast.error('Error'),
  })
  const mImpersonate = useMutation({
    mutationFn: (tid:string) => api.post(`/superadmin/impersonate-tenant/${tid}`),
    onSuccess: (r) => { toast.success(`Ingresando como ${r.data.impersonating.email}…`); localStorage.setItem('xlegal_token', r.data.access_token); setTimeout(() => { window.location.href = '/dashboard' }, 800) },
    onError: () => toast.error('Error al acceder'),
  })
  const mExport = useMutation({
    mutationFn: (tid:string) => api.get(`/superadmin/tenants/${tid}/export`),
    onSuccess: (r) => { const blob=new Blob([JSON.stringify(r.data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`xlegal_${r.data.tenant.name.replace(/\s+/g,'_')}_${Date.now()}.json`; a.click(); toast.success('Exportado') },
  })
  const mToggleU = useMutation({
    mutationFn: (uid:string) => api.put(`/superadmin/users/${uid}/toggle`),
    onSuccess: () => { toast.success('Usuario actualizado'); qc.invalidateQueries({queryKey:['sa-users']}) },
  })
  const mResetPw = useMutation({
    mutationFn: ({uid, pw}: {uid:string; pw:string}) => api.put(`/superadmin/users/${uid}/reset-password`, {password:pw}),
    onSuccess: () => { toast.success('Contraseña actualizada'); setPwModal(false); setNewPw('') },
  })
  const mBroadcast = useMutation({
    mutationFn: (d: any) => api.post('/superadmin/broadcast', d),
    onSuccess: (r) => { toast.success(r.data.message); setBSubject(''); setBMessage(''); setBTpl('') },
    onError: () => toast.error('Error al enviar'),
  })

  const kpis = dash?.kpis
  const tenants: Tenant[] = tenantsData?.tenants || []
  const filteredUsers = ((usersData?.users||[]) as TUser[]).filter(u =>
    !userSearch || u.full_name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const BROADCAST_TEMPLATES = [
    { label: 'Actualización', subject: 'Actualización del sistema DLEGAL', body: 'Les informamos que hemos lanzado mejoras en el sistema. Encontrarán cambios en la interfaz y nuevas funcionalidades disponibles desde hoy.' },
    { label: 'Mantenimiento', subject: 'Mantenimiento programado — DLEGAL', body: 'Les comunicamos que el sistema estará en mantenimiento programado el día ___ de ___ de ___, de __:__ hs a __:__ hs. Durante ese período el sistema no estará disponible.' },
    { label: 'Vencimiento', subject: '⚠️ Tu suscripción está por vencer — DLEGAL', body: 'Te recordamos que tu suscripción a DLEGAL está próxima a vencer. Para continuar usando el sistema sin interrupciones, coordiná el pago con nosotros al 0993397400.' },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────
  const NAV: { id: Tab; icon: any; label: string; alert?: boolean; group?: string }[] = [
    // ── Negocio SaaS ──
    { id: 'dashboard',  icon: BarChart2,  label: 'Dashboard',      group: 'saas' },
    { id: 'tenants',    icon: Building2,  label: 'Clientes',       group: 'saas', alert: (kpis?.overdue_tenants||0) > 0 },
    { id: 'billing',    icon: CreditCard, label: 'Cobranzas',      group: 'saas' },
    { id: 'users',      icon: Users,      label: 'Usuarios',       group: 'saas' },
    { id: 'new-tenant', icon: Plus,       label: 'Alta Cliente',   group: 'saas' },
    { id: 'new-user',   icon: UserPlus,   label: 'Alta Usuario',   group: 'saas' },
    { id: 'broadcast',  icon: Mail,       label: 'Comunicados',    group: 'saas' },
    { id: 'tools',      icon: Settings,   label: 'Sistema',        group: 'saas' },
    // ── Marketing & Negocio ──
    { id: 'ads',        icon: Megaphone,  label: 'Publicidad',     group: 'marketing' },
    { id: 'analytics',  icon: Globe,      label: 'Analytics Web',  group: 'marketing' },
    { id: 'social',     icon: Share2,     label: 'Redes Sociales', group: 'marketing' },
    { id: 'marketing',  icon: Target,     label: 'Marketing',      group: 'marketing' },
    { id: 'bi',         icon: Layers,     label: 'BI & KPIs',      group: 'marketing' },
  ]

  return (
    <AppLayout title="Super Admin — DLEGAL">

      {/* Nav */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-ink-950 rounded-2xl overflow-x-auto flex-nowrap">
        {NAV.map(({ id, icon: Icon, label, alert, group }, idx) => {
          const prev = NAV[idx - 1]
          const showSep = idx > 0 && prev?.group !== group
          return (
            <div key={id} className="flex items-center gap-1 flex-shrink-0">
              {showSep && <div className="w-px h-6 bg-white/10 mx-1" />}
              <button onClick={() => setTab(id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                  ${tab === id
                    ? 'bg-gold-500 text-ink-950 shadow'
                    : 'text-ink-400 hover:text-white hover:bg-white/[0.08]'}`}>
                <Icon strokeWidth={1.7} className="w-4 h-4" />{label}
                {alert && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full" />}
              </button>
            </div>
          )
        })}
      </div>

      {/* ════════════════════════ DASHBOARD ════════════════════════ */}
      {tab === 'dashboard' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { l:'MRR',         v: kpis?.mrr_label||'—',         icon: TrendingUp,   bg:'bg-gold-400/12', ic:'text-gold-600' },
              { l:'Activos',     v: kpis?.active_tenants||0,       icon: CheckCircle,  bg:'bg-gold-400/12', ic:'text-gold-600' },
              { l:'En prueba',   v: kpis?.trial_tenants||0,        icon: Clock,        bg:'bg-ink-900/5',   ic:'text-ink-700'  },
              { l:'Vencidos',    v: kpis?.overdue_tenants||0,      icon: AlertTriangle,bg:'bg-rose-500/10', ic:'text-rose-500' },
              { l:'Usuarios',    v: kpis?.total_users||0,          icon: Users,        bg:'bg-ink-900/5',   ic:'text-ink-700'  },
              { l:'Total clientes', v: kpis?.total_tenants||0,     icon: Building2,    bg:'bg-ink-900/5',   ic:'text-ink-700'  },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
                <div className={`w-8 h-8 ${c.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <c.icon strokeWidth={1.7} className={`w-4 h-4 ${c.ic}`} />
                </div>
                <p className="text-xl font-bold text-ink-900 tnum">{dashLoading ? '…' : c.v}</p>
                <p className="text-xs text-ink-400 mt-0.5">{c.l}</p>
              </div>
            ))}
          </div>

          <div className="grid xl:grid-cols-3 gap-5">
            {/* MRR Chart */}
            <div className="xl:col-span-2 bg-white rounded-2xl ring-1 ring-ink-900/[0.06] p-5 shadow-tinted-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-semibold text-ink-900 tracking-tight">Ingresos mensuales (MRR)</h3>
                <span className="text-xs text-ink-400 bg-paper px-3 py-1 rounded-xl">12 meses</span>
              </div>
              {revenueData?.history?.length ? (
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={revenueData.history} margin={{ top:5, right:5, left:0, bottom:0 }}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#c2a14a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#c2a14a" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize:10, fill:'#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize:10, fill:'#9ca3af' }} tickLine={false} axisLine={false}
                      tickFormatter={v => v>=1000000 ? `₲${(v/1000000).toFixed(1)}M` : v>=1000 ? `₲${(v/1000).toFixed(0)}k` : String(v)} />
                    <Tooltip formatter={(v:any) => [formatPYG(v), 'MRR']} contentStyle={{ borderRadius:12, border:'1px solid #e5e7eb', fontSize:12 }} />
                    <Area type="monotone" dataKey="mrr_pyg" stroke="#c2a14a" strokeWidth={2.5} fill="url(#g)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[190px] flex items-center justify-center text-ink-200 text-sm">Sin datos disponibles aún</div>
              )}
            </div>

            {/* Distribution */}
            <div className="bg-white rounded-2xl ring-1 ring-ink-900/[0.06] p-5 shadow-tinted-sm flex flex-col gap-5">
              <div>
                <h4 className="font-display font-semibold text-ink-900 tracking-tight mb-4">Distribución de planes</h4>
                <div className="space-y-3">
                  {PLANS.map(p => {
                    const count = dash?.plan_distribution?.[p] || 0
                    const total = Object.values(dash?.plan_distribution||{}).reduce((a:any,b:any)=>a+b,0) as number
                    const pct = total ? Math.round(count/total*100) : 0
                    const c = PLAN_CLR[p]
                    return (
                      <div key={p}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${c?.bg} ${c?.text}`}>{PLAN_SHORT[p]} {PLAN_PRICE[p]}</span>
                          <span className="text-xs text-ink-500 font-semibold tnum">{count}</span>
                        </div>
                        <div className="h-1.5 bg-ink-900/[0.05] rounded-full overflow-hidden">
                          <div className="h-full bg-gold-500 rounded-full transition-all duration-500" style={{width:`${pct}%`}} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="border-t border-ink-900/[0.06] pt-4">
                <h4 className="font-display font-semibold text-ink-900 tracking-tight mb-3">Estado de pagos</h4>
                {Object.entries(PAY).map(([k, v]) => {
                  const n = dash?.payment_status?.[k] || 0
                  if (!n) return null
                  return (
                    <div key={k} className="flex items-center justify-between py-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${v.badge}`}>{v.label}</span>
                      <span className="text-sm font-bold text-ink-700 tnum">{n}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recent Signups + Info */}
          <div className="grid xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 bg-white rounded-2xl ring-1 ring-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-ink-900/[0.06] flex items-center justify-between">
                <h3 className="font-display font-semibold text-ink-900 tracking-tight flex items-center gap-2">
                  <Zap strokeWidth={1.7} className="w-4 h-4 text-gold-600" />Últimos registros
                </h3>
                <button onClick={()=>setTab('tenants')} className="text-xs text-gold-700 hover:underline flex items-center gap-1 font-medium">
                  Ver todos <ChevronRight strokeWidth={1.7} className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-ink-900/[0.05]">
                {(signups?.signups||[]).map((s: any) => (
                  <div key={s.id} className="px-5 py-3 flex items-center gap-3 hover:bg-ink-900/[0.02] transition">
                    <div className="w-8 h-8 bg-ink-900/5 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 strokeWidth={1.7} className="w-4 h-4 text-ink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink-900 truncate">{s.name}</p>
                      <p className="text-xs text-ink-400">{s.admin_name} · {s.city||'PY'}</p>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-0.5">
                      <PlanBadge plan={s.plan} />
                      <p className="text-xs text-ink-400 block">{s.created_at ? new Date(s.created_at).toLocaleDateString('es-PY') : '—'}</p>
                    </div>
                  </div>
                ))}
                {!signups?.signups?.length && <div className="px-5 py-10 text-center text-ink-300 text-sm">Sin registros aún</div>}
              </div>
            </div>

            <div className="bg-ink-950 rounded-2xl p-5 text-white flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield strokeWidth={1.7} className="w-5 h-5 text-gold-400" />
                  <span className="font-bold text-sm">Super admin</span>
                  <span className="ml-auto text-xs text-ink-500 font-mono bg-white/5 px-2 py-0.5 rounded-lg">v2.3.0</span>
                </div>
                <p className="text-xs text-ink-500 mb-1">xabiercarrillo@gmail.com</p>
                <p className="text-gold-400 font-bold text-2xl mt-3 tnum">{kpis?.mrr_label||'₲ 0'}</p>
                <p className="text-xs text-ink-500 mt-0.5">MRR estimado · Paraguay</p>
              </div>
              <div className="mt-6 space-y-2">
                <a href={`tel:${PHONE}`} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl text-sm transition w-full">
                  <Phone strokeWidth={1.7} className="w-4 h-4 text-gold-400" />{PHONE}
                </a>
                <a href={`https://wa.me/595${PHONE.slice(1)}`} target="_blank" className="flex items-center gap-2 bg-gold-400/15 hover:bg-gold-400/25 px-4 py-2.5 rounded-xl text-sm transition w-full">
                  <MessageCircle strokeWidth={1.7} className="w-4 h-4 text-gold-400" />WhatsApp soporte
                </a>
                <a href="/docs" target="_blank" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl text-sm transition w-full">
                  <ExternalLink strokeWidth={1.7} className="w-4 h-4 text-ink-300" />API docs
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════ CLIENTES ════════════════════════ */}
      {tab === 'tenants' && (
        <div className="flex gap-4" style={{minHeight:600}}>
          {/* List panel */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input className="w-full pl-9 pr-3 py-2.5 border border-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 bg-white"
                  placeholder="Buscar nombre, email, RUC…" value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
              <select className="px-3 py-2.5 border border-ink-900/10 rounded-xl text-sm focus:outline-none bg-white" value={planFilter} onChange={e=>setPlanFilter(e.target.value)}>
                <option value="">Todos los planes</option>
                {PLANS.map(p=><option key={p} value={p}>{PLAN_SHORT[p]}</option>)}
              </select>
              <select className="px-3 py-2.5 border border-ink-900/10 rounded-xl text-sm focus:outline-none bg-white" value={payFilter} onChange={e=>setPayFilter(e.target.value)}>
                <option value="">Todos los estados</option>
                {Object.entries(PAY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={()=>setTab('new-tenant')} className="flex items-center gap-2 px-4 py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-800 transition">
                <Plus className="w-4 h-4" />Nuevo
              </button>
            </div>
            <p className="text-xs text-ink-400 font-medium">{tenants.length} cliente{tenants.length!==1?'s':''}</p>

            {loadingT ? (
              <div className="space-y-2">{[...Array(6)].map((_,i)=><div key={i} className="h-16 bg-white rounded-2xl animate-pulse border"/>)}</div>
            ) : (
              <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-paper border-b border-ink-900/[0.06]">
                    <tr>{['Cliente','Plan','Estado','Vence','Usuarios',''].map(h=>(
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-ink-400 uppercase tracking-wider">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-ink-900/[0.05]">
                    {tenants.map(t => (
                      <tr key={t.id} onClick={()=>{setDrawerT(t);setEditMode(false)}}
                        className={`cursor-pointer transition ${drawerT?.id===t.id ? 'bg-ink-900/[0.04]' : 'hover:bg-ink-900/[0.02]'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${t.is_active ? 'bg-ink-900/[0.08]' : 'bg-ink-900/[0.05]'}`}>
                              <Building2 className={`w-3.5 h-3.5 ${t.is_active ? 'text-ink-900/50' : 'text-ink-300'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-ink-900 leading-tight truncate">{t.name}</p>
                              <p className="text-xs text-ink-400 truncate max-w-[150px]">{t.admin_email||t.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><PlanBadge plan={t.plan} /></td>
                        <td className="px-4 py-3"><StatusPill status={t.payment_status} /></td>
                        <td className="px-4 py-3 text-xs text-ink-500 tnum">{t.next_payment_at||t.trial_ends_at||'—'}</td>
                        <td className="px-4 py-3 text-xs text-ink-500"><Users className="w-3 h-3 inline mr-1"/>{t.user_count}</td>
                        <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button onClick={()=>{setPayT(t);setPayModal(true)}} title="Registrar pago" className="p-1.5 rounded-lg hover:bg-gold-400/20 text-gold-700 transition"><DollarSign className="w-3.5 h-3.5"/></button>
                            <button onClick={()=>mRemind.mutate(t.id)} title="Recordatorio" className="p-1.5 rounded-lg hover:bg-ink-900/5 text-ink-500 transition"><Bell className="w-3.5 h-3.5"/></button>
                            <button onClick={()=>{if(confirm(`¿Ingresar como "${t.name}"?`))mImpersonate.mutate(t.id)}} title="Acceder como cliente" className="p-1.5 rounded-lg hover:bg-gold-400/12 text-gold-600 transition"><LogIn className="w-3.5 h-3.5"/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!tenants.length && (
                  <div className="py-16 text-center"><Building2 className="w-10 h-10 text-ink-200 mx-auto mb-2"/><p className="text-ink-400 text-sm">Sin clientes</p></div>
                )}
              </div>
            )}
          </div>

          {/* Drawer */}
          {drawerT && (
            <div className="w-[380px] flex-shrink-0 bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm overflow-hidden flex flex-col">
              <div className="bg-ink-950 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-gold-400"/>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={()=>{setEditMode(!editMode);setEditForm(drawerT)}}
                      className={`p-2 rounded-xl transition ${editMode ? 'bg-gold-500 text-ink-950' : 'hover:bg-white/10 text-ink-400'}`}>
                      <Edit3 className="w-3.5 h-3.5"/>
                    </button>
                    <button onClick={()=>mExport.mutate(drawerT.id)} className="p-2 rounded-xl hover:bg-white/10 text-ink-400 transition"><Download className="w-3.5 h-3.5"/></button>
                    <button onClick={()=>setDrawerT(null)} className="p-2 rounded-xl hover:bg-white/10 text-ink-400 transition"><X className="w-3.5 h-3.5"/></button>
                  </div>
                </div>
                <p className="font-bold text-white leading-tight">{drawerT.name}</p>
                <p className="text-xs text-ink-400 mt-0.5">{drawerT.ruc||'Sin RUC'} · {drawerT.city||'Paraguay'}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <PlanBadge plan={drawerT.plan}/>
                  <StatusPill status={drawerT.payment_status}/>
                  {!drawerT.is_active && <span className="text-xs bg-rose-500/15 text-rose-300 px-2 py-0.5 rounded-lg font-medium">INACTIVO</span>}
                </div>
              </div>

              {/* Usage stats */}
              {drawerDetail && (
                <div className="grid grid-cols-3 border-b border-ink-900/[0.06]">
                  {[['Casos',drawerDetail.usage?.case_count||0],['Clientes',drawerDetail.usage?.client_count||0],['Facturas',drawerDetail.usage?.invoice_count||0]].map(([l,v]:any)=>(
                    <div key={l} className="py-3 text-center border-r last:border-0 border-ink-900/[0.06]">
                      <p className="text-lg font-bold text-ink-900">{v}</p>
                      <p className="text-xs text-ink-400">{l}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {editMode ? (
                  <>
                    <p className="text-xs font-bold text-gold-400 uppercase tracking-wider">Editando datos</p>
                    {([
                      ['name','Nombre estudio','text'],['legal_name','Nombre legal','text'],
                      ['ruc','RUC','text'],['admin_name','Admin','text'],
                      ['admin_email','Email admin','email'],['admin_phone','Teléfono','text'],
                      ['whatsapp','WhatsApp','text'],['city','Ciudad','text'],
                    ] as [string,string,string][]).map(([f,l,t])=>(
                      <div key={f}><label className={lbl}>{l}</label>
                        <input type={t} className={inp} value={(editForm as any)[f]||''} onChange={e=>setEditForm(p=>({...p,[f]:e.target.value}))}/>
                      </div>
                    ))}
                    <div><label className={lbl}>Notas internas</label>
                      <textarea rows={2} className={`${inp} resize-none`} value={editForm.notes||''} onChange={e=>setEditForm(p=>({...p,notes:e.target.value}))}/>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>mUpdateT.mutate({id:drawerT.id,data:editForm})} disabled={mUpdateT.isPending}
                        className="flex-1 py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-800 disabled:opacity-50 transition">
                        {mUpdateT.isPending?'Guardando…':'✓ Guardar'}
                      </button>
                      <button onClick={()=>setEditMode(false)} className="p-2.5 border border-ink-900/10 rounded-xl hover:bg-ink-900/5 transition"><X className="w-4 h-4 text-ink-400"/></button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Info grid */}
                    <div className="space-y-2">
                      {[['👤 Admin',drawerT.admin_name],['📧 Email',drawerT.admin_email||drawerT.email],['📱 Teléfono',drawerT.admin_phone||drawerT.phone],['💬 WhatsApp',drawerT.whatsapp],['🏙️ Ciudad',drawerT.city],['🗄️ Schema BD',drawerT.db_schema],['💳 Último pago',drawerT.last_payment_at],['📅 Próx. vto.',drawerT.next_payment_at||drawerT.trial_ends_at]].filter(([,v])=>v).map(([k,v])=>(
                        <div key={k as string} className="flex items-start gap-2 text-xs">
                          <span className="text-ink-400 w-28 flex-shrink-0 mt-0.5">{k}</span>
                          <span className="text-ink-700 font-medium break-all leading-relaxed">{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Payment notes */}
                    {drawerT.payment_notes && (
                      <div className="bg-gold-400/[0.08] rounded-xl p-3 border border-gold-400/20">
                        <p className="text-xs font-bold text-gold-700 mb-1.5">Historial de pagos</p>
                        <p className="text-xs text-gold-700 whitespace-pre-wrap leading-relaxed">{drawerT.payment_notes}</p>
                      </div>
                    )}

                    {/* Plan change */}
                    <div>
                      <p className={`${lbl} mb-2`}>Cambiar plan</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {PLANS.map(p=>(
                          <button key={p} onClick={()=>mPlan.mutate({id:drawerT.id,plan:p})}
                            className={`py-2 rounded-xl text-xs font-bold transition border-2 ${drawerT.plan===p ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-900/10 text-ink-500 hover:border-ink-900/20'}`}>
                            {PLAN_SHORT[p]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Users */}
                    {(drawerDetail?.users?.length||0) > 0 && (
                      <div>
                        <p className={`${lbl} mb-2`}>Usuarios ({drawerDetail.users.length})</p>
                        <div className="space-y-1.5">
                          {drawerDetail.users.map((u: TUser)=>(
                            <div key={u.id} className="flex items-center gap-2 bg-paper rounded-xl px-3 py-2.5">
                              <div className="w-6 h-6 bg-ink-900/[0.08] rounded-lg flex items-center justify-center flex-shrink-0">
                                <Users className="w-3 h-3 text-ink-900/40"/>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-ink-800 truncate">{u.full_name}</p>
                                <p className="text-xs text-ink-400">{ROLE_LBL[u.role]||u.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-ink-900/[0.06] space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={()=>{setPayT(drawerT);setPayModal(true)}} className="flex items-center justify-center gap-1.5 py-2.5 bg-ink-900 text-white rounded-xl text-xs font-bold hover:bg-ink-800 transition">
                    <DollarSign className="w-3.5 h-3.5"/>Registrar Pago
                  </button>
                  <button onClick={()=>{if(confirm(`¿Ingresar como "${drawerT.name}"?\nSe redirigirá al dashboard.`))mImpersonate.mutate(drawerT.id)}} className="flex items-center justify-center gap-1.5 py-2.5 bg-ink-900 text-white rounded-xl text-xs font-bold hover:bg-ink-800 transition">
                    <LogIn className="w-3.5 h-3.5"/>Acceder
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={()=>mToggleT.mutate(drawerT.id)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition ${drawerT.is_active ? 'bg-ink-900/[0.05] text-ink-600 hover:bg-ink-900/10' : 'bg-ink-900/[0.05] text-ink-700 hover:bg-ink-900/10'}`}>
                    {drawerT.is_active ? <><ToggleRight className="w-3.5 h-3.5"/>Desactivar</> : <><ToggleLeft className="w-3.5 h-3.5"/>Activar</>}
                  </button>
                  <button onClick={()=>{if(confirm(`⚠️ ELIMINAR "${drawerT.name}"\n\nBorra TODOS los datos + schema PostgreSQL.\nEsta acción es IRREVERSIBLE.`))mDeleteT.mutate(drawerT.id)}}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition">
                    <Trash2 className="w-3.5 h-3.5"/>Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════ COBRANZAS ════════════════════════ */}
      {tab === 'billing' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { l:'Vencidos',      v:billingData?.summary?.overdue_count||0,  icon:AlertTriangle, bg:'bg-rose-500/10',    ic:'text-rose-500'    },
              { l:'Vencen pronto', v:billingData?.summary?.due_soon_count||0, icon:Clock,         bg:'bg-ink-900/5', ic:'text-ink-500' },
              { l:'En prueba',     v:billingData?.summary?.trial_count||0,    icon:Activity,      bg:'bg-paper',   ic:'text-ink-400'   },
              { l:'Al día',        v:billingData?.summary?.active_count||0,   icon:CheckCircle,   bg:'bg-gold-400/12',  ic:'text-gold-600'  },
            ].map((c,i)=>(
              <div key={i} className="bg-white rounded-2xl p-4 border border-ink-900/[0.06] shadow-tinted-sm flex items-center gap-3">
                <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <c.icon className={`w-5 h-5 ${c.ic}`}/>
                </div>
                <div><p className="text-2xl font-bold text-ink-900">{c.v}</p><p className="text-xs text-ink-400">{c.l}</p></div>
              </div>
            ))}
          </div>

          {billingData?.overdue?.length > 0 && (
            <BillingSection title={`🔴 Vencidos (${billingData.overdue.length})`} hCls="bg-rose-500/10 border-rose-500/20" tCls="text-rose-600"
              items={billingData.overdue} onRemind={id=>mRemind.mutate(id)} onPay={t=>{setPayT(t);setPayModal(true)}} />
          )}
          {billingData?.due_soon?.length > 0 && (
            <BillingSection title={`🟡 Vencen en 7 días (${billingData.due_soon.length})`} hCls="bg-ink-900/5 border-ink-900/[0.06]" tCls="text-ink-600"
              items={billingData.due_soon} onRemind={id=>mRemind.mutate(id)} onPay={t=>{setPayT(t);setPayModal(true)}} />
          )}
          {billingData?.trial?.length > 0 && (
            <BillingSection title={`⚪ En período de prueba (${billingData.trial.length})`} hCls="bg-paper border-ink-900/[0.06]" tCls="text-ink-600"
              items={billingData.trial} onRemind={id=>mRemind.mutate(id)} onPay={t=>{setPayT(t);setPayModal(true)}} />
          )}
          {!billingData?.overdue?.length && !billingData?.due_soon?.length && !billingData?.trial?.length && (
            <div className="bg-white rounded-2xl p-16 text-center border border-ink-900/[0.06] shadow-tinted-sm">
              <CheckCircle className="w-12 h-12 text-gold-300 mx-auto mb-3"/>
              <p className="font-semibold text-ink-400">Todo al día 🎉</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════ USUARIOS ════════════════════════ */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400"/>
              <input className="w-full pl-9 pr-3 py-2.5 border border-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 bg-white"
                placeholder="Buscar nombre o email…" value={userSearch} onChange={e=>setUserSearch(e.target.value)}/>
            </div>
            <button onClick={()=>setTab('new-user')} className="flex items-center gap-2 px-4 py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-800 transition">
              <UserPlus className="w-4 h-4"/>Nuevo usuario
            </button>
          </div>
          <p className="text-xs text-ink-400 font-medium">{filteredUsers.length} usuario{filteredUsers.length!==1?'s':''}</p>
          <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-paper border-b border-ink-900/[0.06]">
                <tr>{['Nombre','Email','Rol','Tenant','Alta','Estado',''].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-ink-400 uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-ink-900/[0.05]">
                {filteredUsers.map((u:TUser)=>(
                  <tr key={u.id} className="hover:bg-ink-900/[0.02] transition">
                    <td className="px-4 py-3 font-semibold text-ink-800">{u.full_name}</td>
                    <td className="px-4 py-3 text-ink-400 text-xs">{u.email}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-ink-900/[0.08] text-gold-700 px-2 py-0.5 rounded-lg font-medium">{ROLE_LBL[u.role]||u.role}</span></td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-400">{u.tenant_id?.slice(0,8)}…</td>
                    <td className="px-4 py-3 text-xs text-ink-400">{u.created_at ? new Date(u.created_at).toLocaleDateString('es-PY') : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${u.is_active ? 'bg-gold-400/12 text-gold-700' : 'bg-ink-900/[0.05] text-ink-400'}`}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>mToggleU.mutate(u.id)} title={u.is_active?'Desactivar':'Activar'} className="p-1.5 rounded-lg hover:bg-ink-900/[0.05] transition">
                          {u.is_active ? <ToggleRight className="w-4 h-4 text-gold-600"/> : <ToggleLeft className="w-4 h-4 text-ink-300"/>}
                        </button>
                        <button onClick={()=>{setPwUser(u);setPwModal(true)}} title="Cambiar contraseña" className="p-1.5 rounded-lg hover:bg-gold-400/12 text-gold-600 transition">
                          <Key className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredUsers.length && <div className="py-12 text-center text-ink-400 text-sm">Sin usuarios</div>}
          </div>
        </div>
      )}

      {/* ════════════════════════ ALTA CLIENTE ════════════════════════ */}
      {tab === 'new-tenant' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
            <div className="bg-ink-950 px-6 py-5">
              <h3 className="font-bold text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-gold-400"/>Alta de Nuevo Cliente</h3>
              <p className="text-xs text-ink-400 mt-1">Se crea el tenant, usuario admin y schema PostgreSQL aislado automáticamente.</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className={lbl}>Nombre del estudio *</label><input className={inp} placeholder="Estudio Jurídico González & Asociados" value={tf.firm_name} onChange={e=>setTf({...tf,firm_name:e.target.value})}/></div>
                <div><label className={lbl}>Nombre legal</label><input className={inp} placeholder="González & Asoc. S.R.L." value={tf.legal_name} onChange={e=>setTf({...tf,legal_name:e.target.value})}/></div>
                <div><label className={lbl}>RUC</label><input className={inp} placeholder="80123456-7" value={tf.ruc} onChange={e=>setTf({...tf,ruc:e.target.value})}/></div>
                <div><label className={lbl}>Nombre del admin *</label><input className={inp} placeholder="Abog. Juan González" value={tf.admin_name} onChange={e=>setTf({...tf,admin_name:e.target.value})}/></div>
                <div><label className={lbl}>Ciudad</label><input className={inp} value={tf.city} onChange={e=>setTf({...tf,city:e.target.value})}/></div>
                <div><label className={lbl}>Email (login) *</label><input type="email" className={inp} placeholder="abogado@gmail.com" value={tf.email} onChange={e=>setTf({...tf,email:e.target.value})}/></div>
                <div><label className={lbl}>Contraseña inicial *</label><input type="password" className={inp} placeholder="Mínimo 8 caracteres" value={tf.password} onChange={e=>setTf({...tf,password:e.target.value})}/></div>
                <div><label className={lbl}>Teléfono</label><input className={inp} placeholder="0981234567" value={tf.phone} onChange={e=>setTf({...tf,phone:e.target.value})}/></div>
                <div><label className={lbl}>WhatsApp</label><input className={inp} placeholder="0981234567" value={tf.whatsapp} onChange={e=>setTf({...tf,whatsapp:e.target.value})}/></div>
              </div>
              <div className="mt-4">
                <label className={lbl}>Plan *</label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
                  {PLANS.map(p=>{
                    const c = PLAN_CLR[p]
                    return (
                      <button key={p} type="button" onClick={()=>setTf({...tf,plan:p})}
                        className={`py-3 rounded-xl border-2 text-sm font-bold transition text-center ${tf.plan===p ? 'border-ink-900 bg-ink-900 text-white' : `border-ink-900/10 ${c?.text} hover:border-ink-900/20`}`}>
                        <p>{PLAN_SHORT[p]}</p>
                        <p className={`text-xs font-normal mt-0.5 ${tf.plan===p?'text-ink-300':'text-ink-400'}`}>{PLAN_PRICE[p]}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="mt-4"><label className={lbl}>Notas internas</label><textarea rows={2} className={`${inp} resize-none`} placeholder="Referido por, observaciones…" value={tf.notes} onChange={e=>setTf({...tf,notes:e.target.value})}/></div>
              <button onClick={()=>mCreateT.mutate(tf)} disabled={!tf.firm_name||!tf.admin_name||!tf.email||!tf.password||mCreateT.isPending}
                className="w-full mt-5 py-3 bg-ink-900 text-white rounded-xl font-bold text-sm hover:bg-ink-800 transition disabled:opacity-50">
                {mCreateT.isPending ? 'Creando…' : '⚡ Crear Cliente + Schema PostgreSQL'}
              </button>
              <p className="text-xs text-ink-400 mt-2 text-center">Se enviará email de bienvenida automáticamente</p>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════ ALTA USUARIO ════════════════════════ */}
      {tab === 'new-user' && (
        <div className="max-w-xl">
          <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
            <div className="bg-ink-950 px-6 py-5">
              <h3 className="font-bold text-white flex items-center gap-2"><UserPlus className="w-5 h-5 text-gold-400"/>Alta de Nuevo Usuario</h3>
              <p className="text-xs text-ink-400 mt-1">Creá un usuario adicional para cualquier tenant existente.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={lbl}>Tenant ID *</label>
                <input className={inp} placeholder="UUID del tenant (ej: desde la ficha de cliente)" value={uf.tenant_id} onChange={e=>setUf({...uf,tenant_id:e.target.value})}/>
                <p className="text-xs text-ink-400 mt-1.5">Ir a Clientes → abrir la ficha → ver el campo "Schema BD" y copiar los primeros caracteres del UUID</p>
              </div>
              <div><label className={lbl}>Nombre completo *</label><input className={inp} placeholder="Abog. María López" value={uf.full_name} onChange={e=>setUf({...uf,full_name:e.target.value})}/></div>
              <div><label className={lbl}>Email *</label><input type="email" className={inp} placeholder="usuario@ejemplo.com" value={uf.email} onChange={e=>setUf({...uf,email:e.target.value})}/></div>
              <div><label className={lbl}>Contraseña *</label><input type="password" className={inp} value={uf.password} onChange={e=>setUf({...uf,password:e.target.value})}/></div>
              <div><label className={lbl}>Rol</label>
                <select className={inp} value={uf.role} onChange={e=>setUf({...uf,role:e.target.value})}>
                  {Object.entries(ROLE_LBL).filter(([k])=>k!=='super_admin').map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <button onClick={()=>mCreateU.mutate(uf)} disabled={!uf.tenant_id||!uf.full_name||!uf.email||!uf.password||mCreateU.isPending}
                className="w-full py-3 bg-ink-900 text-white rounded-xl font-bold text-sm hover:bg-ink-800 transition disabled:opacity-50">
                {mCreateU.isPending ? 'Creando…' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════ COMUNICADOS ════════════════════════ */}
      {tab === 'broadcast' && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
            <div className="bg-ink-950 px-6 py-5">
              <h3 className="font-bold text-white flex items-center gap-2"><Mail className="w-5 h-5 text-gold-400"/>Comunicado masivo</h3>
              <p className="text-xs text-ink-400 mt-1">Se envía por email al admin de cada tenant seleccionado.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={lbl}>Plantilla rápida</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {BROADCAST_TEMPLATES.map(t=>(
                    <button key={t.label} onClick={()=>{setBSubject(t.subject);setBMessage(t.body);setBTpl(t.label)}}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition
                        ${bTpl===t.label ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-900/10 text-ink-600 hover:border-ink-900/20'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className={lbl}>Asunto *</label><input className={inp} placeholder="Ej: Actualización importante de DLEGAL" value={bSubject} onChange={e=>setBSubject(e.target.value)}/></div>
              <div><label className={lbl}>Mensaje *</label><textarea rows={8} className={`${inp} resize-none`} placeholder="Escribí el mensaje aquí…" value={bMessage} onChange={e=>setBMessage(e.target.value)}/></div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${bActive ? 'bg-ink-900' : 'bg-ink-900/15'}`} onClick={()=>setBActive(!bActive)}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-tinted-sm ${bActive ? 'left-5' : 'left-0.5'}`}/>
                </div>
                <span className="text-sm text-ink-700">Solo clientes activos (excluir cancelados y en prueba)</span>
              </label>
              <button onClick={()=>{
                if(!bSubject||!bMessage){toast.error('Completá asunto y mensaje');return}
                if(confirm(`¿Enviar comunicado a todos los clientes${bActive?' activos':''}?\n\nAsunto: "${bSubject}"`))
                  mBroadcast.mutate({subject:bSubject,message:bMessage,only_active:bActive})
              }} disabled={mBroadcast.isPending}
                className="w-full py-3 bg-ink-900 text-white font-bold rounded-xl hover:bg-ink-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {mBroadcast.isPending ? <><RefreshCw className="w-4 h-4 animate-spin"/>Enviando…</> : <><Send className="w-4 h-4"/>Enviar comunicado</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════ SISTEMA / HERRAMIENTAS ════════════════════════ */}
      {tab === 'tools' && (
        <div className="max-w-3xl space-y-4">
          <div className="grid xl:grid-cols-2 gap-4">
            {[
              { icon:LogIn,     bg:'bg-gold-400/[0.08]',  ic:'text-gold-600',  border:'border-gold-400/20',  title:'Impersonación',       desc:'Ingresá como el admin de cualquier cliente para soporte. Usá el botón LogIn en la tabla Clientes. La sesión es válida por 24h.' },
              { icon:Download,  bg:'bg-gold-400/12',   ic:'text-gold-600',   border:'border-ink-900/[0.06]',   title:'Exportar datos',      desc:'Descargá todos los datos de un tenant en JSON. Incluye clientes, casos y facturas. Útil para migraciones o backups manuales.' },
              { icon:Trash2,    bg:'bg-rose-500/10',    ic:'text-rose-500',    border:'border-rose-500/20',    title:'Eliminar tenant',     desc:'Elimina el tenant, usuarios, datos y schema PostgreSQL. IRREVERSIBLE. Se solicita doble confirmación antes de ejecutar.' },
              { icon:Database,  bg:'bg-gold-400/12', ic:'text-gold-600', border:'border-ink-900/[0.06]', title:'Schema PostgreSQL',   desc:'Cada cliente tiene su schema t_<uuid>. Se crea al registrar y se elimina al borrar el tenant. Aislamiento total por diseño.' },
              { icon:Key,       bg:'bg-gold-400/12',  ic:'text-gold-600',  border:'border-ink-900/[0.06]',  title:'Reset contraseña',    desc:'Cambiá la contraseña de cualquier usuario desde la pestaña Usuarios con el botón de llave amarilla.' },
              { icon:TrendingUp,bg:'bg-paper',   ic:'text-ink-400',   border:'border-ink-900/[0.06]',   title:'Revenue History',     desc:'El gráfico de MRR en el Dashboard usa el endpoint /superadmin/revenue-history. Se actualiza automáticamente.' },
            ].map((t,i)=>(
              <div key={i} className={`bg-white rounded-2xl p-5 border ${t.border} shadow-tinted-sm flex gap-4`}>
                <div className={`w-10 h-10 ${t.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <t.icon className={`w-5 h-5 ${t.ic}`}/>
                </div>
                <div><p className="text-sm font-display font-semibold text-ink-900 tracking-tight">{t.title}</p><p className="text-xs text-ink-500 mt-1 leading-relaxed">{t.desc}</p></div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
            <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-4 flex items-center gap-2"><ExternalLink className="w-4 h-4"/>Links del sistema</h3>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
              {[
                {label:'📚 Swagger UI',        href:'/docs',                        blank:true},
                {label:'📖 ReDoc',             href:'/redoc',                       blank:true},
                {label:'📊 Stats API',         href:'/api/v1/superadmin/stats',     blank:true},
                {label:'🏠 Dashboard',         href:'/dashboard',                   blank:false},
                {label:'👤 Portal Cliente',    href:'/portal',                      blank:true},
                {label:'💬 WhatsApp Soporte',  href:`https://wa.me/595${PHONE.slice(1)}`, blank:true},
              ].map(l=>(
                <a key={l.label} href={l.href} target={l.blank?'_blank':undefined}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-900/10 text-sm text-ink-700 hover:bg-ink-900/5 hover:border-ink-900/20 transition">
                  {l.label}<ExternalLink className="w-3 h-3 ml-auto text-ink-300"/>
                </a>
              ))}
            </div>
          </div>

          <div className="bg-ink-950 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-lg">DLEGAL Paraguay</p>
                <p className="text-ink-500 text-xs mt-0.5">Sistema de gestión legal multi-tenant</p>
              </div>
              <span className="text-gold-400 font-bold text-sm bg-gold-400/10 px-3 py-1.5 rounded-xl">v2.3.0 🇵🇾</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[['Backend','FastAPI 0.111 + Python 3.12'],['Base de datos','PostgreSQL 16 + Redis 7'],['Auth','JWT Bearer 24h'],['Workers','Celery 5 + Beat'],['Módulos API','35 routers · 185 endpoints'],['Soporte',PHONE]].map(([l,v])=>(
                <div key={l}><p className="text-xs text-ink-500">{l}</p><p className="text-xs text-ink-300 font-medium mt-0.5">{v}</p></div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* ════════════════════════ PUBLICIDAD ════════════════════════ */}
      {tab === 'ads' && <AdsTab />}

      {/* ════════════════════════ ANALYTICS WEB ════════════════════════ */}
      {tab === 'analytics' && <AnalyticsTab />}

      {/* ════════════════════════ REDES SOCIALES ════════════════════════ */}
      {tab === 'social' && <SocialTab />}

      {/* ════════════════════════ MARKETING ════════════════════════ */}
      {tab === 'marketing' && <MarketingTab />}

      {/* ════════════════════════ BI & KPIs ════════════════════════ */}
      {tab === 'bi' && <BITab />}

      {/* ════════════════════════ MODALS ════════════════════════ */}

      {/* Payment Modal */}
      {payModal && payT && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-ink-950 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white">Registrar Pago</h3>
                <p className="text-xs text-ink-400 mt-0.5">{payT.name} · {payT.plan_info?.price_label||PLAN_PRICE[payT.plan]||payT.plan}</p>
              </div>
              <button onClick={()=>setPayModal(false)} className="p-2 rounded-xl hover:bg-white/10 text-ink-400 transition"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className={lbl}>Fecha de pago</label><input type="date" className={inp} value={payDate} onChange={e=>setPayDate(e.target.value)}/></div>
              <div><label className={lbl}>Nota (método, referencia, etc.)</label><input className={inp} placeholder="Transferencia Banco Continental / Efectivo / Tigo Money" value={payNote} onChange={e=>setPayNote(e.target.value)}/></div>
              <div className="bg-paper rounded-xl p-3.5 space-y-1">
                <p className="text-xs text-ink-600">✓ Estado pasará a <strong className="text-gold-700">Activo</strong></p>
                <p className="text-xs text-ink-600">✓ Próximo vencimiento: <strong>{new Date(new Date(payDate).getTime()+30*86400000).toLocaleDateString('es-PY')}</strong></p>
                <p className="text-xs text-ink-500">Se guardará en el historial de pagos del cliente</p>
              </div>
              <div className="flex gap-3">
                <button onClick={()=>mPay.mutate({id:payT.id,data:{payment_date:payDate,note:payNote}})} disabled={mPay.isPending}
                  className="flex-1 py-3 bg-ink-900 text-white rounded-xl font-bold text-sm hover:bg-ink-800 transition disabled:opacity-50">
                  {mPay.isPending ? 'Guardando…' : '✓ Confirmar Pago'}
                </button>
                <button onClick={()=>setPayModal(false)} className="px-5 py-3 border border-ink-900/10 rounded-xl text-sm text-ink-600 hover:bg-ink-900/5 transition">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {pwModal && pwUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-ink-950 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white">Cambiar Contraseña</h3>
                <p className="text-xs text-ink-400 mt-0.5">{pwUser.full_name} · {pwUser.email}</p>
              </div>
              <button onClick={()=>setPwModal(false)} className="p-2 rounded-xl hover:bg-white/10 text-ink-400 transition"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className={lbl}>Nueva contraseña *</label><input type="password" className={inp} placeholder="Mínimo 6 caracteres" value={newPw} onChange={e=>setNewPw(e.target.value)}/></div>
              <div className="flex gap-3">
                <button onClick={()=>{if(!newPw||newPw.length<6){toast.error('Mínimo 6 caracteres');return}mResetPw.mutate({uid:pwUser.id,pw:newPw})}}
                  disabled={mResetPw.isPending}
                  className="flex-1 py-3 bg-ink-900 text-white rounded-xl font-bold text-sm hover:bg-ink-800 transition disabled:opacity-50">
                  {mResetPw.isPending ? 'Actualizando…' : 'Actualizar Contraseña'}
                </button>
                <button onClick={()=>setPwModal(false)} className="px-5 py-3 border border-ink-900/10 rounded-xl text-sm text-ink-600 hover:bg-ink-900/5 transition">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  )
}

// ── BillingSection ────────────────────────────────────────────────────────────
function BillingSection({ title, items, hCls, tCls, onRemind, onPay }: {
  title:string; items:any[]; hCls:string; tCls:string;
  onRemind:(id:string)=>void; onPay:(t:any)=>void
}) {
  const PLAN_SHORT: Record<string,string> = {solo:'Solo',bufete_s:'S',bufete_m:'M',bufete_l:'L'}
  return (
    <div className={`bg-white rounded-2xl border shadow-tinted-sm overflow-hidden ${hCls}`}>
      <div className={`px-5 py-3.5 border-b ${hCls}`}>
        <h3 className={`font-bold text-sm ${tCls}`}>{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-paper border-b border-ink-900/[0.06]">
            <tr>{['Cliente','Plan / Precio','Vencimiento','Contacto','Acciones'].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-ink-400 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-ink-900/[0.05]">
            {items.map((t:any)=>(
              <tr key={t.id} className="hover:bg-ink-900/[0.02] transition">
                <td className="px-4 py-3"><p className="font-semibold text-ink-800">{t.name}</p><p className="text-xs text-ink-400">{t.admin_name}</p></td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-ink-900/[0.05] text-ink-600 px-2 py-0.5 rounded-lg font-semibold">{PLAN_SHORT[t.plan]||t.plan}</span>
                  <p className="text-xs text-ink-400 mt-0.5">{t.price||t.plan_info?.price_label||'—'}</p>
                </td>
                <td className="px-4 py-3 text-xs text-ink-600 font-mono tnum">{t.next_payment_at||t.trial_ends_at||'—'}</td>
                <td className="px-4 py-3"><p className="text-xs text-ink-600">{t.email||t.admin_email}</p><p className="text-xs text-ink-400">{t.whatsapp||'—'}</p></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button onClick={()=>onRemind(t.id)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-ink-900/[0.05] text-ink-700 rounded-lg hover:bg-ink-900/10 transition font-medium">
                      <Bell className="w-3 h-3"/>Avisar
                    </button>
                    <button onClick={()=>onPay(t)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-gold-400/12 text-gold-700 rounded-lg hover:bg-gold-400/20 transition font-medium">
                      <DollarSign className="w-3 h-3"/>Pago
                    </button>
                    {(t.whatsapp||t.phone) && (
                      <a href={`https://wa.me/595${(t.whatsapp||t.phone||'').replace(/[^0-9]/g,'').replace(/^0/,'')}`} target="_blank"
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-gold-400/12 text-gold-700 rounded-lg hover:bg-gold-400/20 transition font-medium">
                        <MessageCircle className="w-3 h-3"/>WA
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Business Intelligence Tab Components ─────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, cls='text-gold-600', bg='bg-gold-400/12' }: any) {
  return (
    <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={`w-4.5 h-4.5 ${cls}`} />
      </div>
      <p className="text-xl font-black text-ink-900 tnum">{value}</p>
      <p className="text-xs font-semibold text-ink-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-ink-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function MiniBar({ data, color='#c2a14a', height=48 }: { data:{month:string;value?:number;sessions?:number;revenue?:number;total?:number}[]; color?:string; height?:number }) {
  const vals = data.map(d => d.value ?? d.sessions ?? d.revenue ?? d.total ?? 0)
  const max = Math.max(...vals, 1)
  return (
    <div className="flex items-end gap-1" style={{height}}>
      {data.map((d,i) => {
        const v = d.value ?? d.sessions ?? d.revenue ?? d.total ?? 0
        const pct = (v/max)*100
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full rounded-t-md" style={{height:`${Math.max(pct,3)}%`,backgroundColor:color,opacity:0.7+i*0.03}} />
            <span className="text-[9px] text-ink-400">{d.month}</span>
          </div>
        )
      })}
    </div>
  )
}

function PlatformRow({ p, showCPL=false }: {p:any; showCPL?:boolean}) {
  const statusCls = p.status === 'active' ? 'bg-gold-400/12 text-gold-700' : 'bg-ink-900/[0.05] text-ink-400'
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-ink-900/[0.05] last:border-0">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{background:p.color}} />
      <p className="text-sm font-semibold text-ink-800 w-32 flex-shrink-0">{p.name}</p>
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${statusCls}`}>{p.status==='active'?'ACTIVO':'PAUSADO'}</span>
      <div className="flex-1 min-w-0 flex flex-wrap gap-4 text-xs text-ink-500">
        <span><strong className="text-ink-800">{p.spend_label||p.spend?.toLocaleString('es-PY')}</strong> inversión</span>
        <span><strong className="text-ink-800">{p.leads}</strong> leads</span>
        <span><strong className="text-ink-800">{p.conversions}</strong> conv.</span>
        {showCPL && p.leads > 0 && <span className="text-gold-700 font-semibold">₲{Math.round((p.spend||0)/p.leads).toLocaleString('es-PY')} CPL</span>}
      </div>
    </div>
  )
}

function IntegBadge({ name, connected, lastSync }: {name:string; connected:boolean; lastSync?:string|null}) {
  return (
    <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-ink-900/[0.06]">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-gold-500' : 'bg-ink-300'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-ink-800 truncate">{name}</p>
        <p className="text-[10px] text-ink-400">{connected ? (lastSync||'Conectado') : 'No conectado'}</p>
      </div>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${connected?'bg-gold-400/12 text-gold-700':'bg-ink-900/[0.05] text-ink-400'}`}>
        {connected?'✓':'—'}
      </span>
    </div>
  )
}

function AdsTab() {
  const { data, isLoading } = useQuery({ queryKey: ['biz-ads'], queryFn: () => businessApi.adsSummary().then(r=>r.data) })
  const { data: camps } = useQuery({ queryKey: ['biz-camps'], queryFn: () => businessApi.adsCampaigns().then(r=>r.data) })
  if (isLoading) return <div className="h-64 bg-white rounded-2xl animate-pulse border" />

  const platforms: any[] = data?.platforms || []
  const campaigns: any[] = camps?.campaigns || []
  const trend: any[] = (data?.monthly_trend||[]).map((d:any)=>({...d, value:d.spend}))

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Inversión / mes" value={data?.total_spend_month_label||'—'} icon={Megaphone} cls="text-gold-600" bg="bg-gold-400/12" sub="Todas las plataformas" />
        <StatCard label="Leads generados" value={data?.total_leads||0} icon={Target} cls="text-gold-600" bg="bg-gold-400/12" sub="Últimos 30 días" />
        <StatCard label="Costo por lead" value={data?.cost_per_lead_label||'—'} icon={DollarSign} cls="text-gold-600" bg="bg-gold-400/[0.08]" sub="Promedio todas plataformas" />
        <StatCard label="ROI publicidad" value={`${data?.roi_percent||0}%`} icon={TrendingUp} cls="text-gold-600" bg="bg-gold-400/12" sub={`${data?.conversions||0} conversiones`} />
      </div>

      <div className="grid xl:grid-cols-5 gap-5">
        {/* Plataformas */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
          <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-4 flex items-center gap-2"><Megaphone className="w-4 h-4 text-gold-600"/>Inversión por Plataforma</h3>
          {platforms.map(p => <PlatformRow key={p.name} p={p} showCPL />)}
          {/* Visual bars */}
          <div className="mt-4 space-y-2">
            {platforms.map(p => {
              const maxSpend = Math.max(...platforms.map(x=>x.spend))
              return (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="text-[11px] text-ink-500 w-28 truncate flex-shrink-0">{p.name}</span>
                  <div className="flex-1 bg-ink-900/[0.05] rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{width:`${(p.spend/maxSpend)*100}%`,background:p.color}} />
                  </div>
                  <span className="text-[11px] font-bold text-ink-700 w-10 text-right tnum">{Math.round(p.spend/1000)}K</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Trend chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
          <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-gold-600"/>Inversión mensual</h3>
          <MiniBar data={trend} color="#9333ea" height={80} />
          <div className="mt-4 space-y-1.5 text-xs">
            {trend.slice(-3).map((d:any,i:number)=>(
              <div key={i} className="flex justify-between text-ink-500">
                <span>{d.month}</span>
                <span className="font-semibold text-ink-800">₲{(d.value/1000).toFixed(0)}K · {d.leads}L · {d.conversions}C</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaigns table */}
      <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-900/[0.06] flex items-center gap-2">
          <Target className="w-4 h-4 text-gold-600"/>
          <h3 className="font-display font-semibold text-ink-900 tracking-tight">Campañas Activas</h3>
          <span className="text-xs text-ink-400 ml-1">{campaigns.length} campañas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-paper border-b border-ink-900/[0.06]">
              <tr>{['Plataforma','Campaña','Objetivo','Presupuesto/día','Inversión total','Leads','Conv.','Estado'].map(h=>(
                <th key={h} className="px-4 py-3 text-left font-bold text-ink-400 uppercase tracking-wider text-[10px]">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-ink-900/[0.05]">
              {campaigns.map((c:any) => (
                <tr key={c.id} className="hover:bg-ink-900/[0.02] transition">
                  <td className="px-4 py-3 font-bold text-ink-600">{c.platform}</td>
                  <td className="px-4 py-3 font-medium text-ink-800 max-w-[180px] truncate">{c.name}</td>
                  <td className="px-4 py-3 text-ink-500 font-mono text-[10px]">{c.objective}</td>
                  <td className="px-4 py-3 tnum">₲{c.budget_daily?.toLocaleString('es-PY')||'—'}</td>
                  <td className="px-4 py-3 font-semibold tnum">₲{c.spend_total?.toLocaleString('es-PY')}</td>
                  <td className="px-4 py-3 font-bold text-ink-700">{c.leads}</td>
                  <td className="px-4 py-3 font-bold text-gold-700">{c.conversions}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${c.status==='active'?'bg-gold-400/12 text-gold-700':'bg-ink-900/[0.05] text-ink-400'}`}>
                      {c.status==='active'?'ACTIVO':'PAUSADO'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AnalyticsTab() {
  const { data, isLoading } = useQuery({ queryKey: ['biz-web'], queryFn: () => businessApi.webAnalytics().then(r=>r.data) })
  if (isLoading) return <div className="h-64 bg-white rounded-2xl animate-pulse border" />

  const sources: any[] = data?.traffic_sources || []
  const monthly: any[] = (data?.monthly_sessions||[]).map((d:any)=>({...d, value:d.sessions}))
  const sc = data?.search_console || {}

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Sesiones / mes" value={data?.sessions?.toLocaleString('es-PY')||'—'} icon={Globe} cls="text-gold-600" bg="bg-gold-400/12" sub={data?.period} />
        <StatCard label="Usuarios únicos" value={data?.users?.toLocaleString('es-PY')||'—'} icon={Users} cls="text-gold-600" bg="bg-gold-400/12" sub={`${data?.new_users?.toLocaleString('es-PY')||0} nuevos`} />
        <StatCard label="Tasa de conversión" value={`${data?.conversion_rate||0}%`} icon={MousePointer} cls="text-gold-600" bg="bg-gold-400/12" sub={`${data?.conversions||0} conversiones`} />
        <StatCard label="Bounce rate" value={`${data?.bounce_rate||0}%`} icon={Activity} cls="text-gold-600" bg="bg-gold-400/[0.08]" sub={`Sesión prom: ${data?.avg_session_duration}`} />
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        {/* Traffic sources */}
        <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
          <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-4 flex items-center gap-2"><Link2 className="w-4 h-4 text-gold-600"/>Fuentes de Tráfico</h3>
          <div className="space-y-2">
            {sources.map((s:any) => (
              <div key={s.source}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ink-700 font-semibold flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{background:s.color}} />{s.source}
                  </span>
                  <span className="text-ink-500 tnum">{s.sessions?.toLocaleString('es-PY')} ({s.pct}%)</span>
                </div>
                <div className="w-full bg-ink-900/[0.05] rounded-full h-1.5">
                  <div className="h-1.5 rounded-full" style={{width:`${s.pct}%`,background:s.color}} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly trend */}
        <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
          <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-gold-600"/>Sesiones Mensuales</h3>
          <MiniBar data={monthly} color="#3b82f6" height={80} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gold-400/12 rounded-xl p-3">
              <p className="font-bold text-ink-700 text-lg">{data?.pageviews?.toLocaleString('es-PY')}</p>
              <p className="text-gold-600">Páginas vistas</p>
            </div>
            <div className="bg-gold-400/12 rounded-xl p-3">
              <p className="font-bold text-gold-700 text-lg">{data?.avg_session_duration}</p>
              <p className="text-gold-600">Duración prom.</p>
            </div>
          </div>
        </div>

        {/* Top pages */}
        <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
          <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-gold-600"/>Top Páginas</h3>
          <div className="space-y-2">
            {(data?.top_pages||[]).map((p:any, i:number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink-300 w-4">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink-800 truncate">{p.page}</p>
                  <p className="text-[10px] text-ink-400">{p.views?.toLocaleString()} vistas · {p.avg_time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search Console */}
      <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
        <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0z"/><path fill="white" d="M12 6a6 6 0 100 12A6 6 0 0012 6z"/></svg>
          Google Search Console
        </h3>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          {[
            {l:'Impresiones', v:sc.impressions?.toLocaleString('es-PY')},
            {l:'Clics orgánicos', v:sc.clicks?.toLocaleString('es-PY')},
            {l:'CTR promedio', v:`${sc.ctr}%`},
            {l:'Posición media', v:`#${sc.avg_position}`},
          ].map((k,i) => (
            <div key={i} className="bg-paper rounded-xl p-3 text-center">
              <p className="text-lg font-black text-ink-900 tnum">{k.v}</p>
              <p className="text-[11px] text-ink-500">{k.l}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-ink-900/[0.06]">{['Query','Clics','Impresiones','Posición'].map(h=><th key={h} className="text-left py-2 pr-4 font-bold text-ink-400 text-[10px] uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-ink-900/[0.05]">
              {(sc.top_queries||[]).map((q:any,i:number)=>(
                <tr key={i} className="hover:bg-ink-900/[0.02]">
                  <td className="py-2.5 pr-4 font-medium text-ink-800">{q.query}</td>
                  <td className="py-2.5 pr-4 font-bold text-ink-700 tnum">{q.clicks}</td>
                  <td className="py-2.5 pr-4 text-ink-500 tnum">{q.impressions?.toLocaleString()}</td>
                  <td className="py-2.5 pr-4 text-gold-700 font-bold">#{q.position?.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SocialTab() {
  const { data, isLoading } = useQuery({ queryKey: ['biz-social'], queryFn: () => businessApi.social().then(r=>r.data) })
  if (isLoading) return <div className="h-64 bg-white rounded-2xl animate-pulse border" />

  const platforms: any[] = data?.platforms || []
  const monthly: any[] = (data?.monthly_followers||[]).map((d:any)=>({...d, value:d.total}))

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Seguidores totales" value={data?.summary?.total_followers?.toLocaleString('es-PY')||'—'} icon={Users} cls="text-gold-600" bg="bg-gold-400/12" sub="Todas las redes" />
        <StatCard label="Crecimiento 30d" value={`+${data?.summary?.followers_growth_30d||0}`} icon={TrendingUp} cls="text-gold-600" bg="bg-gold-400/12" sub="Nuevos seguidores" />
        <StatCard label="Engagement prom." value={`${data?.summary?.avg_engagement_rate||0}%`} icon={Activity} cls="text-gold-600" bg="bg-gold-400/12" sub="Promedio redes" />
        <StatCard label="Alcance mensual" value={data?.summary?.total_reach_30d?.toLocaleString('es-PY')||'—'} icon={Eye} cls="text-gold-600" bg="bg-gold-400/12" sub="Personas alcanzadas" />
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {platforms.map((p:any) => (
          <div key={p.name} className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black" style={{background:p.color,color:'white'}}>
                  {p.name[0]}
                </div>
                <div>
                  <p className="font-bold text-ink-900">{p.name}</p>
                  <p className="text-xs text-ink-400">{p.followers?.toLocaleString('es-PY')} seguidores</p>
                </div>
              </div>
              <span className="text-xs font-bold text-gold-700 bg-gold-400/12 px-2 py-1 rounded-xl">{p.growth}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-paper rounded-xl p-2.5">
                <p className="font-black text-ink-900">{p.engagement}%</p>
                <p className="text-ink-400 text-[10px]">Engagement</p>
              </div>
              <div className="bg-paper rounded-xl p-2.5">
                <p className="font-black text-ink-900">{p.reach_30d?.toLocaleString('es-PY')}</p>
                <p className="text-ink-400 text-[10px]">Alcance 30d</p>
              </div>
              <div className="bg-paper rounded-xl p-2.5">
                <p className="font-black text-ink-900">{p.posts_30d}</p>
                <p className="text-ink-400 text-[10px]">Posts 30d</p>
              </div>
            </div>
            {p.top_post && (
              <div className="mt-3 bg-gold-400/[0.08] border border-gold-400/20 rounded-xl px-3 py-2">
                <p className="text-[10px] text-gold-700 font-bold mb-0.5">TOP POST 30D · {p.top_post_reach?.toLocaleString()} alcance</p>
                <p className="text-xs text-ink-700 font-medium">"{p.top_post}"</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Monthly followers trend */}
      <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
        <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gold-600"/>Crecimiento de Seguidores</h3>
        <MiniBar data={monthly} color="#ec4899" height={80} />
      </div>
    </div>
  )
}

function MarketingTab() {
  const { data: leads, isLoading } = useQuery({ queryKey: ['biz-leads'], queryFn: () => businessApi.leads().then(r=>r.data) })
  const { data: email } = useQuery({ queryKey: ['biz-email'], queryFn: () => businessApi.emailMarketing().then(r=>r.data) })

  if (isLoading) return <div className="h-64 bg-white rounded-2xl animate-pulse border" />

  const funnel: any[] = leads?.funnel || []
  const maxFunnel = funnel[0]?.count || 1

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Pipeline total" value={leads?.pipeline_label||'—'} icon={DollarSign} cls="text-gold-600" bg="bg-gold-400/12" />
        <StatCard label="Leads / mes" value={leads?.funnel?.[1]?.count||0} icon={Target} cls="text-gold-600" bg="bg-gold-400/12" sub="Generados en 30d" />
        <StatCard label="Ticket prom." value={leads?.avg_deal_label||'—'} icon={TrendingUp} cls="text-gold-600" bg="bg-gold-400/[0.08]" sub={`${leads?.avg_close_days}d cierre prom.`} />
        <StatCard label="Contactos email" value={email?.contacts?.toLocaleString()||'—'} icon={Mail} cls="text-gold-600" bg="bg-gold-400/12" sub={`${email?.active_subscribers} activos`} />
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        {/* Funnel */}
        <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
          <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-5 flex items-center gap-2"><Layers className="w-4 h-4 text-gold-600"/>Embudo de Conversión</h3>
          <div className="space-y-2">
            {funnel.map((f:any, i:number) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-ink-700">{f.stage}</span>
                  <span className="text-ink-500 tnum">{f.count?.toLocaleString()} ({f.pct}%)</span>
                </div>
                <div className="w-full bg-ink-900/[0.05] rounded-full h-4">
                  <div className="h-4 rounded-full flex items-center justify-end pr-2 text-[10px] text-white font-bold transition-all"
                    style={{width:`${Math.max((f.count/maxFunnel)*100,3)}%`, background:f.color}}>
                    {f.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(leads?.lead_sources||[]).map((s:any, i:number) => (
              <div key={i} className="bg-paper rounded-xl p-3">
                <p className="text-xs font-display font-semibold text-ink-900 tracking-tight">{s.source}</p>
                <p className="text-lg font-black text-ink-900 tnum">{s.leads}</p>
                <p className="text-[10px] text-ink-400">{s.cost > 0 ? `₲${s.cpl?.toLocaleString('es-PY')} CPL` : 'Orgánico'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Email marketing */}
        <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
          <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-4 flex items-center gap-2"><Mail className="w-4 h-4 text-gold-600"/>Email Marketing</h3>
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            {[
              {l:'Tasa apertura', v:`${email?.avg_open_rate||0}%`, cls:'text-gold-700'},
              {l:'Tasa de clics', v:`${email?.avg_click_rate||0}%`, cls:'text-ink-700'},
              {l:'Campañas 30d', v:email?.campaigns_30d||0, cls:'text-ink-800'},
            ].map((k,i) => (
              <div key={i} className="bg-paper rounded-xl p-3">
                <p className={`text-lg font-black tnum ${k.cls}`}>{k.v}</p>
                <p className="text-[10px] text-ink-400">{k.l}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {(email?.campaigns||[]).map((c:any, i:number) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-ink-900/[0.05] last:border-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${c.type==='automation'?'bg-ink-900/[0.05] text-ink-700':'bg-gold-400/12 text-gold-700'}`}>{c.type==='automation'?'AUTO':'CAMP'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink-800 truncate">{c.name}</p>
                  <p className="text-[10px] text-ink-400">{c.sent} enviados · {c.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-gold-700">{c.open_rate}%</p>
                  <p className="text-[10px] text-ink-400">{c.click_rate}% clics</p>
                </div>
              </div>
            ))}
          </div>

          {/* Providers status */}
          <div className="mt-4">
            <p className="text-[11px] font-bold text-ink-400 uppercase mb-2">Plataformas conectadas</p>
            <div className="grid grid-cols-2 gap-2">
              {(email?.providers||[]).map((p:any) => <IntegBadge key={p.name} name={p.name} connected={p.connected} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BITab() {
  const { data: kpis, isLoading } = useQuery({ queryKey: ['biz-kpis'], queryFn: () => businessApi.biKpis().then(r=>r.data) })
  const { data: intStatus } = useQuery({ queryKey: ['biz-integ'], queryFn: () => businessApi.integrations().then(r=>r.data) })
  if (isLoading) return <div className="h-64 bg-white rounded-2xl animate-pulse border" />

  const saas = kpis?.saas || {}
  const mkt  = kpis?.marketing || {}
  const ads  = kpis?.ads || {}

  return (
    <div className="space-y-5">
      {/* Master KPIs */}
      <div className="bg-ink-950 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-white text-lg">KPIs del Negocio — DLEGAL Paraguay</h3>
            <p className="text-ink-500 text-xs mt-0.5">Consolidado de todas las fuentes de datos</p>
          </div>
          <span className="text-gold-400 text-xs font-bold bg-gold-400/10 px-3 py-1.5 rounded-xl">Tiempo real</span>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {l:'MRR actual', v: saas?.mrr ? `₲${(saas.mrr/1000).toFixed(0)}K` : '—', sub:`+${saas.mrr_growth_pct||0}% vs mes ant.`, cls:'bg-gold-400/15 ring-1 ring-gold-400/30'},
            {l:'CAC', v:mkt?.cac_label||'—', sub:`LTV/CAC: ${mkt?.ltv_cac_ratio||0}x`, cls:'bg-white/[0.06] ring-1 ring-white/10'},
            {l:'Leads / mes', v:mkt?.leads_month||0, sub:`${mkt?.conversion_rate||0}% conversión`, cls:'bg-white/[0.06] ring-1 ring-white/10'},
            {l:'ROI publicidad', v:`${ads?.roi_percent||0}%`, sub:`₲${((ads?.total_spend_month||0)/1000).toFixed(0)}K invertidos`, cls:'bg-white/[0.06] ring-1 ring-white/10'},
          ].map((k,i)=>(
            <div key={i} className={`${k.cls} rounded-2xl p-4 text-white`}>
              <p className="text-2xl font-black tnum">{k.v}</p>
              <p className="text-sm font-semibold opacity-90 mt-1">{k.l}</p>
              <p className="text-xs opacity-70 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid xl:grid-cols-3 gap-5">
        {/* SaaS metrics */}
        <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
          <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-gold-600"/>SaaS Metrics</h3>
          {[
            {l:'MRR', v:saas?.mrr?`₲${(saas.mrr/1000).toFixed(0)}K`:'—'},
            {l:'ARR (estimado)', v:saas?.mrr?`₲${(saas.mrr*12/1000000).toFixed(1)}M`:'—'},
            {l:'Clientes activos', v:saas?.total_clients||0},
            {l:'Churn rate', v:`${saas?.churn_rate||0}%`},
            {l:'NPS', v:saas?.nps||'—'},
          ].map((k,i)=>(
            <div key={i} className="flex justify-between py-2 border-b border-ink-900/[0.05] last:border-0 text-sm">
              <span className="text-ink-500">{k.l}</span>
              <span className="font-bold text-ink-900 tnum">{k.v}</span>
            </div>
          ))}
        </div>

        {/* Marketing metrics */}
        <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
          <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-gold-600"/>Marketing Metrics</h3>
          {[
            {l:'CAC', v:mkt?.cac_label||'—'},
            {l:'LTV estimado', v:mkt?.ltv?`₲${(mkt.ltv/1000).toFixed(0)}K`:'—'},
            {l:'LTV / CAC ratio', v:`${mkt?.ltv_cac_ratio||0}x`},
            {l:'Conversión web', v:`${kpis?.web?.conversion_rate||0}%`},
            {l:'Sesiones orgánicas', v:`${kpis?.web?.organic_pct||0}%`},
          ].map((k,i)=>(
            <div key={i} className="flex justify-between py-2 border-b border-ink-900/[0.05] last:border-0 text-sm">
              <span className="text-ink-500">{k.l}</span>
              <span className="font-bold text-ink-900 tnum">{k.v}</span>
            </div>
          ))}
        </div>

        {/* Social & Ads */}
        <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
          <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-4 flex items-center gap-2"><Share2 className="w-4 h-4 text-gold-600"/>Social & Ads</h3>
          {[
            {l:'Seguidores totales', v:kpis?.social?.total_followers?.toLocaleString('es-PY')||'—'},
            {l:'Crecimiento 30d', v:`+${kpis?.social?.growth_30d||0}`},
            {l:'Engagement prom.', v:`${kpis?.social?.avg_engagement||0}%`},
            {l:'Inversión ads/mes', v:ads?.total_spend_month?`₲${(ads.total_spend_month/1000).toFixed(0)}K`:'—'},
            {l:'Impresiones ads', v:ads?.impressions?.toLocaleString('es-PY')||'—'},
          ].map((k,i)=>(
            <div key={i} className="flex justify-between py-2 border-b border-ink-900/[0.05] last:border-0 text-sm">
              <span className="text-ink-500">{k.l}</span>
              <span className="font-bold text-ink-900 tnum">{k.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Integrations status */}
      <div className="bg-white rounded-2xl border border-ink-900/[0.06] shadow-tinted-sm p-5">
        <h3 className="font-display font-semibold text-ink-900 tracking-tight mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-gold-600"/>Estado de Integraciones de Negocio</h3>
        <div className="grid xl:grid-cols-5 gap-4">
          {[
            {title:'📣 Publicidad', key:'advertising', color:'purple'},
            {title:'📊 Analytics',  key:'analytics',   color:'blue'},
            {title:'📱 Marketing',  key:'marketing',   color:'indigo'},
            {title:'💳 Pagos',      key:'payments',    color:'green'},
            {title:'📈 BI Tools',   key:'bi',          color:'amber'},
          ].map(section => (
            <div key={section.key}>
              <p className="text-xs font-bold text-ink-500 mb-2">{section.title}</p>
              <div className="space-y-1.5">
                {(intStatus?.[section.key]||[]).map((s:any) => (
                  <IntegBadge key={s.name} name={s.name} connected={s.connected} lastSync={s.last_sync} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* BI Tools links */}
        <div className="mt-5 pt-4 border-t border-ink-900/[0.06]">
          <p className="text-xs font-bold text-ink-500 mb-3">🔗 Business Intelligence — Conectar plataformas externas</p>
          <div className="flex flex-wrap gap-2">
            {[
              {name:'Google Looker Studio', href:'https://lookerstudio.google.com', color:'bg-ink-900/[0.05] text-ink-700'},
              {name:'Power BI', href:'https://powerbi.microsoft.com', color:'bg-ink-900/[0.05] text-ink-600'},
              {name:'Tableau', href:'https://tableau.com', color:'bg-ink-900/[0.05] text-ink-700'},
              {name:'Meta Business Suite', href:'https://business.facebook.com', color:'bg-ink-900/[0.05] text-ink-700'},
              {name:'Google Analytics', href:'https://analytics.google.com', color:'bg-ink-900/[0.05] text-ink-700'},
              {name:'HubSpot CRM', href:'https://app.hubspot.com', color:'bg-ink-900/[0.05] text-ink-700'},
            ].map(t => (
              <a key={t.name} href={t.href} target="_blank" rel="noreferrer"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition hover:shadow-tinted-sm ${t.color}`}>
                {t.name}<ExternalLink className="w-3 h-3 opacity-60"/>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
