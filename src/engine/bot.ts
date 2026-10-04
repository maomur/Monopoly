// IA sencilla. Usa exactamente las mismas acciones y validaciones que un humano.
//  - Compra si después le sobran más de 200 €
//  - Construye cuando completa un grupo (manteniendo una reserva)
//  - Hipoteca / vende para no quebrar
import type { Action } from './actions'
import { GROUPS } from './board'
import {
  currentPlayer, getPlayer, groupOf, ownableTile, ownsFullGroup, tilesOwnedBy, unmortgageCost,
} from './queries'
import type { GameState, TradeOffer } from './state'
import { canBuild, canMortgage, canSell, managerId, minBid } from './validate'

export const BOT_RESERVE = 200

/** Jugador que tiene que actuar ahora (quien pulsa el siguiente botón) */
export function actorId(s: GameState): string | null {
  switch (s.phase) {
    case 'gameOver':
      return null
    case 'auction':
      return s.auction ? s.auction.bidders[s.auction.turn] ?? null : null
    case 'trade':
      return s.trade?.toId ?? null
    case 'debt':
      return s.debts[0]?.debtorId ?? null
    default:
      return currentPlayer(s).id
  }
}

function tileValue(i: number): number {
  return ownableTile(i).price
}

/** Acción de gestión (construir / deshipotecar) si conviene; null si no hay nada que hacer */
function manage(s: GameState, pid: string): Action | null {
  const p = getPlayer(s, pid)
  const owned = tilesOwnedBy(s, pid)

  // Deshipotecar primero lo que forma parte de un grupo completo
  for (const i of owned) {
    const own = s.ownership[i]
    if (!own.mortgaged) continue
    const g = groupOf(i)
    if (g && ownsFullGroup(s, pid, g) && p.money - unmortgageCost(i) > BOT_RESERVE * 2) {
      return { type: 'unmortgage', tile: i }
    }
  }

  // Construir en grupos completos, empezando por los más caros
  const candidates = owned
    .filter((i) => canBuild(s, i).ok)
    .sort((a, b) => tileValue(b) - tileValue(a))
  for (const i of candidates) {
    const t = ownableTile(i)
    if (t.kind === 'property' && p.money - t.houseCost > BOT_RESERVE) return { type: 'build', tile: i }
  }
  return null
}

/** Cómo reunir dinero: vender edificios y luego hipotecar lo menos valioso */
function raiseMoney(s: GameState, pid: string): Action | null {
  const owned = tilesOwnedBy(s, pid)
  // 1) Hipotecar propiedades sueltas (sin grupo completo) y transportes/servicios
  const loose = owned
    .filter((i) => {
      const g = groupOf(i)
      return canMortgage(s, i).ok && (!g || !ownsFullGroup(s, pid, g))
    })
    .sort((a, b) => tileValue(a) - tileValue(b))
  if (loose.length) return { type: 'mortgage', tile: loose[0] }
  // 2) Vender edificios
  const sellable = owned.filter((i) => canSell(s, i).ok).sort((a, b) => tileValue(a) - tileValue(b))
  if (sellable.length) return { type: 'sell', tile: sellable[0] }
  // 3) Hipotecar cualquier cosa
  const any = owned.filter((i) => canMortgage(s, i).ok).sort((a, b) => tileValue(a) - tileValue(b))
  if (any.length) return { type: 'mortgage', tile: any[0] }
  return null
}

function sideValue(side: TradeOffer['give']): number {
  return side.money + side.tiles.reduce((a, i) => a + tileValue(i), 0) + side.jailCards * 50
}

function completesGroupFor(s: GameState, pid: string, incoming: number[]): boolean {
  return incoming.some((i) => {
    const g = groupOf(i)
    if (!g) return false
    return GROUPS[g].every((t) => incoming.includes(t) || s.ownership[t].owner === pid)
  })
}

