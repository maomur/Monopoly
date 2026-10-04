import { useEffect, useRef, useState } from 'react'
import { BOARD, GROUP_COLORS, HOTEL } from '../engine/board'
import type { GameState } from '../engine/state'
import { useGame } from '../store/gameStore'
import { CenterPanel } from './CenterPanel'
import { tileName, tileShort } from './format'
import { TileGlyph, glyphFor } from './TileGlyph'
import { TokenIcon } from './Token'
import { useLandscape } from './useLandscape'
import { isOwnable } from '../engine/types'

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

// Banda de color del grupo: siempre en el lado que mira al centro del tablero.
// El puntito del dueño va en la esquina exterior, lejos de la banda.
const BAND = {
  bottom: { band: 'top-0 inset-x-0 h-[26%]', pad: 'pt-[28%]', dot: 'bottom-[5%] right-[6%]', dots: 'flex-row' },
  top: { band: 'bottom-0 inset-x-0 h-[26%]', pad: 'pb-[28%]', dot: 'top-[5%] right-[6%]', dots: 'flex-row' },
  left: { band: 'right-0 inset-y-0 w-[16%]', pad: 'pr-[17%]', dot: 'bottom-[7%] left-[4%]', dots: 'flex-col' },
  right: { band: 'left-0 inset-y-0 w-[16%]', pad: 'pl-[17%]', dot: 'bottom-[7%] right-[4%]', dots: 'flex-col' },
}

// Esquinas: un tono propio y un icono grande
const CORNER_TINT: Record<string, string> = {
  go: 'bg-[#FFE7A3] text-[#5A4200]',
  jail: 'bg-[#F6D8CF] text-[#7A2A17]',
  parking: 'bg-[#D6ECDD] text-[#1F5A36]',
  goToJail: 'bg-[#D7E4F4] text-[#123E73]',
}

function Cell({ game, index, current, landing }: { game: GameState; index: number; current: boolean; landing: boolean }) {
  const lang = useGame((s) => s.lang)
  const setModal = useGame((s) => s.setModal)
  const t = BOARD[index]
  const { row, col, side } = cellOf(index)
  const own = game.ownership[index]
  const owner = own?.owner ? game.players.find((p) => p.id === own.owner) : null
  const corner = t.kind === 'go' || t.kind === 'jail' || t.kind === 'parking' || t.kind === 'goToJail'
  const glyph = glyphFor(index)
  const geo = BAND[side]
  const showPrice = isOwnable(t) && !owner
  // En los laterales las casillas son bajas: icono a la izquierda del texto
  const sideways = !corner && !!glyph && (side === 'left' || side === 'right')

  return (
    <button
      type="button"
      data-tile={index}
      onClick={() => setModal({ type: 'tile', index })}
      aria-label={tileName(lang, index)}
      className={`tile relative text-ink ${landing ? 'tile-land' : ''} ${current ? 'tile-current' : ''}`}
      style={{ gridRow: row + 1, gridColumn: col + 1 }}
    >
      <span
        className={[
          'tile-block absolute flex flex-col items-center justify-center overflow-hidden text-center leading-[1.05]',
          corner ? `${CORNER_TINT[t.kind]} gap-[0.25em] font-display font-semibold` : 'bg-white gap-[0.15em]',
          t.kind === 'property' ? geo.pad : '',
          own?.mortgaged ? 'tile-mortgaged' : '',
        ].join(' ')}
      >
        {t.kind === 'property' && (
          <span className={`absolute ${geo.band} flex items-center justify-center gap-[6%] ${geo.dots}`} style={{ background: GROUP_COLORS[t.group].bg }}>
            {own && own.houses > 0 && own.houses < HOTEL &&
              Array.from({ length: own.houses }, (_, k) => <span key={k} className="tile-house" />)}
            {own?.houses === HOTEL && <span className="tile-hotel" />}
          </span>
        )}
        {owner && (
          <span
            className={`tile-owner absolute ${geo.dot} rounded-full border border-white`}
            style={{ background: owner.color }}
            aria-hidden="true"
          />
        )}

        <span className={`relative flex w-full items-center justify-center ${sideways ? 'flex-row gap-[0.35em]' : 'flex-col gap-[0.15em]'}`}>
          {glyph && <TileGlyph name={glyph} className={corner ? 'h-[2.6em] w-[2.6em]' : sideways ? 'h-[1.5em] w-[1.5em] shrink-0 text-mar-deep' : 'h-[1.9em] w-[1.9em] shrink-0 text-mar-deep'} />}
          <span className={`flex min-w-0 flex-col items-center ${sideways ? 'flex-1' : 'w-full'}`}>
            <span className={`w-full px-[3%] ${showPrice ? 'line-clamp-2' : 'line-clamp-3'} ${corner ? 'text-[1.05em]' : ''}`}>{tileShort(lang, index)}</span>
            {showPrice && isOwnable(t) && <span className="tile-price tabular-nums">{t.price} €</span>}
          </span>
        </span>
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
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let raf = 0
    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const w = Math.round(el.clientWidth)
        const h = Math.round(el.clientHeight)
        setSize((prev) => (Math.abs(prev.w - w) >= 2 || Math.abs(prev.h - h) >= 2 ? { w, h } : prev))
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
  // En horizontal el tablero es apaisado (casi todo el ancho): la escala la marca el lado corto
  const wide = useLandscape()
  const bw = wide ? Math.min(size.w, size.h) : size.w
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
      className={`board-scroller relative mx-auto ${wide ? 'h-full w-full' : 'aspect-square w-full'} ${zoom ? 'overflow-auto' : 'overflow-hidden'}`}
      style={{ ['--bw' as string]: `${bw || 375}px` }}
    >
      <div
        className={`relative ${wide ? 'h-full' : 'aspect-square'}`}
        style={{
          width: zoom ? '210%' : '100%',
          fontSize: wide ? clampPx(6, bw * 0.023, 12) : zoom ? clampPx(9, bw * 0.034, 14) : clampPx(6, bw * 0.017, 13),
        }}
      >
        <div
          className="board-grid absolute inset-0 grid"
          style={{
            gridTemplateColumns: '1.5fr repeat(9, 1fr) 1.5fr',
            gridTemplateRows: '1.5fr repeat(9, 1fr) 1.5fr',
          }}
        >
          {BOARD.map((t) => (
            <Cell key={t.index} game={game} index={t.index} current={t.index === focusPos} landing={landingAt?.tile === t.index} />
          ))}
          <div className="plaza relative overflow-hidden" style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}>
            <CenterPanel wide={wide} />
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
                  ['--tok' as string]: zoom ? '6%' : `${(bw || 375) * 0.062}px`,
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
