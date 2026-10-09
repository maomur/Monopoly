import { describe, expect, it } from 'vitest'
import { decideBot, evaluateTrade } from '../../src/engine/bot'
import { createGame, type BotLevel } from '../../src/engine/state'
import { RoomLogic } from '../../src/online/roomLogic'

const game = (a: BotLevel, b: BotLevel) =>
  createGame({ seed: 3, now: 0, players: [
    { name: 'A', token: 'sagrada', isBot: true, botLevel: a },
    { name: 'B', token: 'patinete', isBot: true, botLevel: b },
  ] })

describe('niveles de bot', () => {
  it('cada bot guarda su nivel (intermedio por defecto)', () => {
    const g = createGame({ seed: 1, now: 0, players: [{ name: 'A', token: 'sagrada', isBot: true }, { name: 'B', token: 'patinete', isBot: false }] })
    expect(g.players[0].botLevel).toBe('intermediate')
    expect(g.players[1].botLevel).toBeUndefined()
  })

  it('el principiante acepta un trato que le da un grupo al rival; el experto no', () => {
    for (const [level, expected] of [['beginner', true], ['expert', false]] as const) {
      const g = game('intermediate', level)
      // A tiene 2 de 3 rojas; B tiene la tercera
      g.ownership[21].owner = 'p1'
      g.ownership[23].owner = 'p1'
      g.ownership[24].owner = 'p2'
      const ok = evaluateTrade(g, { fromId: 'p1', toId: 'p2', give: { money: 260, tiles: [], jailCards: 0 }, get: { money: 0, tiles: [24], jailCards: 0 } })
      expect(ok).toBe(expected)
    }
  })

  it('el principiante nunca propone tratos', () => {
    const g = game('beginner', 'beginner')
    g.ownership[21].owner = 'p1'
    g.ownership[23].owner = 'p1'
    g.ownership[24].owner = 'p2'
    expect(decideBot(g)?.type).toBe('roll')
  })

  it('las salas online guardan el nivel de los bots', () => {
    const r = new RoomLogic('ABCDE')
    r.handle('k', { t: 'hello', key: 'k', create: true })
    r.handle('k', { t: 'join', name: 'Ana', token: 'sagrada' })
    r.handle('k', { t: 'addBot', level: 'expert' })
    r.handle('k', { t: 'start' })
    expect(r.data.game!.players[1].botLevel).toBe('expert')
  })
})
