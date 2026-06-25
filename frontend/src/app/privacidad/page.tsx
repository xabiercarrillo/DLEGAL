import Link from 'next/link'
import { Scale, ArrowLeft } from 'lucide-react'

export default function PrivacidadPage() {
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
          <h1 className="text-3xl font-extrabold text-[#1a1a2e] mb-2">Política de Privacidad</h1>
          <p className="text-gray-400 text-sm mb-10">Última actualización: {UPDATED}</p>

          <div className="space-y-8 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">1. Información que recopilamos</h2>
              <p>DLEGAL recopila la siguiente información para proveer el Servicio:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
                <li><strong>Datos de registro:</strong> nombre, email, teléfono, nombre del estudio jurídico, RUC.</li>
                <li><strong>Datos de uso:</strong> casos, clientes, documentos, facturas, plazos y demás información ingresada por el usuario.</li>
                <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador, páginas visitadas dentro del sistema (para diagnóstico y mejora del Servicio).</li>
                <li><strong>Datos de pago:</strong> DLEGAL no almacena datos de tarjetas de crédito. Los pagos son procesados por Bancard o Mercado Pago según sus propias políticas.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">2. Cómo usamos su información</h2>
              <p>Los datos recopilados se utilizan exclusivamente para:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
                <li>Proveer y mejorar el Servicio.</li>
                <li>Enviar notificaciones operativas (plazos, recordatorios, vencimiento de suscripción).</li>
                <li>Soporte técnico y atención al usuario.</li>
                <li>Cumplir con obligaciones legales en la República del Paraguay.</li>
              </ul>
              <p className="mt-2 text-sm font-semibold text-[#1a1a2e]">DLEGAL NO vende, cede ni comparte datos personales con terceros con fines comerciales.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">3. Almacenamiento y Seguridad</h2>
              <p>Los datos se almacenan en servidores ubicados en infraestructura segura con las siguientes medidas:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
                <li>Comunicaciones encriptadas mediante SSL/TLS.</li>
                <li>Contraseñas hasheadas con bcrypt (nunca almacenadas en texto plano).</li>
                <li>Aislamiento total entre tenants: ningún estudio puede acceder a datos de otro.</li>
                <li>Backups automáticos diarios con retención de 30 días.</li>
                <li>Tokens JWT con expiración de 24 horas.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">4. Datos de Clientes del Estudio</h2>
              <p>Los datos que el abogado ingresa sobre sus propios clientes (nombre, RUC, expedientes, etc.) son de exclusiva propiedad del estudio jurídico. DLEGAL actúa como procesador de datos bajo las instrucciones del usuario.</p>
              <p className="mt-2 text-sm">El usuario abogado es responsable de obtener el consentimiento de sus propios clientes para el uso de sus datos conforme a la legislación paraguaya aplicable.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">5. Servicios de Terceros</h2>
              <p>DLEGAL puede integrar servicios de terceros sujetos a sus propias políticas de privacidad:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
                <li><strong>Resend:</strong> envío de emails transaccionales.</li>
                <li><strong>Twilio:</strong> mensajes WhatsApp y SMS.</li>
                <li><strong>Bancard / Mercado Pago:</strong> procesamiento de pagos.</li>
                <li><strong>OpenAI / Anthropic:</strong> funcionalidades de IA (LEXI). Los textos enviados a LEXI pueden ser procesados por estos proveedores conforme a sus políticas.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">6. Sus Derechos</h2>
              <p>Conforme a la Ley N° 1682/01 de "Habeas Data" y normativa complementaria de Paraguay, usted tiene derecho a:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
                <li><strong>Acceso:</strong> solicitar una copia de sus datos personales almacenados.</li>
                <li><strong>Rectificación:</strong> corregir datos inexactos.</li>
                <li><strong>Eliminación:</strong> solicitar la eliminación de sus datos al cancelar el servicio.</li>
                <li><strong>Portabilidad:</strong> exportar sus datos en formato CSV/Excel en cualquier momento desde el sistema.</li>
              </ul>
              <p className="mt-2 text-sm">Para ejercer estos derechos, contactenos por los medios indicados más abajo.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">7. Cookies</h2>
              <p className="text-sm">DLEGAL utiliza únicamente cookies estrictamente necesarias para el funcionamiento de la sesión. No utilizamos cookies de seguimiento ni publicidad.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">8. Retención de Datos</h2>
              <p className="text-sm">Los datos se conservan mientras la suscripción esté activa. Al cancelar el servicio, los datos se retienen por 90 días adicionales para permitir la exportación, tras lo cual son eliminados de forma permanente.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">9. Cambios a esta Política</h2>
              <p className="text-sm">Notificaremos cambios significativos a esta política por email con al menos 15 días de anticipación. El uso continuado del Servicio implica la aceptación de la política actualizada.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">10. Contacto</h2>
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p><strong>DLEGAL Paraguay — Responsable de Datos</strong></p>
                <p>📱 <a href={`tel:${PHONE}`} className="text-[#c9a84c] font-semibold">{PHONE}</a></p>
                <p>📧 <a href={`mailto:${EMAIL}`} className="text-[#c9a84c] font-semibold">{EMAIL}</a></p>
              </div>
            </section>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 flex flex-wrap gap-4 text-sm text-gray-400">
            <Link href="/terminos" className="hover:text-[#1a1a2e] transition">Términos y Condiciones →</Link>
            <Link href="/register" className="hover:text-[#1a1a2e] transition">Registrarse →</Link>
            <Link href="/" className="hover:text-[#1a1a2e] transition">Volver al inicio →</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
