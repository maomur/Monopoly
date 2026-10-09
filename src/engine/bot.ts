// IA de los bots, con tres perfiles. Usa exactamente las mismas acciones y validaciones que un humano.
//
//  · Principiante: compra por impulso, puja poco, construye tarde y por lo barato, nunca propone
//    tratos y acepta casi cualquiera (aunque le complete un grupo al rival), paga la Ronda enseguida.
//  · Intermedio:   compra si le sobran 200 €, construye al completar grupo, negocia con prudencia.
//  · Experto:      ajusta su reserva al peligro del tablero, compra y puja fuerte por lo que completa
//                  o bloquea grupos, hipoteca sueltas para edificar, negocia a menudo y duro, y en
//                  partida avanzada se queda en la Ronda para no pagar alquileres.
import type { Action } from './actions'
import { GROUPS } from './board'
import {
  currentPlayer, getPlayer, groupOf, ownableTile, ownsFullGroup, rentFor, tilesOwnedBy, unmortgageCost,
} from './queries'
import type { BotLevel, GameState, TradeOffer } from './state'
import { canBuild, canMortgage, canSell, managerId, minBid } from './validate'

export const BOT_RESERVE = 200
export const TRADE_COOLDOWN_ROUNDS = 4

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

export function levelOf(s: GameState, pid: string): BotLevel {
  return getPlayer(s, pid).botLevel ?? 'intermediate'
}

function tileValue(i: number): number {
  return ownableTile(i).price
}

/** Alquiler más alto que podría tener que pagar ahora mismo (con una tirada media) */
function maxThreat(s: GameState, pid: string): number {
  let max = 0
  for (const [k, own] of Object.entries(s.ownership)) {
    if (!own.owner || own.owner === pid) continue
    max = Math.max(max, rentFor(s, Number(k), 7))
  }
  return max
}

/** Dinero que el bot quiere conservar siempre */
function reserve(s: GameState, pid: string): number {
  switch (levelOf(s, pid)) {
    case 'beginner':
      return 50
    case 'intermediate':
      return BOT_RESERVE
    case 'expert':
      return Math.min(450, Math.max(120, Math.round(maxThreat(s, pid) * 0.5)))
  }
}

/** ¿Esta casilla me completa un grupo? */
function completesMine(s: GameState, pid: string, tile: number): boolean {
  const g = groupOf(tile)
  return !!g && GROUPS[g].every((t) => t === tile || s.ownership[t].owner === pid)
}

/** ¿Un rival tiene todas las demás de este grupo? (comprarla le bloquea) */
function blocksRival(s: GameState, pid: string, tile: number): boolean {
  const g = groupOf(tile)
  if (!g) return false
  const others = GROUPS[g].filter((t) => t !== tile)
  const owner = s.ownership[others[0]].owner
  return !!owner && owner !== pid && others.every((t) => s.ownership[t].owner === owner)
}

/** Casas en propiedades de rivales: indica si la partida está ya "cara" */
function rivalHouses(s: GameState, pid: string): number {
  return Object.values(s.ownership).reduce((n, o) => n + (o.owner && o.owner !== pid ? o.houses : 0), 0)
}

// ─────────────────────────── Comprar y pujar ───────────────────────────

function wantsToBuy(s: GameState, pid: string, tile: number): boolean {
  const p = getPlayer(s, pid)
  const price = ownableTile(tile).price
  switch (levelOf(s, pid)) {
    case 'beginner':
      return p.money - price > 50
    case 'intermediate':
      return p.money - price > BOT_RESERVE
    case 'expert': {
      if (completesMine(s, pid, tile) || blocksRival(s, pid, tile)) return p.money - price > 20
      // Al principio compra casi todo: las propiedades son las que ganan partidas
      const floor = s.round <= 8 ? 60 : reserve(s, pid)
      return p.money - price > floor
    }
  }
}

function auctionLimit(s: GameState, pid: string, tile: number): number {
  const p = getPlayer(s, pid)
  const price = ownableTile(tile).price
  switch (levelOf(s, pid)) {
    case 'beginner':
      return Math.min(Math.round(price * 0.6), p.money - 50)
    case 'intermediate':
      return Math.min(price, p.money - BOT_RESERVE)
    case 'expert': {
      if (completesMine(s, pid, tile)) return Math.min(Math.round(price * 1.8), p.money - 40)
      if (blocksRival(s, pid, tile)) return Math.min(Math.round(price * 1.5), p.money - 80)
      return Math.min(Math.round(price * 1.1), p.money - reserve(s, pid))
    }
  }
}

