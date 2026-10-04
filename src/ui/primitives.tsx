import { useEffect, useId, useRef, type ReactNode } from 'react'
import { sfx } from '../audio/sfx'
import type { Check } from '../engine/validate'
import { useGame } from '../store/gameStore'
import { useT } from './useT'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-terracota text-white shadow-[0_3px_0_#7E2F1F] active:translate-y-[2px] active:shadow-none',
  secondary: 'bg-white text-mar-deep border-2 border-mar/40 active:bg-cel/20',
  danger: 'bg-white text-[#B3261E] border-2 border-[#B3261E]/50 active:bg-[#B3261E]/10',
  ghost: 'bg-transparent text-mar-deep underline-offset-2 hover:underline',
}

/**
 * Botón que sabe por qué está deshabilitado: si la acción no es válida se ve apagado
 * y, al tocarlo (móvil) o pasar el ratón (escritorio), explica el motivo.
 */
export function ActionButton({
  check,
  onClick,
  children,
  variant = 'secondary',
  big = false,
  className = '',
  ignoreBusy = false,
}: {
  /** Para botones de ventanas que se muestran mientras la cola de animaciones está en pausa */
  ignoreBusy?: boolean
  check?: Check
  onClick: () => void
  children: ReactNode
  variant?: Variant
  big?: boolean
  className?: string
}) {
  const t = useT()
  const busy = useGame((s) => s.busy) && !ignoreBusy
  const showToast = useGame((s) => s.showToast)
  const blocked = check && !check.ok
  const reason = check && !check.ok ? t(check.reason, check.vars) : undefined
  const disabled = blocked || busy
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      title={reason}
      onClick={() => {
        if (busy) return
        if (blocked) {
          sfx.deny()
          showToast(reason!)
        }
        else onClick()
      }}
      className={[
        'rounded-xl font-display font-semibold transition select-none',
        big ? 'min-h-14 px-5 text-xl' : 'min-h-11 px-3 text-base',
        disabled ? 'cursor-not-allowed bg-[#E6E1D8] text-[#6B6560] shadow-none border-0' : VARIANTS[variant],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}

/** Hoja inferior en móvil / diálogo centrado en escritorio */
export function Sheet({
  title,
  onClose,
  children,
  footer,
  closable = true,
}: {
  title: ReactNode
  onClose?: () => void
  children: ReactNode
  footer?: ReactNode
  closable?: boolean
}) {
  const t = useT()
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)

  // El foco se mueve solo al abrir/cerrar: si dependiera de onClose (nuevo en cada render),
  // cada tecla pulsada quitaría el foco del campo y en el móvil se cerraría el teclado
  const closeRef = useRef(onClose)
  closeRef.current = closable ? onClose : undefined
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="presentation">
      <div
        className="absolute inset-0 bg-ink/50"
        onClick={() => closable && onClose?.()}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        className="sheet-in relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-2xl bg-arena shadow-2xl outline-none sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-ink/10 px-4 py-3">
          <h2 id={id} className="font-display text-lg font-semibold">{title}</h2>
          {closable && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-full text-2xl leading-none hover:bg-ink/10"
              aria-label={t('ui.close')}
            >
              ×
            </button>
          )}
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 py-3">{children}</div>
        {footer && (
          <div className="border-t border-ink/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>
  )
}

export function Money({ amount, className = '' }: { amount: number; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{amount.toLocaleString('es-ES', { useGrouping: 'always' } as Intl.NumberFormatOptions)} €</span>
}

/**
 * Ventana emergente centrada (para casillas, decisiones y avisos).
 * Sin `onClose` no se puede cerrar tocando fuera: obliga a decidir.
 */
export function Popup({
  children,
  onClose,
  labelledBy,
  wide = false,
  originTile,
}: {
  children: ReactNode
  onClose?: () => void
  labelledBy?: string
  wide?: boolean
  /** Casilla del tablero desde la que "sale volando" la tarjeta */
  originTile?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Soplido al abrir
  useEffect(() => {
    sfx.whoosh()
  }, [])
  // La tarjeta sale de la casilla, vuela girando hasta el centro y rebota
  useEffect(() => {
    const el = ref.current
    if (!el || originTile === undefined) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const tile = document.querySelector(`[data-tile="${originTile}"]`)
    if (!tile) return
    const a = tile.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    const dx = a.left + a.width / 2 - (b.left + b.width / 2)
    const dy = a.top + a.height / 2 - (b.top + b.height / 2)
    const sc = Math.max(0.08, Math.min(a.width / b.width, 0.3))
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sc}) rotateX(65deg) rotateZ(-14deg)`, opacity: 0.35, filter: 'brightness(1.8)' },
        { transform: 'translate(0, -16px) scale(1.06) rotateX(-10deg) rotateZ(2deg)', opacity: 1, filter: 'brightness(1.15)', offset: 0.58 },
        { transform: 'translate(0, 5px) scale(0.985) rotateX(4deg) rotateZ(-0.5deg)', filter: 'brightness(1)', offset: 0.8 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 720, easing: 'cubic-bezier(.2,.85,.25,1)' },
    )
  }, [originTile])
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [])
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain" role="presentation">
      <div className="backdrop-in fixed inset-0 bg-ink/55" onClick={() => onClose?.()} aria-hidden="true" />
      {/* min-h-full + centrado: si la tarjeta es más alta que la pantalla, se desplaza sin cortarse */}
      <div
        className="relative flex min-h-full items-center justify-center p-3 py-[max(0.75rem,env(safe-area-inset-top))] [perspective:1200px] land:px-6 land:py-3"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
      >
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          tabIndex={-1}
          className={`${originTile === undefined ? 'pop-in' : ''} pop-shine relative w-full ${wide ? 'max-w-md' : 'max-w-sm'} outline-none land:max-w-2xl`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
