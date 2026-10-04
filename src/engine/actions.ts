import type { TradeOffer } from './state'

export type Action =
  /** dice opcional: fuerza la tirada (tests y depuración) */
  | { type: 'roll'; dice?: [number, number] }
  | { type: 'payJail' }
  | { type: 'useJailCard' }
  | { type: 'buy' }
  | { type: 'decline' }
  | { type: 'bid'; playerId: string; amount: number }
  | { type: 'passBid'; playerId: string }
  | { type: 'build'; tile: number }
  | { type: 'sell'; tile: number }
  | { type: 'mortgage'; tile: number }
  | { type: 'unmortgage'; tile: number }
  | { type: 'payDebt' }
  | { type: 'proposeTrade'; offer: TradeOffer }
  | { type: 'acceptTrade' }
  | { type: 'rejectTrade' }
  | { type: 'endTurn' }
  | { type: 'bankrupt' }
  | { type: 'timeUp' }

export type ActionType = Action['type']
