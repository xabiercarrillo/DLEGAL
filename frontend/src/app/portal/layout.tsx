import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portal del Cliente — DLEGAL',
  description: 'Acceso seguro a su expediente, facturas y documentos jurídicos.',
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
