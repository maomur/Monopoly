import { describe, expect, it } from 'vitest'
import { actorId, decideBot } from '../../src/engine/bot'
import { applyAction } from '../../src/engine/reducer'
import { createGame, type GameState } from '../../src/engine/state'
import { validate } from '../../src/engine/validate'

function botGame(players: number, seed: number, rounds?: number): GameState {
  return createGame({
    seed,
    quickMode: rounds ? { type: 'rounds', limit: rounds } : { type: 'none' },
    players: Array.from({ length: players }, (_, i) => ({
      name: `Bot ${i + 1}`,
      token: (['sagrada', 'patinete', 'gaviota', 'tranvia'] as const)[i],
      isBot: true,
    })),
  })
}

function checkInvariants(s: GameState) {
  for (const p of s.players) {
    expect(p.money).toBeGreaterThanOrEqual(0)
    expect(p.position).toBeGreaterThanOrEqual(0)
    expect(p.position).toBeLessThan(40)
  }
  for (const own of Object.values(s.ownership)) {
    expect(own.houses).toBeGreaterThanOrEqual(0)
    expect(own.houses).toBeLessThanOrEqual(5)
    if (own.mortgaged) expect(own.houses).toBe(0)
    if (own.owner) expect(s.players.find((p) => p.id === own.owner)!.bankrupt).toBe(false)
  }
  // las cartas de salir de la cárcel no se duplican ni se pierden
  for (const deck of ['sorpresa', 'festa'] as const) {
    const held = s.players.flatMap((p) => p.jailFreeCards).filter((d) => d === deck).length
    expect(s.decks[deck].length + held).toBe(16)
  }
}

function play(s: GameState, maxActions: number): { s: GameState; actions: number } {
  let n = 0
  while (s.phase !== 'gameOver' && n < maxActions) {
    const a = decideBot(s)
    expect(a, `sin acción en fase ${s.phase} (actor ${actorId(s)})`).not.toBeNull()
    const check = validate(s, a!)
    expect(check, `acción no válida ${JSON.stringify(a)} en ${s.phase}`).toEqual({ ok: true })
    const next = applyAction(s, a!)
    expect(next).not.toBe(s)
    s = next
    checkInvariants(s)
    n++
  }
  return { s, actions: n }
}

describe('partidas completas entre bots', () => {
  it('juegan 30 partidas sin errores ni acciones inválidas', () => {
    let finished = 0
    for (let seed = 1; seed <= 30; seed++) {
      const players = 2 + (seed % 3)
      const { s } = play(botGame(players, seed), 6_000)
      if (s.phase === 'gameOver') {
        finished++
        expect(s.winnerId).not.toBeNull()
        expect(s.players.filter((p) => !p.bankrupt)).toHaveLength(1)
      }
    }
    // La mayoría de partidas a muerte deben acabar en bancarrota de todos menos uno
    expect(finished).toBeGreaterThanOrEqual(24)
  })

  it('la partida rápida por vueltas siempre termina', () => {
    for (let seed = 100; seed < 110; seed++) {
      const { s } = play(botGame(4, seed, 20), 6_000)
      expect(s.phase).toBe('gameOver')
      expect(s.round).toBeLessThanOrEqual(21)
    }
  })
})
