import type { Metadata } from 'next'
import { Libre_Caslon_Display, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const sans = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })
const display = Libre_Caslon_Display({ subsets: ['latin'], weight: '400', variable: '--font-display', display: 'swap' })

export const metadata: Metadata = {
  title: {
    default: 'DLEGAL — Software Jurídico Paraguay | Gestión de Casos, Facturación SET, LEXI IA',
    template: '%s | DLEGAL Paraguay',
  },
  description: 'La plataforma de gestión jurídica más completa de Paraguay. Casos, audiencias, facturación SET, calculadora Ley 213/93, firma electrónica y LEXI asistente IA. Desarrollado por Dotribo. Planes desde ₲75.000/mes.',
  keywords: ['software jurídico Paraguay', 'gestión de casos abogados', 'facturación SET Paraguay', 'Ley 213 calculadora laboral', 'sistema legal Paraguay', 'bufete abogados software', 'DLEGAL', 'Dotribo'],
  authors: [{ name: 'Dotribo' }],
  creator: 'Dotribo',
  publisher: 'Dotribo',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'es_PY',
    url: 'https://dlegal.com.py',
    siteName: 'DLEGAL',
    title: 'DLEGAL — Software Jurídico Paraguay',
    description: 'Gestión jurídica completa: casos, facturación SET, calculadora laboral Ley 213/93, LEXI IA. Desarrollado por Dotribo. 14 días gratis.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DLEGAL · by Dotribo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DLEGAL — Software Jurídico Paraguay',
    description: 'La plataforma legal más completa de Paraguay. Desarrollado por Dotribo. ₲75.000/mes.',
  },
  robots: { index: true, follow: true },
  metadataBase: new URL('https://dlegal.com.py'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <div className="grain-overlay" aria-hidden="true" />
      </body>
    </html>
  )
}
