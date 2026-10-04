import { useEffect, useState } from 'react'
import { useGame } from '../store/gameStore'
import { useT } from './useT'

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

export function Header() {
  const game = useGame((s) => s.game)!
  const zoom = useGame((s) => s.zoom)
  const toggleZoom = useGame((s) => s.toggleZoom)
  const setModal = useGame((s) => s.setModal)
  const t = useT()
  const qm = game.quickMode
  const iconBtn = 'grid h-10 min-w-10 place-items-center rounded-lg bg-white px-2 font-bold text-mar-deep border-2 border-mar/30'
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 bg-arena/95 px-3 py-2 backdrop-blur">
      <span className="whitespace-nowrap font-display text-lg font-bold text-mar">BCN Tycoon</span>
      <span className="whitespace-nowrap text-sm opacity-80">
        {qm.type === 'rounds' ? t('ui.roundOf', { n: Math.min(game.round, qm.limit), max: qm.limit }) : t('ui.round', { n: game.round })}
      </span>
      <span className="text-sm"><Timer /></span>
      <span className="flex-1" />
      <button type="button" className={`${iconBtn} lg:hidden`} onClick={toggleZoom} aria-pressed={zoom} aria-label={t('ui.zoom')}>
        {zoom ? '−' : '+'}🔍
      </button>
      <button type="button" className={iconBtn} onClick={() => setModal({ type: 'help' })} aria-label={t('ui.help')}>?</button>
      <button type="button" className={iconBtn} onClick={() => setModal({ type: 'menu' })} aria-label={t('menu.title')}>☰</button>
    </header>
  )
}
