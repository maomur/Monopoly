// Validación de acciones. Devuelve un motivo (clave i18n) cuando no se puede,
// que la UI usa para el tooltip de los botones deshabilitados.
import type { Action } from './actions'
import { GROUPS, HOTEL, JAIL_FINE, MIN_FIRST_BID } from './board'
import {
  currentPlayer, getPlayer, groupHasBuildings, ownableTile, ownsFullGroup, unmortgageCost,
} from './queries'
import type { GameState, TradeOffer } from './state'

export type Check = { ok: true } | { ok: false; reason: string; vars?: Record<string, string | number> }

const OK: Check = { ok: true }
const no = (reason: string, vars?: Record<string, string | number>): Check => ({ ok: false, reason, vars })

/** Jugador que gestiona propiedades ahora: el deudor si hay deuda, si no el del turno */
export function managerId(s: GameState): string {
  if (s.phase === 'debt' && s.debts.length > 0) return s.debts[0].debtorId
  return currentPlayer(s).id
}

const MANAGE_PHASES = ['awaitRoll', 'awaitEndTurn', 'awaitBuy', 'debt'] as const

function canManage(s: GameState): boolean {
  return (MANAGE_PHASES as readonly string[]).includes(s.phase)
}

export function canBuild(s: GameState, tile: number): Check {
  if (!canManage(s) || s.phase === 'debt') return no('reason.wrongPhase')
  const t = ownableTile(tile)
  if (t.kind !== 'property') return no('reason.notProperty')
  const pid = managerId(s)
  const own = s.ownership[tile]
  if (own.owner !== pid) return no('reason.notOwner')
  if (!ownsFullGroup(s, pid, t.group)) return no('reason.needGroup')
  const group = GROUPS[t.group]
  if (group.some((i) => s.ownership[i].mortgaged)) return no('reason.groupMortgaged')
  if (own.houses >= HOTEL) return no('reason.maxBuildings')
  const min = Math.min(...group.map((i) => s.ownership[i].houses))
  if (own.houses > min) return no('reason.unevenBuild')
  if (getPlayer(s, pid).money < t.houseCost) return no('reason.noMoney', { amount: t.houseCost })
  return OK
}

export function canSell(s: GameState, tile: number): Check {
  if (!canManage(s)) return no('reason.wrongPhase')
  const t = ownableTile(tile)
  if (t.kind !== 'property') return no('reason.notProperty')
  const own = s.ownership[tile]
  if (own.owner !== managerId(s)) return no('reason.notOwner')
  if (own.houses === 0) return no('reason.noBuildings')
  const max = Math.max(...GROUPS[t.group].map((i) => s.ownership[i].houses))
  if (own.houses < max) return no('reason.unevenSell')
  return OK
}

export function canMortgage(s: GameState, tile: number): Check {
  if (!canManage(s)) return no('reason.wrongPhase')
  const t = ownableTile(tile)
  const own = s.ownership[tile]
  if (own.owner !== managerId(s)) return no('reason.notOwner')
  if (own.mortgaged) return no('reason.mortgaged')
  if (t.kind === 'property' && groupHasBuildings(s, t.group)) return no('reason.hasBuildingsInGroup')
  return OK
}

export function canUnmortgage(s: GameState, tile: number): Check {
  if (!canManage(s) || s.phase === 'debt') return no('reason.wrongPhase')
  const own = s.ownership[tile]
  if (own.owner !== managerId(s)) return no('reason.notOwner')
  if (!own.mortgaged) return no('reason.notMortgaged')
  const cost = unmortgageCost(tile)
  if (getPlayer(s, managerId(s)).money < cost) return no('reason.noMoney', { amount: cost })
  return OK
}

export function canRoll(s: GameState): Check {
  if (s.phase !== 'awaitRoll') {
    if (s.phase === 'awaitBuy') return no('reason.decideBuy')
    if (s.phase === 'debt') return no('reason.inDebt')
    return no('reason.alreadyRolled')
  }
  return OK
}

export function canPayJail(s: GameState): Check {
  const p = currentPlayer(s)
  if (s.phase !== 'awaitRoll') return no('reason.wrongPhase')
  if (!p.inJail) return no('reason.notInJail')
  if (p.money < JAIL_FINE) return no('reason.noMoney', { amount: JAIL_FINE })
  return OK
}

export function canUseJailCard(s: GameState): Check {
  const p = currentPlayer(s)
  if (s.phase !== 'awaitRoll') return no('reason.wrongPhase')
  if (!p.inJail) return no('reason.notInJail')
  if (p.jailFreeCards.length === 0) return no('reason.noJailCard')
  return OK
}

export function canBuy(s: GameState): Check {
  if (s.phase !== 'awaitBuy') return no('reason.wrongPhase')
  const p = currentPlayer(s)
  const t = ownableTile(p.position)
  if (p.money < t.price) return no('reason.noMoney', { amount: t.price })
  return OK
}

