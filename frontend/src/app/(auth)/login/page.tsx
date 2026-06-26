'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, Phone, MessageCircle, ArrowRight, Check } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/lib/api'
import Logo, { LogoMark, Wordmark } from '@/components/Logo'
import toast from 'react-hot-toast'

const PHONE = '0993397400'

const POINTS = [
  'Casos, audiencias y plazos en un solo expediente',
  'Facturación SET, cobranzas y firma electrónica',
  'LEXI, tu asistente jurídico con inteligencia artificial',
]

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.login(email, password)
      setAuth(data.user, data.access_token)
      toast.success('Bienvenido, ' + data.user.full_name)
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Credenciales incorrectas')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      {/* ── Panel imagen: biblioteca jurídica, nítida ── */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <img
          src="https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1600&q=80&auto=format&fit=crop"
          alt="Biblioteca jurídica clásica"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Scrim: oscuro abajo (texto), velo leve arriba (logo) */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/45 to-ink-950/30" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_10%_100%,rgba(147,48,42,0.4),transparent_60%)]" />

        <div className="relative p-12 xl:p-14">
          <Link href="/" className="inline-flex drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
            <Logo size={44} dark textSize="text-2xl" />
          </Link>
        </div>

        <div className="relative p-12 xl:p-16">
          <h2 className="max-w-md font-display text-4xl leading-[1.05] text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] xl:text-5xl">
            El estudio jurídico,<br />en orden.
          </h2>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-white/85">
                <span className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-brass-400 text-ink-950">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="text-sm leading-relaxed drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-xs text-white/55">
            © {new Date().getFullYear()} DLEGAL · Desarrollado por <span className="text-white/80">Dotribo</span>
          </p>
        </div>
      </aside>

      {/* ── Panel acceso ── */}
      <main className="flex min-h-[100dvh] items-center justify-center bg-paper px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <LogoMark size={56} />
            <Wordmark className="mt-3 text-2xl" />
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-ink-400">by Dotribo</p>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl text-ink-900">Iniciar sesión</h1>
            <p className="mt-2 text-sm text-ink-500">Ingresá a tu espacio de trabajo.</p>
          </div>

          {params.get('registered') && (
            <div className="mb-5 rounded-md bg-seal-500/10 px-4 py-2.5 ring-1 ring-seal-500/25">
              <p className="text-xs font-medium text-seal-700">Cuenta creada. Iniciá sesión con tus datos.</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink-600">Correo electrónico</label>
              <input
                type="email" autoComplete="email" required
                className="w-full rounded-xl bg-white px-4 py-3.5 text-sm text-ink-900 ring-1 ring-ink-900/12 placeholder:text-ink-300 shadow-tinted-sm transition-all duration-300 ease-fluid focus:outline-none focus:ring-2 focus:ring-wine-500/60"
                placeholder="abogado@ejemplo.com.py"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink-600">Contraseña</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'} autoComplete="current-password" required
                  className="w-full rounded-xl bg-white px-4 py-3.5 pr-11 text-sm text-ink-900 ring-1 ring-ink-900/12 placeholder:text-ink-300 shadow-tinted-sm transition-all duration-300 ease-fluid focus:outline-none focus:ring-2 focus:ring-wine-500/60"
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-300 transition hover:text-ink-600" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="group relative w-full overflow-hidden rounded-full bg-ink-900 py-4 pl-6 pr-2 text-sm font-semibold text-paper shadow-tinted transition-all duration-300 ease-fluid hover:bg-ink-800 active:scale-[0.98] disabled:opacity-60">
              <span className="flex items-center justify-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Ingresando…' : 'Ingresar al sistema'}
                {!loading && (
                  <span className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-brass-400 text-ink-950 transition-transform duration-300 ease-fluid group-hover:translate-x-0.5 group-hover:-translate-y-[calc(50%+1px)]">
                    <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                )}
              </span>
            </button>
          </form>

          <div className="mt-7 space-y-2 border-t border-ink-900/10 pt-6 text-center">
            <p className="text-xs text-ink-500">
              ¿Sin cuenta?{' '}
              <Link href="/register" className="font-semibold text-ink-800 transition hover:text-wine-600">Crear una cuenta</Link>
            </p>
            <p className="text-xs text-ink-500">
              <Link href="/forgot-password" className="transition hover:text-ink-800">¿Olvidaste tu contraseña?</Link>
              {' · '}
              <Link href="/" className="transition hover:text-ink-800">Inicio</Link>
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-5 text-xs">
            <a href={`tel:${PHONE}`} className="flex items-center gap-1.5 text-ink-400 transition hover:text-ink-700">
              <Phone className="h-3.5 w-3.5" /> {PHONE}
            </a>
            <a href={`https://wa.me/595${PHONE.slice(1)}`} target="_blank"
              className="flex items-center gap-1.5 text-ink-400 transition hover:text-seal-600">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-[100dvh] bg-ink-950" />}><LoginForm /></Suspense>
}
