// Consultas puras sobre el estado (no mutan nada).
import {
  BOARD, GROUPS, HOTEL, MORTGAGE_INTEREST, TRANSPORT_INDICES, TRANSPORT_RENTS,
  UTILITY_INDICES, UTILITY_MULTIPLIERS,
} from './board'
import type { GameState, Player } from './state'
import { type ColorGroup, type OwnableTile, type PropertyTile, isOwnable } from './types'

export function currentPlayer(s: GameState): Player {
  return s.players[s.current]
}

export function getPlayer(s: GameState, id: string): Player {
  const p = s.players.find((x) => x.id === id)
  if (!p) throw new Error(`Jugador desconocido: ${id}`)
  return p
}

export function activePlayers(s: GameState): Player[] {
  return s.players.filter((p) => !p.bankrupt)
}

export function ownableTile(index: number): OwnableTile {
  const t = BOARD[index]
  if (!isOwnable(t)) throw new Error(`La casilla ${index} no es comprable`)
  return t
}

export function propertyTile(index: number): PropertyTile {
  const t = BOARD[index]
  if (t.kind !== 'property') throw new Error(`La casilla ${index} no es una propiedad`)
  return t
}

export function ownerOf(s: GameState, index: number): string | null {
  return s.ownership[index]?.owner ?? null
}

export function tilesOwnedBy(s: GameState, playerId: string): number[] {
  return Object.keys(s.ownership)
    .map(Number)
    .filter((i) => s.ownership[i].owner === playerId)
    .sort((a, b) => a - b)
}

export function ownsFullGroup(s: GameState, playerId: string, group: ColorGroup): boolean {
  return GROUPS[group].every((i) => s.ownership[i].owner === playerId)
}

export function groupOf(index: number): ColorGroup | null {
  const t = BOARD[index]
  return t.kind === 'property' ? t.group : null
}

export function groupHasBuildings(s: GameState, group: ColorGroup): boolean {
  return GROUPS[group].some((i) => s.ownership[i].houses > 0)
}

export function countOwnedOfKind(s: GameState, playerId: string, kind: 'transport' | 'utility'): number {
  const list = kind === 'transport' ? TRANSPORT_INDICES : UTILITY_INDICES
  return list.filter((i) => s.ownership[i].owner === playerId).length
}

/**
 * Alquiler a pagar al caer en una casilla.
 * @param diceTotal suma de los dados (para servicios)
 * @param cardMultiplier multiplicador de carta (transporte ×2) o multiplicador fijo de servicio (×10)
 */
export function rentFor(
  s: GameState,
  index: number,
  diceTotal: number,
  cardMultiplier?: number,
): number {
  const own = s.ownership[index]
  if (!own || !own.owner || own.mortgaged) return 0
  const t = ownableTile(index)
  if (t.kind === 'property') {
    if (own.houses > 0) return t.rents[own.houses]
    return ownsFullGroup(s, own.owner, t.group) ? t.rents[0] * 2 : t.rents[0]
  }
  if (t.kind === 'transport') {
    const n = countOwnedOfKind(s, own.owner, 'transport')
    return TRANSPORT_RENTS[n - 1] * (cardMultiplier ?? 1)
  }
  // servicio
  const n = countOwnedOfKind(s, own.owner, 'utility')
  const mult = cardMultiplier ?? UTILITY_MULTIPLIERS[n - 1]
  return diceTotal * mult
}

export function unmortgageCost(index: number): number {
  // Entero: hipoteca + 10 %, redondeado hacia arriba sin errores de coma flotante
  return Math.ceil((ownableTile(index).mortgage * Math.round((1 + MORTGAGE_INTEREST) * 100)) / 100)
}

/** Patrimonio: dinero + valor de propiedades (hipotecadas a mitad) + edificios a coste */
export function netWorth(s: GameState, playerId: string): number {
  const p = getPlayer(s, playerId)
  if (p.bankrupt) return 0
  let total = p.money
  for (const i of tilesOwnedBy(s, playerId)) {
    const t = ownableTile(i)
    const own = s.ownership[i]
    total += own.mortgaged ? t.price - t.mortgage : t.price
    if (t.kind === 'property') total += own.houses * t.houseCost
  }
  return total
}

/** Dinero máximo que podría reunir vendiendo edificios (a mitad) e hipotecando todo */
export function liquidationValue(s: GameState, playerId: string): number {
  const p = getPlayer(s, playerId)
  let total = p.money
  for (const i of tilesOwnedBy(s, playerId)) {
    const t = ownableTile(i)
    const own = s.ownership[i]
    if (t.kind === 'property') total += Math.floor((own.houses * t.houseCost) / 2)
    if (!own.mortgaged) total += t.mortgage
  }
  return total
}

export function buildingCounts(s: GameState, playerId: string): { houses: number; hotels: number } {
  let houses = 0
  let hotels = 0
  for (const i of tilesOwnedBy(s, playerId)) {
    const h = s.ownership[i].houses
    if (h === HOTEL) hotels++
    else houses += h
  }
  return { houses, hotels }
}

/** Siguiente casilla de un tipo avanzando desde una posición */
export function nearestForward(from: number, kind: 'transport' | 'utility'): number {
  const list = kind === 'transport' ? TRANSPORT_INDICES : UTILITY_INDICES
  return list.find((i) => i > from) ?? list[0]
}

export function totalDebtOf(s: GameState, playerId: string): number {
  return s.debts.filter((d) => d.debtorId === playerId).reduce((a, d) => a + d.amount, 0)
}
