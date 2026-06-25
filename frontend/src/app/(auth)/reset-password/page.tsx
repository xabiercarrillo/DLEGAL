'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { LogoMark, Wordmark } from '@/components/Logo'

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') || ''
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw !== pw2) { toast.error('Las contraseñas no coinciden'); return }
    if (pw.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    setLoading(true)
    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: pw })
      toast.success('Contraseña restablecida. Ya podés ingresar.')
      router.push('/login')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Token inválido o expirado')
    }
    setLoading(false)
  }

  const inp = 'w-full px-3.5 py-2.5 bg-white ring-1 ring-ink-900/10 rounded-xl text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-gold-400/70 transition'

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl ring-1 ring-ink-900/[0.06] shadow-tinted-lg p-8 w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-6">
          <LogoMark size={34} />
          <Wordmark className="text-xl" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-ink-900 tracking-tight mb-2">Nueva contraseña</h2>
        <p className="text-ink-500 text-sm mb-6">Ingresá tu nueva contraseña. Mínimo 8 caracteres.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1.5">Nueva contraseña</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} required minLength={8}
              className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1.5">Repetir contraseña</label>
            <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} required minLength={8}
              className={inp} />
          </div>
          <button type="submit" disabled={loading || !token}
            className="w-full bg-ink-900 text-white py-3 rounded-full font-semibold hover:bg-ink-800 active:scale-[0.98] transition-all duration-300 ease-fluid disabled:opacity-60">
            {loading ? 'Guardando…' : 'Restablecer contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>
}
