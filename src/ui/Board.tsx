import { useEffect, useRef, useState } from 'react'
import { BOARD, GROUP_COLORS, HOTEL } from '../engine/board'
import type { GameState } from '../engine/state'
import { useGame } from '../store/gameStore'
import { CenterPanel } from './CenterPanel'
import { tileName, tileShort } from './format'
import { TokenIcon } from './Token'

// Geometría: 11×11, esquinas 1,5 veces más grandes. Unidades totales por lado: 12.
const UNITS = 12
function colStart(c: number) {
  return c === 0 ? 0 : c === 10 ? 10.5 : 1.5 + (c - 1)
}
function colSize(c: number) {
  return c === 0 || c === 10 ? 1.5 : 1
}

/** Fila y columna (0–10) de cada casilla; la SALIDA abajo a la derecha, sentido horario */
export function cellOf(i: number): { row: number; col: number; side: 'bottom' | 'left' | 'top' | 'right' } {
  if (i <= 10) return { row: 10, col: 10 - i, side: 'bottom' }
  if (i <= 20) return { row: 10 - (i - 10), col: 0, side: 'left' }
  if (i <= 30) return { row: 0, col: i - 20, side: 'top' }
  return { row: i - 30, col: 10, side: 'right' }
}

function centerPct(i: number): { x: number; y: number } {
  const { row, col } = cellOf(i)
  return {
    x: ((colStart(col) + colSize(col) / 2) / UNITS) * 100,
    y: ((colStart(row) + colSize(row) / 2) / UNITS) * 100,
  }
}

const BAR_CLASS = {
  bottom: 'top-0 left-0 right-0 h-[22%]',
  top: 'bottom-0 left-0 right-0 h-[22%]',
  left: 'right-0 top-0 bottom-0 w-[22%]',
  right: 'left-0 top-0 bottom-0 w-[22%]',
}

function Cell({ game, index, current, landing }: { game: GameState; index: number; current: boolean; landing: boolean }) {
  const lang = useGame((s) => s.lang)
  const setModal = useGame((s) => s.setModal)
  const t = BOARD[index]
  const { row, col, side } = cellOf(index)
  const own = game.ownership[index]
  const owner = own?.owner ? game.players.find((p) => p.id === own.owner) : null
  const corner = t.kind === 'go' || t.kind === 'jail' || t.kind === 'parking' || t.kind === 'goToJail'

  return (
    <button
      type="button"
      data-tile={index}
      onClick={() => setModal({ type: 'tile', index })}
      aria-label={tileName(lang, index)}
      className={[
        'relative overflow-hidden border border-ink/25 bg-white text-ink',
        'flex items-center justify-center p-[2px] text-center leading-[1.05]',
        corner ? 'bg-sol/40 font-bold' : '',
        current ? 'ring-2 ring-inset ring-terracota' : '',
        landing ? 'tile-land' : '',
        own?.mortgaged ? 'opacity-55' : '',
      ].join(' ')}
      style={{ gridRow: row + 1, gridColumn: col + 1 }}
    >
      {t.kind === 'property' && (
        <span className={`absolute ${BAR_CLASS[side]}`} style={{ background: GROUP_COLORS[t.group].bg }} />
      )}
      {owner && (
        <span
          className="absolute bottom-[2px] right-[2px] h-[18%] w-[18%] min-h-1.5 min-w-1.5 rounded-full border border-white"
          style={{ background: owner.color }}
        />
      )}
      {own && own.houses > 0 && (
        <span className="absolute left-[2px] bottom-[2px] flex gap-[1px]">
          {own.houses === HOTEL ? (
            <span className="block h-[6px] w-[10px] rounded-[1px] bg-[#D7263D] ring-1 ring-white" />
          ) : (
            Array.from({ length: own.houses }, (_, k) => (
              <span key={k} className="block h-[5px] w-[5px] rounded-[1px] bg-olivo ring-1 ring-white" />
            ))
          )}
        </span>
      )}
      <span className="board-label relative z-[1] line-clamp-3">
        {tileShort(lang, index)}
      </span>
    </button>
  )
}

