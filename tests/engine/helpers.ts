import type { Action } from '../../src/engine/actions'
import { applyAction } from '../../src/engine/reducer'
import { createGame, type GameState } from '../../src/engine/state'

export function newGame(players = 2, seed = 42): GameState {
  const tokens = ['sagrada', 'patinete', 'gaviota', 'tranvia'] as const
  return createGame({
    seed,
    players: Array.from({ length: players }, (_, i) => ({
      name: ['Ana', 'Marc', 'Laia', 'Pol'][i],
      token: tokens[i],
      isBot: false,
    })),
  })
}

/** Aplica varias acciones seguidas y falla si alguna se ignora (no válida) */
export function run(s: GameState, ...actions: Action[]): GameState {
  for (const a of actions) {
    const next = applyAction(s, a)
    if (next === s) throw new Error(`Acción no válida en fase ${s.phase}: ${JSON.stringify(a)}`)
    s = next
  }
  return s
}

/** Modifica una copia del estado para preparar escenarios */
export function setup(s: GameState, fn: (d: GameState) => void): GameState {
  const d = structuredClone(s)
  fn(d)
  return d
}

export function give(s: GameState, playerId: string, tiles: number[], houses = 0): GameState {
  return setup(s, (d) => {
    for (const t of tiles) d.ownership[t] = { owner: playerId, houses, mortgaged: false }
  })
}

export function money(s: GameState, id: string): number {
  return s.players.find((p) => p.id === id)!.money
}
