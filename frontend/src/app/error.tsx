'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { Scale, RefreshCw } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center">
            <Scale className="w-8 h-8 text-red-400" />
          </div>
        </div>
        <p className="text-red-400 font-bold text-5xl mb-4">Error</p>
        <h1 className="text-2xl font-extrabold mb-3">Algo salió mal</h1>
        <p className="text-white/50 mb-8 max-w-sm mx-auto text-sm">
          Ocurrió un error inesperado. Si el problema persiste, contactá al soporte al{' '}
          <a href="tel:0993397400" className="text-[#c9a84c] font-bold">0993397400</a>.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset}
            className="flex items-center gap-2 bg-[#c9a84c] hover:bg-[#e6c96a] text-[#1a1a2e] px-6 py-3 rounded-xl font-bold transition text-sm">
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
          <Link href="/dashboard"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition text-sm">
            Ir al Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