export function minBid(s: GameState): number {
  if (!s.auction) return MIN_FIRST_BID
  return s.auction.highestBidder ? s.auction.highestBid + 1 : MIN_FIRST_BID
}

export function canBid(s: GameState, playerId: string, amount: number): Check {
  const a = s.auction
  if (s.phase !== 'auction' || !a) return no('reason.wrongPhase')
  if (a.bidders[a.turn] !== playerId) return no('reason.notYourTurn')
  if (!Number.isInteger(amount) || amount < minBid(s)) return no('reason.bidTooLow', { amount: minBid(s) })
  if (getPlayer(s, playerId).money < amount) return no('reason.noMoney', { amount })
  return OK
}

export function canPassBid(s: GameState, playerId: string): Check {
  const a = s.auction
  if (s.phase !== 'auction' || !a) return no('reason.wrongPhase')
  if (a.bidders[a.turn] !== playerId) return no('reason.notYourTurn')
  return OK
}

export function canPayDebt(s: GameState): Check {
  if (s.phase !== 'debt' || s.debts.length === 0) return no('reason.wrongPhase')
  const d = s.debts[0]
  if (getPlayer(s, d.debtorId).money < d.amount) return no('reason.noMoney', { amount: d.amount })
  return OK
}

export function canEndTurn(s: GameState): Check {
  if (s.phase === 'awaitRoll') return no(s.extraRoll ? 'reason.extraRoll' : 'reason.mustRoll')
  if (s.phase !== 'awaitEndTurn') return no('reason.wrongPhase')
  return OK
}

export function canBankrupt(s: GameState): Check {
  if (s.phase !== 'debt') return no('reason.wrongPhase')
  return OK
}

function sideValid(s: GameState, ownerId: string, side: TradeOffer['give']): boolean {
  const p = getPlayer(s, ownerId)
  if (!Number.isInteger(side.money) || side.money < 0 || side.money > p.money) return false
  if (!Number.isInteger(side.jailCards) || side.jailCards < 0 || side.jailCards > p.jailFreeCards.length) return false
  for (const i of side.tiles) {
    const own = s.ownership[i]
    if (!own || own.owner !== ownerId) return false
    const t = ownableTile(i)
    if (t.kind === 'property' && groupHasBuildings(s, t.group)) return false
  }
  return true
}

export function canProposeTrade(s: GameState, offer: TradeOffer): Check {
  if (s.phase !== 'awaitRoll' && s.phase !== 'awaitEndTurn') return no('reason.wrongPhase')
  if (offer.fromId !== currentPlayer(s).id) return no('reason.notYourTurn')
  if (offer.fromId === offer.toId) return no('reason.invalidTrade')
  const to = s.players.find((p) => p.id === offer.toId)
  if (!to || to.bankrupt) return no('reason.invalidTrade')
  const empty = (x: TradeOffer['give']) => x.money === 0 && x.tiles.length === 0 && x.jailCards === 0
  if (empty(offer.give) && empty(offer.get)) return no('reason.emptyTrade')
  if (!sideValid(s, offer.fromId, offer.give)) return no('reason.invalidTrade')
  if (!sideValid(s, offer.toId, offer.get)) return no('reason.invalidTrade')
  return OK
}

/** Valida cualquier acción (el reducer ignora las que no pasan) */
export function validate(s: GameState, a: Action): Check {
  if (s.phase === 'gameOver') return no('reason.gameOver')
  switch (a.type) {
    case 'roll': return canRoll(s)
    case 'payJail': return canPayJail(s)
    case 'useJailCard': return canUseJailCard(s)
    case 'buy': return canBuy(s)
    case 'decline': return s.phase === 'awaitBuy' ? OK : no('reason.wrongPhase')
    case 'bid': return canBid(s, a.playerId, a.amount)
    case 'passBid': return canPassBid(s, a.playerId)
    case 'build': return canBuild(s, a.tile)
    case 'sell': return canSell(s, a.tile)
    case 'mortgage': return canMortgage(s, a.tile)
    case 'unmortgage': return canUnmortgage(s, a.tile)
    case 'payDebt': return canPayDebt(s)
    case 'proposeTrade': return canProposeTrade(s, a.offer)
    case 'acceptTrade':
    case 'rejectTrade': {
      if (s.phase !== 'trade' || !s.trade) return no('reason.wrongPhase')
      if (a.type === 'acceptTrade') {
        // Revalidar por si algo cambió
        const t = s.trade
        if (!sideValid(s, t.fromId, t.give) || !sideValid(s, t.toId, t.get)) return no('reason.invalidTrade')
      }
      return OK
    }
    case 'endTurn': return canEndTurn(s)
    case 'bankrupt': return canBankrupt(s)
    case 'timeUp': return s.quickMode.type === 'time' ? OK : no('reason.wrongPhase')
  }
}
