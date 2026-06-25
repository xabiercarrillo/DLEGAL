import { cn } from '@/lib/utils'
import Nanduti from '@/components/Nanduti'

/**
 * Sello DLEGAL — disco de tinta con filigrana de ñandutí en bronce
 * y una "D" Caslon en papel. Lee como un sello jurídico paraguayo.
 */
export function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        'relative grid place-items-center overflow-hidden rounded-full',
        'bg-gradient-to-br from-ink-700 via-ink-900 to-ink-950',
        'ring-1 ring-brass-500/30 shadow-tinted',
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Nanduti
        size={size * 0.96}
        spokes={12}
        rings={3}
        strokeWidth={0.55}
        className="absolute text-brass-400/45"
      />
      <span
        className="relative font-display leading-none text-paper"
        style={{ fontSize: size * 0.46 }}
      >
        D
      </span>
    </span>
  )
}

/** Logotipo de texto: DLEGAL en Caslon con punto vino de acento. */
export function Wordmark({
  className = '',
  dark = false,
}: {
  className?: string
  dark?: boolean
}) {
  return (
    <span
      className={cn(
        'font-display leading-none tracking-tight',
        dark ? 'text-paper' : 'text-ink-900',
        className
      )}
    >
      DLEGAL<span className="text-wine-500">.</span>
    </span>
  )
}

/** Logo compuesto: sello ñandutí + wordmark + bajada (crédito a Dotribo). */
export default function Logo({
  size = 40,
  showText = true,
  tagline = 'by Dotribo',
  dark = false,
  className = '',
  textSize = 'text-xl',
}: {
  size?: number
  showText?: boolean
  tagline?: string | null
  dark?: boolean
  className?: string
  textSize?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {showText && (
        <span className="flex min-w-0 flex-col">
          <Wordmark dark={dark} className={textSize} />
          {tagline && (
            <span
              className={cn(
                'mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em]',
                dark ? 'text-paper/45' : 'text-ink-400'
              )}
            >
              {tagline}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
