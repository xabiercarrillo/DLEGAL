import type { LucideIcon } from 'lucide-react'

/**
 * Encabezado de página premium y consistente.
 * Título en font-display, descripción breve y zona de acciones a la derecha.
 * Solo presentación — sin lógica.
 */
export default function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6 animate-fade-up">
      <div className="flex items-start gap-3.5 min-w-0">
        {Icon && (
          <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-ink-900/[0.05] ring-1 ring-ink-900/[0.06] shadow-tinted-sm items-center justify-center flex-shrink-0">
            <Icon strokeWidth={1.6} className="w-5 h-5 text-ink-700" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl text-ink-900 tracking-tight leading-tight">{title}</h1>
          {description && <p className="text-sm text-ink-500 mt-1 text-pretty">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}
