import { BOARD, GROUP_COLORS } from '../engine/board'
import { isOwnable } from '../engine/types'
import { useGame } from '../store/gameStore'
import { logText, tileName } from './format'
import { useT } from './useT'

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
}

export function Die({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow" role="img" aria-label={String(value)}>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#fff" stroke="#1A1A2E" strokeWidth="4" />
      {PIPS[value].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="9" fill="#C8553D" />
      ))}
    </svg>
  )
}

export function CenterPanel() {
  const game = useGame((s) => s.game)!
  const busy = useGame((s) => s.busy)
  const lang = useGame((s) => s.lang)
  const t = useT()
  const p = game.players[game.current]
  // Mientras la ficha se mueve no desvelamos la casilla de destino
  const landed = !busy ? game.lastLanded : null
  const tile = landed !== null ? BOARD[landed] : null
  // Mientras se anima, no adelantamos lo que va a pasar
  const recent = busy ? [] : game.log.slice(-2).reverse()

  return (
    <div className="flex h-full flex-col items-center justify-between gap-[0.4em] bg-arena p-[0.8em] text-center text-[1.15em]">
      <div className="flex w-full items-center justify-center gap-2 font-display font-semibold">
        <span className="inline-block h-[0.9em] w-[0.9em] rounded-full" style={{ background: p.color }} />
        <span className="truncate">{t('ui.turnOf', { name: p.name })}</span>
        <span className="text-[0.8em] font-normal opacity-70">· {t('ui.round', { n: game.round })}</span>
      </div>

      <div className="flex h-[22%] items-center gap-[0.6em]">
        {game.dice ? (
          <>
            <div className="aspect-square h-full"><Die value={game.dice[0]} /></div>
            <div className="aspect-square h-full"><Die value={game.dice[1]} /></div>
          </>
        ) : (
          <span className="font-display text-[1.6em] font-bold text-mar">BCN Tycoon</span>
        )}
      </div>

      {tile ? (
        <div className="w-full max-w-[95%] overflow-hidden rounded-lg border border-ink/20 bg-white shadow-sm">
          {tile.kind === 'property' && (
            <div className="h-[0.6em]" style={{ background: GROUP_COLORS[tile.group].bg }} />
          )}
          <div className="p-[0.4em]">
            <div className="font-display font-semibold leading-tight">{tileName(lang, tile.index)}</div>
            {isOwnable(tile) && (
              <p className="mt-[0.2em] text-[0.82em] leading-snug italic opacity-80 line-clamp-3">
                {t(tile.factKey)}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <ul className="w-full space-y-[0.15em] text-[0.82em] leading-snug" aria-live="polite">
        {recent.map((e) => (
          <li key={e.id} className="line-clamp-2 first:font-semibold last:opacity-60">
            {logText(lang, e)}
          </li>
        ))}
      </ul>
    </div>
  )
}
