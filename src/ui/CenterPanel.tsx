// Centro del tablero: solo los dados, en 3D.
// Al tirar, cada dado da varias vueltas en el aire y frena hasta quedar con la cara que ha salido.
import { useEffect, useMemo, useRef } from 'react'
import { useGame } from '../store/gameStore'
import { ActionBar } from './ActionBar'
import { AnimatedMoney } from './MoneyFx'
import { TokenIcon } from './Token'
import { useT } from './useT'

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[27, 27], [73, 73]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[27, 27], [73, 27], [27, 73], [73, 73]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[27, 22], [73, 22], [27, 50], [73, 50], [27, 78], [73, 78]],
}

/**
 * Posición de cada cara en el cubo (dado real: caras opuestas suman 7)
 * y giro que la deja mirando al frente.
 */
const FACES: { value: number; place: string; show: [number, number] }[] = [
  { value: 1, place: 'rotateY(0deg)', show: [0, 0] },
  { value: 6, place: 'rotateY(180deg)', show: [0, 180] },
  { value: 2, place: 'rotateY(90deg)', show: [0, -90] },
  { value: 5, place: 'rotateY(-90deg)', show: [0, 90] },
  { value: 3, place: 'rotateX(90deg)', show: [-90, 0] },
  { value: 4, place: 'rotateX(-90deg)', show: [90, 0] },
]

function Face({ value, place }: { value: number; place: string }) {
  return (
    <>
      {/* Relleno interior: tapa el hueco de las esquinas redondeadas al girar */}
      <div className="die-fill" style={{ transform: `${place} translateZ(calc(var(--die) / 2 - 2px))` }} />
    <div className="die-face" style={{ transform: `${place} translateZ(calc(var(--die) / 2))` }}>
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        {PIPS[value].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="9.5" fill={value === 1 ? '#B0442D' : '#1A1A2E'} />
        ))}
      </svg>
    </div>
    </>
  )
}

/** Generador determinista por tirada para que el giro no cambie entre renders */
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function Die3D({ value, seq, index }: { value: number; seq: number; index: number }) {
  const transform = useMemo(() => {
    const [sx, sy] = FACES.find((f) => f.value === value)!.show
    // Vueltas completas acumuladas: cada tirada gira hacia delante, nunca hacia atrás
    const r = (k: number) => rand(seq * 7 + index * 13 + k)
    const turnsX = seq * 3 + 2 + Math.floor(r(1) * 2)
    const turnsY = seq * 3 + 2 + Math.floor(r(2) * 3)
    const turnsZ = seq === 0 ? 0 : 1 + Math.floor(r(3) * 2)
    // Inclinación final leve: se lee bien el número y se nota que es un dado
    const tilt = seq === 0 ? 0 : (r(4) - 0.5) * 8
    // Orden: primero deja la cara al frente (Y, X), luego inclina hacia el jugador y gira en el plano (Z)
    return `rotateZ(${360 * turnsZ + tilt}deg) rotateX(${sx + 360 * turnsX - 7}deg) rotateY(${sy + 360 * turnsY}deg)`
  }, [value, seq, index])

  // El cubo no se vuelve a montar (si no, no habría transición de giro): el salto se lanza a mano
  const hop = useRef<HTMLDivElement>(null)
  const shadow = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (seq === 0) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const dur = index === 0 ? 1000 : 1060
    const dir = index === 0 ? -1 : 1
    hop.current?.animate(
      [
        { transform: 'translate(0, 0)' },
        { transform: `translate(${dir * 10}%, -75%)`, offset: 0.28 },
        { transform: `translate(${dir * -3}%, 0)`, offset: 0.58 },
        { transform: `translate(${dir * -2}%, -16%)`, offset: 0.72 },
        { transform: 'translate(0, 0)', offset: 0.86 },
        { transform: 'translate(0, -4%)', offset: 0.93 },
        { transform: 'translate(0, 0)' },
      ],
      { duration: dur, easing: 'cubic-bezier(.3,.6,.4,1)' },
    )
    shadow.current?.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(.4)', opacity: 0.3, offset: 0.28 },
        { transform: 'scale(1.05)', opacity: 1, offset: 0.58 },
        { transform: 'scale(.8)', opacity: 0.7, offset: 0.72 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: dur, easing: 'cubic-bezier(.3,.6,.4,1)' },
    )
  }, [seq, index])

  return (
    <div className="die-scene" aria-label={String(value)} role="img">
      <div ref={hop} className="die-hop">
        <div className="die-cube" style={{ transform }}>
          {FACES.map((f) => (
            <Face key={f.value} value={f.value} place={f.place} />
          ))}
        </div>
      </div>
      <div ref={shadow} className="die-shadow" />
    </div>
  )
}

