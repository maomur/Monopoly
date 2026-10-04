// Efectos de dinero: monedas que vuelan de quien paga a quien cobra (o a la banca),
// etiquetas +/−, y cifras que cuentan hacia el nuevo valor.
import { useEffect, useRef, useState } from 'react'
import { useGame, type MoneyFx } from '../store/gameStore'

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function centerOf(el: Element | null): { x: number; y: number } | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/** Punto de pantalla de un jugador (su ficha) o de la banca (centro del tablero) */
function anchor(playerId: string | null): { x: number; y: number } {
  const el = playerId ? document.querySelector(`[data-token="${playerId}"]`) : null
  const board = document.querySelector('.board-grid')
  return centerOf(el) ?? centerOf(board) ?? { x: innerWidth / 2, y: innerHeight / 2 }
}

function floatLabel(layer: HTMLElement, x: number, y: number, text: string, positive: boolean) {
  const el = document.createElement('div')
  el.className = `money-label ${positive ? 'money-label--in' : 'money-label--out'}`
  el.textContent = text
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  layer.appendChild(el)
  const anim = el.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
      { transform: 'translate(-50%, -110%) scale(1.15)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%, -230%) scale(1)', opacity: 0 },
    ],
    { duration: 1300, easing: 'cubic-bezier(.2,.7,.3,1)' },
  )
  anim.onfinish = () => el.remove()
}

function burst(layer: HTMLElement, x: number, y: number) {
  const ring = document.createElement('div')
  ring.className = 'money-ring'
  ring.style.left = `${x}px`
  ring.style.top = `${y}px`
  layer.appendChild(ring)
  const anim = ring.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0.9 },
      { transform: 'translate(-50%, -50%) scale(2.4)', opacity: 0 },
    ],
    { duration: 650, easing: 'ease-out' },
  )
  anim.onfinish = () => ring.remove()
}

const fmt = (n: number) => `${n.toLocaleString('es-ES', { useGrouping: 'always' } as Intl.NumberFormatOptions)} €`

function launch(layer: HTMLElement, fx: MoneyFx) {
  const from = anchor(fx.fromId)
  const to = anchor(fx.toId)
  // Quien paga ve el "−", quien cobra el "+" (la banca no muestra etiqueta)
  if (fx.fromId) floatLabel(layer, from.x, from.y - 10, `−${fmt(fx.amount)}`, false)
  if (reduceMotion()) {
    if (fx.toId) floatLabel(layer, to.x, to.y - 10, `+${fmt(fx.amount)}`, true)
    return
  }
  const coins = Math.max(3, Math.min(10, Math.ceil(fx.amount / 40)))
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  const lift = Math.min(170, 60 + dist * 0.45)
  for (let i = 0; i < coins; i++) {
    const coin = document.createElement('div')
    coin.className = 'money-coin'
    coin.textContent = '€'
    layer.appendChild(coin)
    // Curva cuadrática con algo de dispersión para que no vayan en fila
    const spread = (i - coins / 2) * 9
    const cx = from.x + dx / 2 + spread
    const cy = Math.min(from.y, to.y) - lift - Math.abs(spread)
    const frames: Keyframe[] = []
    const N = 12
    for (let k = 0; k <= N; k++) {
      const t = k / N
      const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * cx + t * t * to.x
      const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * cy + t * t * to.y
      const scale = k === 0 ? 0.2 : k === N ? 0.55 : 1 + 0.35 * Math.sin(Math.PI * t)
      frames.push({
        transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scale}) rotateY(${t * 720}deg)`,
        opacity: k === N ? 0.2 : 1,
      })
    }
    const anim = coin.animate(frames, {
      duration: 900 + Math.min(300, dist * 0.4),
      delay: i * 70,
      easing: 'cubic-bezier(.45,.05,.4,1)',
      fill: 'backwards',
    })
    anim.onfinish = () => {
      coin.remove()
      if (i === 0) burst(layer, to.x, to.y)
      if (i === coins - 1 && fx.toId) floatLabel(layer, to.x, to.y - 10, `+${fmt(fx.amount)}`, true)
    }
  }
}

/** Capa fija donde vuelan las monedas */
export function MoneyLayer() {
  const moneyFx = useGame((s) => s.moneyFx)
  const layer = useRef<HTMLDivElement>(null)
  const launched = useRef(new Set<number>())
  useEffect(() => {
    if (!layer.current) return
    for (const fx of moneyFx) {
      if (launched.current.has(fx.id)) continue
      launched.current.add(fx.id)
      launch(layer.current, fx)
    }
  }, [moneyFx])
  return <div ref={layer} className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden="true" />
}

/** Cifra que cuenta hasta el nuevo valor y destella verde (cobra) o rojo (paga) */
export function AnimatedMoney({ value, className = '' }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (from === value) return
    setFlash(value > from ? 'up' : 'down')
    if (reduceMotion()) {
      setShown(value)
      return
    }
    const start = performance.now()
    const dur = 700
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(from + (value - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const off = setTimeout(() => setFlash(null), 900)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(off)
      setShown(value)
    }
  }, [value])
  return (
    <span
      key={flash ?? 'idle'}
      className={`tabular-nums ${flash === 'up' ? 'money-flash-up' : flash === 'down' ? 'money-flash-down' : ''} ${className}`}
    >
      {fmt(shown)}
    </span>
  )
}