function evaluateTrade(s: GameState, t: TradeOffer): boolean {
  const gain = sideValue(t.give)
  const loss = sideValue(t.get)
  const me = t.toId
  // No regala grupos completos al rival salvo con mucha prima
  const rivalCompletes = completesGroupFor(s, t.fromId, t.get.tiles)
  const iComplete = completesGroupFor(s, me, t.give.tiles)
  if (getPlayer(s, me).money - t.get.money < 0) return false
  if (iComplete && gain >= loss * 0.9) return true
  if (rivalCompletes) return gain >= loss * 1.6
  return gain >= loss * 1.15
}

export const TRADE_COOLDOWN_ROUNDS = 4

/**
 * Busca un intercambio que le complete un grupo: le falta una sola casilla y la tiene un rival.
 * Si puede, ofrece a cambio una casilla que completa un grupo del rival; si no, dinero.
 */
function planTrade(s: GameState, pid: string): Action | null {
  const p = getPlayer(s, pid)
  const groups = Object.entries(GROUPS).sort((a, b) => tileValue(b[1][0]) - tileValue(a[1][0]))
  for (const [, tiles] of groups) {
    const missing = tiles.filter((i) => s.ownership[i].owner !== pid)
    if (missing.length !== 1) continue
    const want = missing[0]
    const rivalId = s.ownership[want].owner
    if (!rivalId || getPlayer(s, rivalId).bankrupt) continue
    if (tiles.some((i) => s.ownership[i].houses > 0)) continue
    const last = s.tradeCooldown[`${pid}>${rivalId}`]
    if (last !== undefined && s.round - last < TRADE_COOLDOWN_ROUNDS) continue

    // ¿Tengo yo la casilla que le falta al rival para un grupo suyo?
    const swap = tilesOwnedBy(s, pid).find((i) => {
      const g = groupOf(i)
      if (!g || g === groupOf(want)) return false
      if (GROUPS[g].some((t) => s.ownership[t].houses > 0)) return false
      return GROUPS[g].every((t) => t === i || s.ownership[t].owner === rivalId)
    })
    const offer: TradeOffer = {
      fromId: pid,
      toId: rivalId,
      give: { money: 0, tiles: swap !== undefined ? [swap] : [], jailCards: 0 },
      get: { money: 0, tiles: [want], jailCards: 0 },
    }
    if (swap === undefined) {
      const cash = Math.ceil((tileValue(want) * 1.7) / 10) * 10
      if (p.money - cash < BOT_RESERVE) continue
      offer.give.money = cash
    }
    return { type: 'proposeTrade', offer }
  }
  return null
}

/** Decide la siguiente acción del bot que tiene que actuar. Siempre devuelve una acción válida. */
export function decideBot(s: GameState): Action | null {
  const pid = actorId(s)
  if (!pid) return null
  const p = getPlayer(s, pid)

  switch (s.phase) {
    case 'debt': {
      const d = s.debts[0]
      if (p.money >= d.amount) return { type: 'payDebt' }
      return raiseMoney(s, managerId(s)) ?? { type: 'bankrupt' }
    }

    case 'auction': {
      const a = s.auction!
      const t = ownableTile(a.tile)
      const limit = Math.min(t.price, p.money - BOT_RESERVE)
      const min = minBid(s)
      if (min <= limit) {
        const bid = Math.min(limit, Math.ceil(min / 10) * 10)
        return { type: 'bid', playerId: pid, amount: Math.max(bid, min) }
      }
      return { type: 'passBid', playerId: pid }
    }

    case 'trade':
      return evaluateTrade(s, s.trade!) ? { type: 'acceptTrade' } : { type: 'rejectTrade' }

    case 'awaitBuy': {
      const t = ownableTile(p.position)
      return p.money - t.price > BOT_RESERVE ? { type: 'buy' } : { type: 'decline' }
    }

    case 'awaitRoll': {
      if (p.inJail) {
        if (p.jailFreeCards.length > 0) return { type: 'useJailCard' }
        if (p.money >= 50 + BOT_RESERVE * 2) return { type: 'payJail' }
        return { type: 'roll' }
      }
      return manage(s, pid) ?? planTrade(s, pid) ?? { type: 'roll' }
    }

    case 'awaitEndTurn':
      return manage(s, pid) ?? { type: 'endTurn' }

    default:
      return null
  }
}