function Dice() {
  const dice = useGame((s) => s.game?.dice) ?? null
  const seq = useGame((s) => s.rollSeq)
  const [a, b] = dice ?? [5, 2]
  return (
    <div className="flex items-center justify-center gap-[9%]">
      <Die3D value={a} seq={seq} index={0} />
      <Die3D value={b} seq={seq} index={1} />
    </div>
  )
}

/** En horizontal el centro del tablero hace de panel: jugadores, dados y acciones */
function LandscapeHud() {
  const game = useGame((s) => s.game)!
  const displayMoney = useGame((s) => s.displayMoney)
  const muted = useGame((s) => s.muted)
  const toggleMute = useGame((s) => s.toggleMute)
  const setModal = useGame((s) => s.setModal)
  const t = useT()
  const qm = game.quickMode
  const btn = 'grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/90 text-sm font-bold text-mar-deep ring-1 ring-ink/15'
  return (
    <div className="flex h-full flex-col justify-between gap-1 p-[1.2%] text-[12px]">
      <div className="flex items-start gap-1.5">
        <ul className="flex min-w-0 flex-1 flex-wrap gap-1">
          {game.players.map((p, i) => {
            const active = i === game.current && game.phase !== 'gameOver'
            return (
              <li
                key={p.id}
                className={`flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 ${active ? 'bg-white shadow ring-2 ring-ink' : 'bg-white/70'} ${p.bankrupt ? 'opacity-40' : ''}`}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full text-white" style={{ background: p.color }}>
                  <TokenIcon token={p.token} className="h-3.5 w-3.5" />
                </span>
                <span className="max-w-[5.5em] truncate font-semibold">{p.name}</span>
                <AnimatedMoney value={displayMoney[p.id] ?? p.money} className="font-display font-bold" />
              </li>
            )
          })}
        </ul>
        <span className="whitespace-nowrap pt-1.5 text-[11px] opacity-70">
          {qm.type === 'rounds' ? t('ui.roundOf', { n: Math.min(game.round, qm.limit), max: qm.limit }) : t('ui.round', { n: game.round })}
        </span>
        <button type="button" className={btn} onClick={() => setModal({ type: 'panels' })} aria-label={t('tabs.players')}>👥</button>
        <button type="button" className={btn} onClick={toggleMute} aria-pressed={!muted} aria-label={muted ? t('ui.unmute') : t('ui.mute')}>
          {muted ? '🔇' : '🔊'}
        </button>
        <button type="button" className={btn} onClick={() => setModal({ type: 'help' })} aria-label={t('ui.help')}>?</button>
        <button type="button" className={btn} onClick={() => setModal({ type: 'menu' })} aria-label={t('menu.title')}>☰</button>
      </div>
      <Dice />
      <div className="hud-actions mx-auto w-full max-w-md">
        <ActionBar />
      </div>
    </div>
  )
}

export function CenterPanel({ wide = false }: { wide?: boolean }) {
  if (wide) return <LandscapeHud />
  return (
    <div className="flex h-full items-center justify-center">
      <Dice />
    </div>
  )
}
