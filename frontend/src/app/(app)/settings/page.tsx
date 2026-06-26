'use client'
import AppLayout from '@/components/layout/AppLayout'
import PageHeader from '@/components/ui/PageHeader'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, tenantsApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { User, Building2, Bell, Bot, Shield, Save, Eye, EyeOff, CheckCircle, Settings } from 'lucide-react'

const TABS = [
  { id: 'profile', label: 'Mi Perfil', icon: User },
  { id: 'firm', label: 'Estudio', icon: Building2 },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'ai', label: 'Asistente IA', icon: Bot },
  { id: 'security', label: 'Seguridad', icon: Shield },
]

export default function SettingsPage() {
  const { user, setAuth } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('profile')
  const [showKey, setShowKey] = useState(false)
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })

  // Fetch current profile + tenant
  const { data: profileData } = useQuery({ queryKey: ['user-me'], queryFn: () => usersApi.me().then(r => r.data) })
  const { data: tenantData } = useQuery({ queryKey: ['tenant-me'], queryFn: () => tenantsApi.getMe().then(r => r.data) })

  const [profile, setProfile] = useState({
    full_name: '', phone: '', whatsapp_number: '', bar_number: '', specialties: '',
    notify_email: true, notify_whatsapp: false,
  })
  const [firm, setFirm] = useState({
    name: '', legal_name: '', ruc: '', timbrado: '', timbrado_expires: '',
    address: '', city: 'Asunción', phone: '', email: '',
  })
  const [openaiKey, setOpenaiKey] = useState('')

  useEffect(() => {
    if (profileData) {
      setProfile({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        whatsapp_number: profileData.whatsapp_number || '',
        bar_number: profileData.bar_number || '',
        specialties: profileData.specialties || '',
        notify_email: profileData.notify_email ?? true,
        notify_whatsapp: profileData.notify_whatsapp ?? false,
      })
    }
  }, [profileData])

  useEffect(() => {
    if (tenantData) {
      setFirm({
        name: tenantData.name || '',
        legal_name: tenantData.legal_name || '',
        ruc: tenantData.ruc || '',
        timbrado: tenantData.timbrado || '',
        timbrado_expires: tenantData.timbrado_expires || '',
        address: tenantData.address || '',
        city: tenantData.city || 'Asunción',
        phone: tenantData.phone || '',
        email: tenantData.email || '',
      })
    }
  }, [tenantData])

  const saveProfMut = useMutation({
    mutationFn: (d: any) => usersApi.updateMe(d),
    onSuccess: () => { toast.success('Perfil guardado'); qc.invalidateQueries({ queryKey: ['user-me'] }) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al guardar'),
  })
  const saveFirmMut = useMutation({
    mutationFn: (d: any) => tenantsApi.updateMe(d),
    onSuccess: () => { toast.success('Datos del estudio guardados'); qc.invalidateQueries({ queryKey: ['tenant-me'] }) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al guardar'),
  })
  const saveKeyMut = useMutation({
    mutationFn: () => usersApi.updateMe({ openai_api_key: openaiKey }),
    onSuccess: () => { toast.success('API Key guardada'); setOpenaiKey(''); qc.invalidateQueries({ queryKey: ['user-me'] }) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al guardar'),
  })
  const savePwMut = useMutation({
    mutationFn: (d: any) => usersApi.changePassword(d),
    onSuccess: () => { toast.success('Contraseña actualizada'); setPwForm({ current_password: '', new_password: '', confirm: '' }) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error'),
  })

  const saveNotifications = () => saveProfMut.mutate({
    notify_email: profile.notify_email,
    notify_whatsapp: profile.notify_whatsapp,
  })

  const changePassword = () => {
    if (pwForm.new_password !== pwForm.confirm) return toast.error('Las contraseñas no coinciden')
    if (pwForm.new_password.length < 8) return toast.error('Mínimo 8 caracteres')
    savePwMut.mutate({ current_password: pwForm.current_password, new_password: pwForm.new_password })
  }

  const inp = 'w-full px-3 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
  const lbl = 'block text-xs font-semibold text-ink-600 mb-1'

  const planLabel: Record<string,string> = {
    solo: 'Solo — 1 abogado', bufete_s: 'Bufete S — 5 abogados',
    bufete_m: 'Bufete M — 10 abogados', bufete_l: 'Bufete L — Ilimitado'
  }
  const planPrice: Record<string,string> = {
    solo: '₲ 75.000/mes', bufete_s: '₲ 300.000/mes',
    bufete_m: '₲ 500.000/mes', bufete_l: 'Consultar'
  }

  return (
    <AppLayout title="Configuración">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          icon={Settings}
          title="Configuración"
          description="Configuración del estudio y de tu cuenta."
        />
        {/* Tab nav */}
        <div className="flex gap-1 bg-ink-900/[0.05] rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === t.id ? 'bg-white text-ink-900 shadow-tinted-sm' : 'text-ink-400 hover:text-ink-600'}`}>
              <t.icon strokeWidth={1.7} className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* ── PERFIL ── */}
        {tab === 'profile' && (
          <div className="bg-white rounded-2xl p-6 ring-1 ring-ink-900/[0.06] shadow-tinted-sm space-y-5">
            <div className="flex items-center gap-4 pb-5 border-b border-ink-900/[0.06]">
              <div className="w-16 h-16 rounded-2xl bg-ink-900 flex items-center justify-center text-white text-2xl font-bold">
                {profile.full_name?.[0]?.toUpperCase() || user?.full_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-bold text-ink-900 text-lg">{profile.full_name || user?.full_name}</p>
                <p className="text-sm text-ink-500">{user?.email}</p>
                <span className="text-xs px-2 py-0.5 bg-gold-400/12 text-gold-700 rounded-full mt-1 inline-block">{user?.role}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className={lbl}>Nombre completo</label>
                <input className={inp} value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} placeholder="Dr. Juan González" />
              </div>
              <div><label className={lbl}>Teléfono</label>
                <input className={inp} value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="0981234567" />
              </div>
              <div><label className={lbl}>WhatsApp</label>
                <input className={inp} value={profile.whatsapp_number} onChange={e => setProfile({ ...profile, whatsapp_number: e.target.value })} placeholder="595981234567" />
              </div>
              <div><label className={lbl}>Matrícula CAP / CAPY</label>
                <input className={inp} value={profile.bar_number} onChange={e => setProfile({ ...profile, bar_number: e.target.value })} placeholder="CAP-1234" />
              </div>
              <div><label className={lbl}>Especialidades</label>
                <input className={inp} value={profile.specialties} onChange={e => setProfile({ ...profile, specialties: e.target.value })} placeholder="Laboral, Civil, Familia" />
              </div>
            </div>
            <button onClick={() => saveProfMut.mutate(profile)} disabled={saveProfMut.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
              <Save strokeWidth={1.7} className="w-4 h-4" />{saveProfMut.isPending ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>
        )}

        {/* ── ESTUDIO ── */}
        {tab === 'firm' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-6 ring-1 ring-ink-900/[0.06] shadow-tinted-sm space-y-4">
              <h3 className="font-display font-semibold text-ink-900 tracking-tight">Datos del estudio jurídico</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className={lbl}>Nombre del Estudio</label>
                  <input className={inp} value={firm.name} onChange={e => setFirm({ ...firm, name: e.target.value })} placeholder="Estudio González & Asociados" />
                </div>
                <div className="col-span-2"><label className={lbl}>Razón Social (para facturas)</label>
                  <input className={inp} value={firm.legal_name} onChange={e => setFirm({ ...firm, legal_name: e.target.value })} placeholder="GONZALEZ SOCIEDAD CIVIL" />
                </div>
                <div><label className={lbl}>RUC</label>
                  <input className={inp} value={firm.ruc} onChange={e => setFirm({ ...firm, ruc: e.target.value })} placeholder="80123456-7" />
                </div>
                <div><label className={lbl}>Ciudad</label>
                  <input className={inp} value={firm.city} onChange={e => setFirm({ ...firm, city: e.target.value })} />
                </div>
                <div><label className={lbl}>Dirección</label>
                  <input className={inp} value={firm.address} onChange={e => setFirm({ ...firm, address: e.target.value })} placeholder="Av. Mariscal Lopez 1234" />
                </div>
                <div><label className={lbl}>Teléfono del Estudio</label>
                  <input className={inp} value={firm.phone} onChange={e => setFirm({ ...firm, phone: e.target.value })} placeholder="0218001234" />
                </div>
                <div><label className={lbl}>Email del Estudio</label>
                  <input type="email" className={inp} value={firm.email} onChange={e => setFirm({ ...firm, email: e.target.value })} placeholder="contacto@estudio.com.py" />
                </div>
              </div>
              <h3 className="font-display font-semibold text-ink-900 tracking-tight pt-2">Timbrado SET</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>N° Timbrado</label>
                  <input className={inp} value={firm.timbrado} onChange={e => setFirm({ ...firm, timbrado: e.target.value })} placeholder="12345678" />
                </div>
                <div><label className={lbl}>Vencimiento</label>
                  <input type="date" className={inp} value={firm.timbrado_expires} onChange={e => setFirm({ ...firm, timbrado_expires: e.target.value })} />
                </div>
              </div>
              <button onClick={() => saveFirmMut.mutate(firm)} disabled={saveFirmMut.isPending}
                className="flex items-center gap-2 px-6 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
                <Save strokeWidth={1.7} className="w-4 h-4" />{saveFirmMut.isPending ? 'Guardando...' : 'Guardar datos del estudio'}
              </button>
            </div>

            {/* Plan info */}
            <div className="bg-ink-950 rounded-2xl p-6 text-white">
              <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Plan actual</p>
              <p className="text-xl font-bold">{planLabel[tenantData?.plan] || tenantData?.plan || '—'}</p>
              <p className="text-gold-400 font-semibold mt-1">{planPrice[tenantData?.plan] || ''}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${tenantData?.payment_status === 'active' ? 'bg-gold-400/20 text-gold-300' : tenantData?.payment_status === 'trial' ? 'bg-white/10 text-white/70' : 'bg-rose-500/20 text-rose-300'}`}>
                  {tenantData?.payment_status === 'trial' ? 'Periodo de prueba' : tenantData?.payment_status === 'active' ? 'Activo' : tenantData?.payment_status || '—'}
                </span>
                {tenantData?.trial_ends_at && tenantData?.payment_status === 'trial' && (
                  <span className="text-white/50 text-xs">Vence: {tenantData.trial_ends_at}</span>
                )}
                {tenantData?.subscription_expires_at && (
                  <span className="text-white/50 text-xs">Próximo pago: {tenantData.subscription_expires_at}</span>
                )}
              </div>
              <p className="text-white/40 text-xs mt-3">Para cambiar de plan contactá al soporte: 0993397400</p>
            </div>
          </div>
        )}

        {/* ── NOTIFICACIONES ── */}
        {tab === 'notifications' && (
          <div className="bg-white rounded-2xl p-6 ring-1 ring-ink-900/[0.06] shadow-tinted-sm space-y-5">
            <h3 className="font-display font-semibold text-ink-900 tracking-tight">Preferencias de notificación</h3>
            <div className="space-y-4">
              {[
                { key: 'notify_email', label: 'Notificaciones por email', desc: 'Recordatorios de plazos, audiencias y tareas vencidas' },
                { key: 'notify_whatsapp', label: 'Notificaciones por WhatsApp', desc: 'Alertas urgentes al número de WhatsApp configurado' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-paper rounded-xl">
                  <div>
                    <p className="font-medium text-ink-800">{item.label}</p>
                    <p className="text-xs text-ink-500 mt-0.5">{item.desc}</p>
                  </div>
                  <button onClick={() => setProfile({ ...profile, [item.key]: !(profile as any)[item.key] })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${(profile as any)[item.key] ? 'bg-ink-900' : 'bg-ink-900/15'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${(profile as any)[item.key] ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
            <div className="bg-gold-400/[0.08] rounded-xl p-4 ring-1 ring-gold-400/20">
              <p className="text-sm text-ink-800 font-medium">WhatsApp configurado: {profile.whatsapp_number || user?.whatsapp_number || 'No configurado'}</p>
              <p className="text-xs text-ink-500 mt-1">Para configurar WhatsApp, actualizá tu perfil con el número en formato internacional (ej: 595981234567)</p>
            </div>
            <button onClick={saveNotifications} disabled={saveProfMut.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
              <Save strokeWidth={1.7} className="w-4 h-4" />{saveProfMut.isPending ? 'Guardando...' : 'Guardar preferencias'}
            </button>
          </div>
        )}

        {/* ── ASISTENTE IA ── */}
        {tab === 'ai' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 ring-1 ring-ink-900/[0.06] shadow-tinted-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-ink-900 rounded-xl flex items-center justify-center">
                  <Bot strokeWidth={1.7} className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-ink-900 tracking-tight">LEXI — asistente jurídico IA</h3>
                  <p className="text-xs text-ink-500">Especializado en derecho paraguayo</p>
                </div>
              </div>
              {profileData?.has_openai_key ? (
                <div className="flex items-center gap-2 bg-gold-400/12 rounded-xl p-3 mb-4">
                  <CheckCircle strokeWidth={1.7} className="w-4 h-4 text-gold-600 flex-shrink-0" />
                  <p className="text-sm text-gold-700 font-medium">API key de OpenAI configurada y activa</p>
                </div>
              ) : (
                <div className="bg-ink-900/[0.05] rounded-xl p-3 mb-4">
                  <p className="text-sm text-ink-700 font-medium">Sin API key — LEXI funcionará con capacidad limitada</p>
                  <p className="text-xs text-ink-500 mt-1">Configurá tu OpenAI API key para acceso completo al asistente jurídico.</p>
                </div>
              )}
              <label className={lbl}>OpenAI API key</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type={showKey ? 'text' : 'password'} className={inp + ' pr-10'} value={openaiKey}
                    onChange={e => setOpenaiKey(e.target.value)} placeholder="sk-proj-..." />
                  <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                    {showKey ? <EyeOff strokeWidth={1.7} className="w-4 h-4" /> : <Eye strokeWidth={1.7} className="w-4 h-4" />}
                  </button>
                </div>
                <button onClick={() => saveKeyMut.mutate(undefined)} disabled={!openaiKey || saveKeyMut.isPending}
                  className="px-4 py-2.5 bg-ink-900 text-white rounded-full text-sm font-medium hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
                  {saveKeyMut.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              <p className="text-xs text-ink-400 mt-2">Tu API key se guarda encriptada y nunca se comparte. <a href="https://platform.openai.com/api-keys" target="_blank" className="text-gold-700 hover:underline">Obtener API key →</a></p>
            </div>
            <div className="bg-ink-900/5 rounded-2xl p-5">
              <h4 className="font-display font-semibold text-ink-900 tracking-tight mb-3">¿Qué puede hacer LEXI?</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Consultas sobre leyes paraguayas', 'Plazos procesales CPC/CPN',
                  'Redacción de escritos y notas', 'Cálculos laborales Ley 213/93',
                  'Jurisprudencia nacional', 'Análisis de contratos',
                  'Normativa tributaria SET/RUC', 'Formularios INDERT/MJT',
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-ink-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500" />
                    {feat}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SEGURIDAD ── */}
        {tab === 'security' && (
          <div className="bg-white rounded-2xl p-6 ring-1 ring-ink-900/[0.06] shadow-tinted-sm space-y-5">
            <h3 className="font-display font-semibold text-ink-900 tracking-tight">Cambiar contraseña</h3>
            <div className="space-y-4">
              <div><label className={lbl}>Contraseña actual</label>
                <input type="password" className={inp} value={pwForm.current_password}
                  onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} placeholder="••••••••" />
              </div>
              <div><label className={lbl}>Nueva contraseña</label>
                <input type="password" className={inp} value={pwForm.new_password}
                  onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} placeholder="Mínimo 8 caracteres" />
              </div>
              <div><label className={lbl}>Confirmar nueva contraseña</label>
                <input type="password" className={inp} value={pwForm.confirm}
                  onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="Repetí la nueva contraseña" />
              </div>
              {pwForm.new_password && pwForm.confirm && pwForm.new_password !== pwForm.confirm && (
                <p className="text-sm text-rose-600">Las contraseñas no coinciden</p>
              )}
            </div>
            <button onClick={changePassword} disabled={savePwMut.isPending || !pwForm.current_password || !pwForm.new_password}
              className="flex items-center gap-2 px-6 py-3 bg-ink-900 text-white rounded-full font-semibold text-sm hover:bg-ink-800 active:scale-[0.98] transition ease-fluid disabled:opacity-50">
              <Shield strokeWidth={1.7} className="w-4 h-4" />{savePwMut.isPending ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
            <div className="border-t border-ink-900/[0.06] pt-4">
              <p className="text-xs text-ink-400">Cuenta: {user?.email}</p>
              <p className="text-xs text-ink-400 mt-1">Soporte técnico: 0993397400</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