export function Board() {
  const game = useGame((s) => s.game)!
  const displayPos = useGame((s) => s.displayPos)
  const zoom = useGame((s) => s.zoom)
  const landingAt = useGame((s) => s.landingAt)
  const scroller = useRef<HTMLDivElement>(null)
  // Ancho del tablero en px, medido una vez por cambio real (sin consultas de contenedor:
  // en Safari provocaban recálculos en bucle al girar el móvil)
  const [bw, setBw] = useState(0)
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let raf = 0
    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const w = Math.round(el.clientWidth)
        setBw((prev) => (Math.abs(prev - w) >= 2 ? w : prev))
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])
  // En horizontal no hay botón de zoom: si venía activado desde vertical, se quita
  const toggleZoom = useGame((s) => s.toggleZoom)
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape) and (max-height: 600px)')
    const check = () => {
      if (mq.matches && useGame.getState().zoom) toggleZoom()
    }
    check()
    mq.addEventListener('change', check)
    return () => mq.removeEventListener('change', check)
  }, [toggleZoom])
  const clampPx = (min: number, v: number, max: number) => `${Math.max(min, Math.min(max, v))}px`
  const current = game.players[game.current]
  const focusPos = displayPos[game.current] ?? current.position

  // Con zoom, seguir a la ficha del jugador en turno
  useEffect(() => {
    const el = scroller.current
    if (!el || !zoom) return
    const { x, y } = centerPct(focusPos)
    const inner = el.firstElementChild as HTMLElement
    el.scrollTo({
      left: (x / 100) * inner.offsetWidth - el.clientWidth / 2,
      top: (y / 100) * inner.offsetHeight - el.clientHeight / 2,
      behavior: 'smooth',
    })
  }, [focusPos, zoom])

  // Agrupar fichas por casilla para desplazarlas si coinciden
  const byTile: Record<number, number[]> = {}
  game.players.forEach((p, i) => {
    if (p.bankrupt) return
    const pos = displayPos[i] ?? p.position
    ;(byTile[pos] ??= []).push(i)
  })

  return (
    <div
      ref={scroller}
      className={`board-scroller relative mx-auto aspect-square w-full ${zoom ? 'overflow-auto' : 'overflow-hidden'}`}
      style={{ ['--bw' as string]: `${bw || 375}px` }}
    >
      <div
        className="relative aspect-square"
        style={{ width: zoom ? '210%' : '100%', fontSize: zoom ? clampPx(9, bw * 0.034, 14) : clampPx(6, bw * 0.017, 13) }}
      >
        <div
          className="board-grid absolute inset-0 grid bg-mar"
          style={{
            gridTemplateColumns: '1.5fr repeat(9, 1fr) 1.5fr',
            gridTemplateRows: '1.5fr repeat(9, 1fr) 1.5fr',
          }}
        >
          {BOARD.map((t) => (
            <Cell key={t.index} game={game} index={t.index} current={t.index === focusPos} landing={landingAt?.tile === t.index} />
          ))}
          <div className="overflow-hidden" style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}>
            <CenterPanel />
          </div>
        </div>

        {/* Fichas */}
        {Object.entries(byTile).flatMap(([pos, idxs]) =>
          idxs.map((pi, k) => {
            const p = game.players[pi]
            const { x, y } = centerPct(Number(pos))
            const off = idxs.length > 1 ? (k - (idxs.length - 1) / 2) * 2.2 : 0
            return (
              <div
                key={p.id}
                data-token={p.id}
                className="pointer-events-none absolute z-10 transition-[left,top] duration-[240ms] ease-out"
                style={{
                  left: `calc(${x + off}% - var(--tok) / 2)`,
                  top: `calc(${y + off * 0.6}% - var(--tok) / 2)`,
                  width: 'var(--tok)',
                  height: 'var(--tok)',
                  color: '#fff',
                  ['--tok' as string]: zoom ? '6%' : '6.2%',
                }}
              >
                {/* key = casilla: al cambiar de casilla la animación de salto se repite */}
                <span
                  key={Number(pos)}
                  className={`flex h-full w-full items-center justify-center rounded-full border-2 border-white shadow-md ${
                    landingAt?.playerId === p.id ? 'token-land' : 'token-hop'
                  }`}
                  style={{ background: p.color, outline: pi === game.current ? '2px solid #1A1A2E' : undefined }}
                >
                  <TokenIcon token={p.token} className="h-[78%] w-[78%]" />
                </span>
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
}