// ─────────────────────────── Gestionar (construir) ───────────────────────────

/** Rentabilidad de poner una casa: subida de alquiler por euro invertido */
function buildRoi(s: GameState, i: number): number {
  const t = ownableTile(i)
  if (t.kind !== 'property') return 0
  const h = s.ownership[i].houses
  return (t.rents[Math.min(5, h + 1)] - t.rents[h]) / t.houseCost
}

function manage(s: GameState, pid: string): Action | null {
  const level = levelOf(s, pid)
  const p = getPlayer(s, pid)
  const owned = tilesOwnedBy(s, pid)
  const res = reserve(s, pid)

  // Deshipotecar lo que forma parte de un grupo completo (el principiante no se acuerda)
  if (level !== 'beginner') {
    for (const i of owned) {
      if (!s.ownership[i].mortgaged) continue
      const g = groupOf(i)
      const margin = level === 'expert' ? res * 2 + 150 : BOT_RESERVE * 2
      if (g && ownsFullGroup(s, pid, g) && p.money - unmortgageCost(i) > margin) return { type: 'unmortgage', tile: i }
    }
  }

  const buildable = owned.filter((i) => canBuild(s, i).ok)
  const order =
    level === 'beginner'
      ? buildable.sort((a, b) => tileValue(a) - tileValue(b)) // lo barato primero
      : level === 'expert'
        ? buildable.sort((a, b) => buildRoi(s, b) - buildRoi(s, a)) // lo más rentable primero
        : buildable.sort((a, b) => tileValue(b) - tileValue(a))
  const keep = level === 'beginner' ? 600 : level === 'expert' ? res : BOT_RESERVE
  for (const i of order) {
    const t = ownableTile(i)
    if (t.kind === 'property' && p.money - t.houseCost > keep) return { type: 'build', tile: i }
  }

  // Experto: si tiene grupo para edificar pero no llega, hipoteca casillas sueltas para financiarlo
  if (level === 'expert' && order.length) {
    const cheapest = Math.min(...order.map((i) => {
      const t = ownableTile(i)
      return t.kind === 'property' ? t.houseCost : Infinity
    }))
    const loose = owned
      .filter((i) => {
        const g = groupOf(i)
        return canMortgage(s, i).ok && (!g || !ownsFullGroup(s, pid, g)) && !completesMine(s, pid, i)
      })
      .sort((a, b) => tileValue(a) - tileValue(b))
    if (loose.length && p.money < cheapest + res) return { type: 'mortgage', tile: loose[0] }
  }
  return null
}

// ─────────────────────────── Deudas ───────────────────────────

function raiseMoney(s: GameState, pid: string): Action | null {
  const owned = tilesOwnedBy(s, pid)
  const sellable = owned.filter((i) => canSell(s, i).ok).sort((a, b) => tileValue(a) - tileValue(b))
  // El principiante vende casas antes de hipotecar (pierde la mitad de lo invertido)
  if (levelOf(s, pid) === 'beginner' && sellable.length) return { type: 'sell', tile: sellable[0] }
  const loose = owned
    .filter((i) => {
      const g = groupOf(i)
      return canMortgage(s, i).ok && (!g || !ownsFullGroup(s, pid, g))
    })
    .sort((a, b) => tileValue(a) - tileValue(b))
  if (loose.length) return { type: 'mortgage', tile: loose[0] }
  if (sellable.length) return { type: 'sell', tile: sellable[0] }
  const any = owned.filter((i) => canMortgage(s, i).ok).sort((a, b) => tileValue(a) - tileValue(b))
  if (any.length) return { type: 'mortgage', tile: any[0] }
  return null
}

// ─────────────────────────── Negociar ───────────────────────────

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

export function evaluateTrade(s: GameState, t: TradeOffer): boolean {
  const gain = sideValue(t.give)
  const loss = sideValue(t.get)
  const me = t.toId
  if (getPlayer(s, me).money - t.get.money < 0) return false
  const rivalCompletes = completesGroupFor(s, t.fromId, t.get.tiles)
  const iComplete = completesGroupFor(s, me, t.give.tiles)
  switch (levelOf(s, me)) {
    case 'beginner':
      // Se fija solo en el dinero y las casillas: no ve el peligro de dar un grupo
      return gain >= loss * 0.95
    case 'intermediate':
      if (iComplete && gain >= loss * 0.9) return true
      if (rivalCompletes) return gain >= loss * 1.6
      return gain >= loss * 1.15
    case 'expert':
      if (iComplete && rivalCompletes) return gain >= loss * 1.1
      if (iComplete) return gain >= loss * 0.75
      if (rivalCompletes) return gain >= loss * 2.2
      return gain >= loss * 1.25
  }
}

