import Link from 'next/link'
import { Scale, ArrowLeft } from 'lucide-react'

export default function TerminosPage() {
  const PHONE = '0993397400'
  const EMAIL = 'soporte@xlegal.com.py'
  const UPDATED = '1 de marzo de 2025'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Volver</span>
          </Link>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-7 h-7 bg-gradient-to-br from-[#c9a84c] to-[#e6c96a] rounded-xl flex items-center justify-center">
              <Scale className="w-3.5 h-3.5 text-[#1a1a2e]" />
            </div>
            <span className="font-bold text-[#1a1a2e]">DLEGAL Paraguay</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-extrabold text-[#1a1a2e] mb-2">Términos y Condiciones</h1>
          <p className="text-gray-400 text-sm mb-10">Última actualización: {UPDATED}</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">1. Aceptación de los Términos</h2>
              <p>Al registrarse y utilizar DLEGAL ("el Servicio"), usted acepta estos Términos y Condiciones en su totalidad. Si no está de acuerdo con alguno de los términos aquí establecidos, le solicitamos que no utilice el Servicio.</p>
              <p className="mt-2">DLEGAL es un sistema de gestión jurídica desarrollado y operado en la República del Paraguay, sujeto a la legislación paraguaya vigente.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">2. Descripción del Servicio</h2>
              <p>DLEGAL provee una plataforma de software como servicio (SaaS) para abogados y estudios jurídicos en Paraguay. Los módulos incluyen, sin limitarse a: gestión de casos, facturación electrónica, calculadora laboral (Ley 213/93), gestión documental, LEXI asistente IA, portal del cliente, cobranzas y reportes.</p>
              <p className="mt-2">El Servicio se presta bajo la modalidad de suscripción mensual según el plan elegido.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">3. Registro y Cuenta</h2>
              <p>Para acceder al Servicio, el usuario debe registrarse proporcionando información verídica y actualizada. El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso.</p>
              <p className="mt-2">Cada suscripción da acceso a un único estudio jurídico ("tenant"). Los datos de cada tenant están aislados y no son accesibles por otros usuarios del sistema.</p>
              <p className="mt-2">DLEGAL se reserva el derecho de suspender cuentas que hayan proporcionado información falsa, incumplan estos términos, o utilicen el Servicio de manera fraudulenta.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">4. Período de Prueba y Suscripción</h2>
              <p><strong>Período de prueba:</strong> Todos los planes incluyen 14 días de acceso gratuito sin requerir datos de pago. Al vencer el período de prueba, el acceso se suspende automáticamente hasta confirmar el pago.</p>
              <p className="mt-2"><strong>Pago:</strong> Las suscripciones se cobran mensualmente en Guaraníes (₲) según el plan seleccionado. Aceptamos transferencia bancaria, Bancard, y Mercado Pago.</p>
              <p className="mt-2"><strong>Cancelación:</strong> El usuario puede cancelar su suscripción en cualquier momento contactando al soporte. No se realizan reembolsos por períodos parciales.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">5. Responsabilidades del Usuario</h2>
              <p>El usuario se compromete a:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Utilizar el Servicio exclusivamente para fines legales y lícitos.</li>
                <li>No cargar contenido que infrinja derechos de terceros o la legislación paraguaya.</li>
                <li>Mantener la confidencialidad de los datos de sus clientes conforme a las obligaciones éticas y legales de la profesión.</li>
                <li>No intentar vulnerar la seguridad del sistema ni acceder a datos de otros tenants.</li>
                <li>Notificar inmediatamente al soporte cualquier uso no autorizado de su cuenta.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">6. Limitación de Responsabilidad</h2>
              <p>DLEGAL proporciona el Servicio "tal como está" y no garantiza que sea ininterrumpido o libre de errores. En ningún caso DLEGAL será responsable por daños indirectos, incidentales o consecuentes derivados del uso del Servicio.</p>
              <p className="mt-2">La calculadora laboral Ley 213/93 y otras herramientas de cálculo son de referencia. El usuario es responsable de verificar los resultados antes de utilizarlos en actuaciones legales.</p>
              <p className="mt-2">El asistente IA (LEXI) provee información de referencia y no constituye asesoría jurídica profesional.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">7. Propiedad Intelectual</h2>
              <p>Todo el software, diseño, código fuente y contenido propio de DLEGAL son propiedad de DLEGAL Paraguay. Los datos ingresados por el usuario (casos, clientes, documentos) son propiedad del usuario y serán devueltos en formato exportable a solicitud.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">8. Modificaciones</h2>
              <p>DLEGAL puede modificar estos Términos en cualquier momento. Las modificaciones serán notificadas por email con al menos 15 días de anticipación. El uso continuado del Servicio tras dicha notificación implica la aceptación de los nuevos términos.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">9. Legislación Aplicable</h2>
              <p>Estos Términos se rigen por las leyes de la República del Paraguay. Cualquier controversia será sometida a los tribunales competentes de la ciudad de Asunción.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">10. Contacto</h2>
              <p>Para consultas sobre estos Términos, contactenos:</p>
              <div className="mt-3 bg-gray-50 rounded-xl p-4 text-sm">
                <p><strong>DLEGAL Paraguay</strong></p>
                <p>📱 WhatsApp / Teléfono: <a href={`tel:${PHONE}`} className="text-[#c9a84c] font-semibold">{PHONE}</a></p>
                <p>📧 Email: <a href={`mailto:${EMAIL}`} className="text-[#c9a84c] font-semibold">{EMAIL}</a></p>
              </div>
            </section>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 flex flex-wrap gap-4 text-sm text-gray-400">
            <Link href="/privacidad" className="hover:text-[#1a1a2e] transition">Política de Privacidad →</Link>
            <Link href="/register" className="hover:text-[#1a1a2e] transition">Registrarse →</Link>
            <Link href="/" className="hover:text-[#1a1a2e] transition">Volver al inicio →</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
