'use client'
import { useState } from 'react'
import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { LogoMark, Wordmark } from '@/components/Logo'

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post(`${API}/auth/forgot-password`, { email })
      setSent(true)
    } catch {
      toast.error('Error al procesar la solicitud')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl ring-1 ring-ink-900/[0.06] shadow-tinted-lg p-8 w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-6">
          <LogoMark size={34} />
          <Wordmark className="text-xl" />
        </div>
        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gold-400/10 ring-1 ring-gold-400/25">
              <MailCheck className="w-7 h-7 text-gold-600" strokeWidth={1.6} />
            </div>
            <h2 className="font-display text-xl font-semibold text-ink-900 tracking-tight mb-2">Revisá tu correo</h2>
            <p className="text-ink-500 text-sm mb-6">Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña en los próximos minutos.</p>
            <Link href="/login" className="text-ink-800 font-semibold hover:text-gold-600 transition text-sm">← Volver al inicio de sesión</Link>
          </div>
        ) : (
          <>
            <h2 className="font-display text-2xl font-semibold text-ink-900 tracking-tight mb-2">Recuperar contraseña</h2>
            <p className="text-ink-500 text-sm mb-6">Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full px-3.5 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition"
                  placeholder="tu@email.com" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-ink-900 text-white py-3 rounded-full font-semibold hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid disabled:opacity-60">
                {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <Link href="/login" className="text-sm text-ink-400 hover:text-ink-700 transition">← Volver al inicio de sesión</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
