import type { LucideIcon } from 'lucide-react'

/**
 * Empty state rico y consistente: icono grande tenue, título font-display,
 * texto guía y acción opcional. Solo presentación.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-3xl py-16 px-8 text-center ring-1 ring-ink-900/[0.06] shadow-tinted-sm animate-fade-up">
      <div className="w-16 h-16 rounded-3xl bg-ink-900/[0.03] ring-1 ring-ink-900/[0.05] flex items-center justify-center mx-auto mb-5">
        <Icon strokeWidth={1.4} className="w-8 h-8 text-ink-200" />
      </div>
      <h3 className="font-display text-xl text-ink-900">{title}</h3>
      {description && <p className="text-sm text-ink-400 mt-1.5 max-w-sm mx-auto text-pretty">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}
