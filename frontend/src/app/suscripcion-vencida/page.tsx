'use client'
import Link from 'next/link'
import { Phone, MessageCircle, Clock } from 'lucide-react'
import { LogoMark, Wordmark } from '@/components/Logo'

const PHONE = '0993397400'
const WA = `https://wa.me/595${PHONE.slice(1)}?text=Hola, quiero activar mi suscripción de DLEGAL`

const STEPS = [
  { step: '1', title: 'Elegí tu plan', desc: 'Solo ₲75.000 · Buffet S ₲300.000 · Buffet M ₲500.000' },
  { step: '2', title: 'Realizá el pago', desc: 'Transferencia bancaria, Bancard o MercadoPago' },
  { step: '3', title: 'Confirmá por WhatsApp', desc: 'Enviá el comprobante al 0993397400' },
  { step: '4', title: 'Activación inmediata', desc: 'Tu acceso se reactiva en minutos' },
]

export default function SuscripcionVencidaPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950 flex items-center justify-center p-4">
      <div className="pointer-events-none absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(147,48,42,0.16),transparent_65%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(34,40,69,0.9),transparent_70%)]" />

      <div className="relative max-w-lg w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <LogoMark size={40} />
          <Wordmark dark className="text-2xl" />
        </div>

        <div className="bg-white rounded-3xl p-8 ring-1 ring-ink-900/[0.06] shadow-tinted-lg">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gold-400/10 ring-1 ring-gold-400/25">
              <Clock className="w-7 h-7 text-gold-600" strokeWidth={1.6} />
            </div>
            <h1 className="font-display text-2xl font-semibold text-ink-900 tracking-tight mb-2">
              Tu suscripción ha vencido
            </h1>
            <p className="text-ink-500 text-sm">
              Para continuar usando DLEGAL y acceder a todos tus casos, clientes y documentos, activá tu suscripción en minutos.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-8">
            {STEPS.map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-ink-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 tnum">
                  {s.step}
                </div>
                <div>
                  <p className="font-semibold text-ink-900 text-sm">{s.title}</p>
                  <p className="text-ink-400 text-xs">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <a href={WA} target="_blank"
              className="w-full flex items-center justify-center gap-2 bg-ink-900 hover:bg-ink-800 active:scale-[0.98] text-white py-4 rounded-full font-semibold transition-all duration-300 ease-fluid text-sm">
              <MessageCircle className="w-5 h-5" strokeWidth={1.7} />
              Activar por WhatsApp
            </a>
            <a href={`tel:${PHONE}`}
              className="w-full flex items-center justify-center gap-2 ring-1 ring-ink-900/10 text-ink-700 hover:bg-ink-900/5 py-4 rounded-full font-semibold transition text-sm">
              <Phone className="w-5 h-5" strokeWidth={1.7} />
              Llamar al {PHONE}
            </a>
          </div>

          <div className="mt-6 pt-6 border-t border-ink-900/[0.07] flex justify-between items-center gap-4">
            <Link href="/login" className="text-xs text-ink-400 hover:text-ink-700 transition whitespace-nowrap">
              ← Volver al inicio
            </Link>
            <p className="text-xs text-ink-400 text-right">¿Ya pagaste? Esperá unos minutos y recargá la página.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
