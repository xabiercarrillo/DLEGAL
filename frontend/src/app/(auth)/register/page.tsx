'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Phone, MessageCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import Logo from '@/components/Logo'
import { validate, ruleRequired, isEmail, ruleRUCOptional } from '@/lib/validation'

const PLANS: Record<string, { name: string; price: string; users: string }> = {
  solo:     { name: 'Solo',     price: '₲ 75.000/mes',  users: '1 usuario' },
  bufete_s: { name: 'Buffet S', price: '₲ 300.000/mes', users: '5 usuarios' },
  bufete_m: { name: 'Buffet M', price: '₲ 500.000/mes', users: '10 usuarios' },
}

const PHONE = '0993397400'

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const selectedPlan = params.get('plan') || 'solo'

  const [form, setForm] = useState({
    firm_name: '', admin_name: '', email: '', password: '',
    phone: '', city: 'Asunción', plan: selectedPlan, ruc: ''
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string,string>>({})

  const setField = (k: string, v: any) => {
    setForm({ ...form, [k]: v })
    if (errors[k]) setErrors(prev => { const n = { ...prev }; delete n[k]; return n })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate({
      firm_name: { value: form.firm_name, rules: [ruleRequired('El nombre del estudio es requerido')] },
      admin_name: { value: form.admin_name, rules: [ruleRequired('Su nombre es requerido')] },
      email: { value: form.email, rules: [ruleRequired('El email es requerido'), { test: (v: any) => isEmail(v), message: 'Email inválido' }] },
      password: { value: form.password, rules: [ruleRequired('La contraseña es requerida'), { test: (v: any) => String(v).length >= 8, message: 'Mínimo 8 caracteres' }] },
      ruc: { value: form.ruc, rules: [ruleRUCOptional()] },
    })
    if (Object.keys(errs).length) { setErrors(errs); toast.error('Revisá los campos marcados'); return }
    setErrors({})

    setLoading(true)
    try {
      await api.post('/superadmin/register', form)
      toast.success('¡Cuenta creada! 14 días de prueba gratuita')
      router.push('/login?registered=1')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al crear la cuenta')
    } finally { setLoading(false) }
  }

  const plan = PLANS[form.plan] || PLANS.solo
  const inp = 'w-full px-3.5 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'
  const inpErr = 'w-full px-3.5 py-2.5 bg-white ring-1 ring-rose-400 rounded-xl text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-rose-400 transition'
  const err = (f: string) => errors[f] ? inpErr : inp
  const lbl = 'block text-xs font-semibold text-ink-600 mb-1.5'

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex">
            <Logo size={42} textSize="text-2xl" tagline={null} />
          </Link>
          <h1 className="font-display text-2xl font-semibold text-ink-900 tracking-tight mt-5">Crear cuenta gratis</h1>
          <p className="text-ink-400 text-sm mt-1">14 días de prueba sin compromiso</p>
        </div>

        <div className="bg-white rounded-3xl ring-1 ring-ink-900/[0.06] shadow-tinted-lg p-8">
          {/* Plan selection */}
          <div className="mb-6">
            <p className="text-[11px] font-semibold text-ink-400 mb-3 uppercase tracking-wider">Plan seleccionado</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PLANS).map(([k, v]) => (
                <button key={k} type="button" onClick={() => setForm({ ...form, plan: k })}
                  className={`py-2.5 px-3 rounded-xl text-center transition ${form.plan === k ? 'ring-2 ring-gold-400/60 bg-gold-400/[0.06]' : 'ring-1 ring-ink-900/10 hover:ring-ink-900/20'}`}>
                  <p className="font-semibold text-sm text-ink-900">{v.name}</p>
                  <p className="text-xs text-ink-500 tnum">{v.price}</p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className={lbl}>Nombre del estudio / bufete *</label>
              <input className={err('firm_name')} placeholder="Estudio Jurídico González & Asociados" value={form.firm_name} onChange={e => setField('firm_name', e.target.value)} />
              {errors.firm_name && <p className="mt-1 text-xs text-rose-600">{errors.firm_name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Su nombre completo *</label>
                <input className={err('admin_name')} placeholder="Abog. Juan González" value={form.admin_name} onChange={e => setField('admin_name', e.target.value)} />
                {errors.admin_name && <p className="mt-1 text-xs text-rose-600">{errors.admin_name}</p>}
              </div>
              <div>
                <label className={lbl}>Ciudad</label>
                <input className={inp} placeholder="Asunción" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={lbl}>Email *</label>
              <input type="email" className={err('email')} placeholder="abogado@ejemplo.com.py" value={form.email} onChange={e => setField('email', e.target.value)} />
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Teléfono / WhatsApp</label>
                <input className={inp} placeholder="0981234567" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className={lbl}>RUC (opcional)</label>
                <input className={err('ruc')} placeholder="80123456-7" value={form.ruc} onChange={e => setField('ruc', e.target.value)} />
                {errors.ruc && <p className="mt-1 text-xs text-rose-600">{errors.ruc}</p>}
              </div>
            </div>
            <div>
              <label className={lbl}>Contraseña *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className={err('password') + ' pr-10'} placeholder="Mínimo 8 caracteres" value={form.password} onChange={e => setField('password', e.target.value)} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600 transition">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-ink-900 text-white rounded-full font-semibold hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid disabled:opacity-50 text-sm mt-2">
              {loading ? 'Creando cuenta…' : 'Crear cuenta gratis — 14 días de prueba'}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-400">
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-gold-600" />Sin tarjeta</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-gold-600" />Cancela cuando quieras</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-gold-600" />Datos seguros</span>
          </div>

          <p className="text-center text-xs text-ink-400 mt-4">
            ¿Ya tenés cuenta? <Link href="/login" className="text-ink-800 font-semibold hover:text-gold-600 transition">Ingresar</Link>
          </p>
        </div>

        <div className="text-center mt-4 flex justify-center gap-5">
          <a href={`tel:${PHONE}`} className="flex items-center gap-1.5 text-ink-400 hover:text-ink-700 text-sm transition">
            <Phone className="w-4 h-4" /> {PHONE}
          </a>
          <a href={`https://wa.me/595${PHONE.slice(1)}`} target="_blank" className="flex items-center gap-1.5 text-gold-600 hover:text-gold-700 text-sm transition">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return <Suspense fallback={<div className="min-h-screen bg-paper" />}><RegisterForm /></Suspense>
}