/**
 * Busca un intercambio que le complete un grupo: le falta una sola casilla y la tiene un rival.
 * Ofrece a cambio una casilla que completa un grupo del rival si la tiene; si no, dinero.
 */
function planTrade(s: GameState, pid: string): Action | null {
  const level = levelOf(s, pid)
  if (level === 'beginner') return null
  const p = getPlayer(s, pid)
  const cooldown = level === 'expert' ? 2 : TRADE_COOLDOWN_ROUNDS
  const cashFactor = level === 'expert' ? 1.45 : 1.7
  const groups = Object.entries(GROUPS).sort((a, b) => tileValue(b[1][0]) - tileValue(a[1][0]))
  for (const [, tiles] of groups) {
    const missing = tiles.filter((i) => s.ownership[i].owner !== pid)
    if (missing.length !== 1) continue
    const want = missing[0]
    const rivalId = s.ownership[want].owner
    if (!rivalId || getPlayer(s, rivalId).bankrupt) continue
    if (tiles.some((i) => s.ownership[i].houses > 0)) continue
    const last = s.tradeCooldown[`${pid}>${rivalId}`]
    if (last !== undefined && s.round - last < cooldown) continue

    const swap = tilesOwnedBy(s, pid).find((i) => {
      const g = groupOf(i)
      if (!g || g === groupOf(want)) return false
      if (GROUPS[g].some((t) => s.ownership[t].houses > 0)) return false
      return GROUPS[g].every((t) => t === i || s.ownership[t].owner === rivalId)
    })
    const offer: TradeOffer = {
      fromId: pid,
      toId: rivalId,
      give: { money: 0, tiles: [], jailCards: 0 },
      get: { money: 0, tiles: [want], jailCards: 0 },
    }
    // El experto prefiere pagar en dinero antes que regalarle un grupo al rival
    const useSwap = swap !== undefined && (level !== 'expert' || p.money - tileValue(want) * cashFactor < reserve(s, pid))
    if (useSwap) offer.give.tiles = [swap!]
    else {
      const cash = Math.ceil((tileValue(want) * cashFactor) / 10) * 10
      if (p.money - cash < reserve(s, pid)) continue
      offer.give.money = cash
    }
    return { type: 'proposeTrade', offer }
  }
  return null
}

// ─────────────────────────── La Ronda (cárcel) ───────────────────────────

function jailAction(s: GameState, pid: string): Action {
  const p = getPlayer(s, pid)
  const level = levelOf(s, pid)
  // Experto: con el tablero lleno de casas, mejor quedarse dentro y no pagar alquileres
  if (level === 'expert' && rivalHouses(s, pid) >= 8) return { type: 'roll' }
  if (p.jailFreeCards.length > 0) return { type: 'useJailCard' }
  const payIf = level === 'beginner' ? 50 : level === 'expert' ? 50 + reserve(s, pid) : 50 + BOT_RESERVE * 2
  if (p.money >= payIf) return { type: 'payJail' }
  return { type: 'roll' }
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
      const limit = auctionLimit(s, pid, a.tile)
      const min = minBid(s)
      if (min <= limit) {
        const bid = Math.min(limit, Math.ceil(min / 10) * 10)
        return { type: 'bid', playerId: pid, amount: Math.max(bid, min) }
      }
      return { type: 'passBid', playerId: pid }
    }

    case 'trade':
      return evaluateTrade(s, s.trade!) ? { type: 'acceptTrade' } : { type: 'rejectTrade' }

    case 'awaitBuy':
      return wantsToBuy(s, pid, p.position) ? { type: 'buy' } : { type: 'decline' }

    case 'awaitRoll':
      if (p.inJail) return jailAction(s, pid)
      return manage(s, pid) ?? planTrade(s, pid) ?? { type: 'roll' }

    case 'awaitEndTurn':
      return manage(s, pid) ?? { type: 'endTurn' }

    default:
      return null
  }
}
