import { useEffect, useState } from 'react'
import { useGame } from '../store/gameStore'
import { useT } from './useT'

/** Selector de sonido: con sonido (por defecto) o sin sonido */
export function SoundToggle() {
  const muted = useGame((s) => s.muted)
  const setSound = useGame((s) => s.setSound)
  const t = useT()
  return (
    <div className="flex overflow-hidden rounded-lg border-2 border-mar/30 text-sm font-bold" role="radiogroup" aria-label={t('ui.sound')}>
      {[true, false].map((on) => (
        <button
          key={String(on)}
          type="button"
          role="radio"
          aria-checked={muted !== on}
          onClick={() => setSound(on)}
          className={`min-h-9 px-3 ${muted !== on ? 'bg-mar text-white' : 'bg-white text-mar-deep'}`}
        >
          {on ? `🔊 ${t('ui.soundOn')}` : `🔇 ${t('ui.soundOff')}`}
        </button>
      ))}
    </div>
  )
}

export function LangToggle() {
  const lang = useGame((s) => s.lang)
  const setLang = useGame((s) => s.setLang)
  const t = useT()
  return (
    <div className="flex overflow-hidden rounded-lg border-2 border-mar/30 text-sm font-bold" role="radiogroup" aria-label={t('ui.language')}>
      {(['es', 'ca'] as const).map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          onClick={() => setLang(l)}
          className={`min-h-9 min-w-10 px-2 uppercase ${lang === l ? 'bg-mar text-white' : 'bg-white text-mar-deep'}`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

function Timer() {
  const game = useGame((s) => s.game)!
  const dispatch = useGame((s) => s.dispatch)
  const busy = useGame((s) => s.busy)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const qm = game.quickMode
  const left = qm.type === 'time' ? Math.max(0, qm.endsAt - now) : null
  useEffect(() => {
    if (left === 0 && !busy && game.phase !== 'gameOver') dispatch({ type: 'timeUp' })
  }, [left, busy, game.phase, dispatch])
  if (left === null) return null
  const m = Math.floor(left / 60000)
  const s = Math.floor((left % 60000) / 1000)
  return (
    <span className={`tabular-nums ${left < 120000 ? 'text-terracota' : ''}`} aria-label="tiempo restante">
      ⏱ {m}:{String(s).padStart(2, '0')}
    </span>
  )
}

export function Header({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const game = useGame((s) => s.game)!
  const zoom = useGame((s) => s.zoom)
  const toggleZoom = useGame((s) => s.toggleZoom)
  const setModal = useGame((s) => s.setModal)
  const muted = useGame((s) => s.muted)
  const toggleMute = useGame((s) => s.toggleMute)
  const t = useT()
  const qm = game.quickMode
  const iconBtn = 'grid h-10 w-10 max-[359px]:h-9 max-[359px]:w-9 shrink-0 place-items-center rounded-lg bg-white font-bold text-mar-deep border-2 border-mar/30 aria-pressed:bg-cel/30'
  return (
    <header className={`${compact ? 'sticky top-0 z-10 flex-wrap px-2 py-1.5' : 'sticky top-[env(safe-area-inset-top,0px)] z-30 px-3 py-2'} flex items-center gap-1.5 bg-arena/95 backdrop-blur ${className}`}>
      <span className="whitespace-nowrap max-[359px]:hidden font-display text-base font-bold text-mar sm:text-lg">{t('app.title')}</span>
      <span className="whitespace-nowrap text-xs opacity-80 sm:text-sm">
        {qm.type === 'rounds' ? t('ui.roundOf', { n: Math.min(game.round, qm.limit), max: qm.limit }) : t('ui.round', { n: game.round })}
      </span>
      <span className="text-sm"><Timer /></span>
      <span className="flex-1" />
      <button type="button" className={`${iconBtn} lg:hidden land:hidden`} onClick={toggleZoom} aria-pressed={zoom} aria-label={t('ui.zoom')}>
        🔍
      </button>
      <button type="button" className={iconBtn} onClick={toggleMute} aria-pressed={!muted} aria-label={muted ? t('ui.unmute') : t('ui.mute')}>
        {muted ? '🔇' : '🔊'}
      </button>
      <button type="button" className={iconBtn} onClick={() => setModal({ type: 'help' })} aria-label={t('ui.help')}>?</button>
      <button type="button" className={iconBtn} onClick={() => setModal({ type: 'menu' })} aria-label={t('menu.title')}>☰</button>
    </header>
  )
}
