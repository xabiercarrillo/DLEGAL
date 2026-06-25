'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, Phone, MessageCircle, ArrowRight, Stamp, Scale, BookMarked } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/lib/api'
import Logo, { LogoMark, Wordmark } from '@/components/Logo'
import Nanduti from '@/components/Nanduti'
import toast from 'react-hot-toast'

const PHONE = '0993397400'

const TRUST = [
  { icon: Scale, text: 'Casos, audiencias y plazos en un solo expediente foliado' },
  { icon: Stamp, text: 'Facturación SET y firma electrónica con sello digital' },
  { icon: BookMarked, text: 'LEXI, asistente jurídico con inteligencia artificial' },
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
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[1.05fr_1fr] bg-paper">
      {/* ── Panel de marca: sello de ñandutí ── */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-ink-950 p-12 xl:p-16">
        {/* Filigrana ñandutí gigante */}
        <Nanduti
          size={760}
          spokes={24}
          rings={6}
          strokeWidth={0.4}
          className="pointer-events-none absolute -right-48 -bottom-48 text-brass-400/[0.13] animate-spin-slow"
        />
        <div className="pointer-events-none absolute -top-28 -left-24 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(147,48,42,0.22),transparent_65%)]" />

        <Link href="/" className="relative inline-flex w-max">
          <Logo size={46} dark textSize="text-2xl" />
        </Link>

        <div className="relative max-w-md">
          <span className="legal-tag inline-flex items-center rounded-sm bg-paper/[0.06] ring-1 ring-paper/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-brass-300">
            Causa N.º 001 · Asunción
          </span>
          <h2 className="mt-6 font-display text-4xl xl:text-[3.4rem] leading-[1.04] text-paper tracking-tight text-balance">
            El estudio jurídico,<br />en orden.
          </h2>
          <ul className="mt-10 space-y-4">
            {TRUST.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3.5 text-paper/70">
                <span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-sm bg-wine-500/15 ring-1 ring-wine-400/25">
                  <Icon className="h-4 w-4 text-brass-300" strokeWidth={1.6} />
                </span>
                <span className="text-sm leading-relaxed text-pretty">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-paper/35">
          © {new Date().getFullYear()} DLEGAL · Desarrollado por <span className="text-paper/60 font-medium">Dotribo</span>
        </p>
      </aside>

      {/* ── Panel de acceso ── */}
      <main className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Logo móvil */}
          <div className="lg:hidden mb-8 flex flex-col items-center text-center">
            <LogoMark size={56} />
            <Wordmark className="mt-3 text-2xl" />
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-ink-400">by Dotribo</p>
          </div>

          <div className="mb-7">
            <h1 className="font-display text-3xl text-ink-900 tracking-tight">Iniciar sesión</h1>
            <p className="mt-1.5 text-sm text-ink-500">Ingresá a tu espacio de trabajo.</p>
          </div>

          {params.get('registered') && (
            <div className="mb-5 rounded-md bg-seal-500/10 ring-1 ring-seal-500/25 px-4 py-2.5">
              <p className="text-xs text-seal-700 font-medium">Cuenta creada. Iniciá sesión con tus datos.</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5">Correo electrónico</label>
              <input
                type="email" autoComplete="email" required
                className="w-full rounded-lg bg-white px-4 py-3 text-sm text-ink-900 ring-1 ring-ink-900/12 placeholder:text-ink-300 shadow-tinted-sm transition-all duration-300 ease-fluid focus:outline-none focus:ring-2 focus:ring-wine-500/60"
                placeholder="abogado@ejemplo.com.py"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'} autoComplete="current-password" required
                  className="w-full rounded-lg bg-white px-4 py-3 pr-11 text-sm text-ink-900 ring-1 ring-ink-900/12 placeholder:text-ink-300 shadow-tinted-sm transition-all duration-300 ease-fluid focus:outline-none focus:ring-2 focus:ring-wine-500/60"
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600 transition" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="group relative w-full overflow-hidden rounded-full bg-ink-900 py-3.5 pl-6 pr-2 text-sm font-semibold text-paper shadow-tinted transition-all duration-300 ease-fluid hover:bg-ink-800 active:scale-[0.98] disabled:opacity-60">
              <span className="flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Ingresando…' : 'Ingresar al sistema'}
                {!loading && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-brass-400 text-ink-950 transition-transform duration-300 ease-fluid group-hover:translate-x-0.5 group-hover:-translate-y-[calc(50%+1px)]">
                    <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                  </span>
                )}
              </span>
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-ink-900/10 space-y-2 text-center">
            <p className="text-xs text-ink-500">
              ¿Sin cuenta?{' '}
              <Link href="/register" className="text-ink-800 font-semibold hover:text-wine-600 transition">Crear una cuenta</Link>
            </p>
            <p className="text-xs text-ink-500">
              <Link href="/forgot-password" className="hover:text-ink-800 transition">¿Olvidaste tu contraseña?</Link>
              {' · '}
              <Link href="/" className="hover:text-ink-800 transition">Inicio</Link>
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-5 text-xs">
            <a href={`tel:${PHONE}`} className="flex items-center gap-1.5 text-ink-400 hover:text-ink-700 transition">
              <Phone className="w-3.5 h-3.5" /> {PHONE}
            </a>
            <a href={`https://wa.me/595${PHONE.slice(1)}`} target="_blank"
              className="flex items-center gap-1.5 text-ink-400 hover:text-seal-600 transition">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
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
