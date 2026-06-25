import Link from 'next/link'
import { Scale, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#c9a84c] to-[#e6c96a] rounded-2xl flex items-center justify-center">
            <Scale className="w-8 h-8 text-[#1a1a2e]" />
          </div>
        </div>
        <p className="text-[#c9a84c] font-bold text-6xl mb-4">404</p>
        <h1 className="text-2xl font-extrabold mb-3">Página no encontrada</h1>
        <p className="text-white/50 mb-8 max-w-sm mx-auto text-sm">
          El expediente que buscás no existe o fue archivado.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard"
            className="flex items-center gap-2 bg-[#c9a84c] hover:bg-[#e6c96a] text-[#1a1a2e] px-6 py-3 rounded-xl font-bold transition text-sm">
            <ArrowLeft className="w-4 h-4" /> Ir al Dashboard
          </Link>
          <Link href="/"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition text-sm">
            Inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
