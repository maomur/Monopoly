import { describe, expect, it } from 'vitest'
import { decideBot } from '../../src/engine/bot'
import { give, newGame, run, setup } from './helpers'

describe('bot', () => {
  it('compra si después le sobran más de 200 €', () => {
    const s = run(newGame(), { type: 'roll', dice: [2, 4] }) // Sants 100
    expect(decideBot(s)).toEqual({ type: 'buy' })
    const poor = setup(s, (d) => { d.players[0].money = 290 })
    expect(decideBot(poor)).toEqual({ type: 'decline' })
  })

  it('construye cuando tiene el grupo completo', () => {
    const s = give(newGame(), 'p1', [1, 3])
    expect(decideBot(s)).toMatchObject({ type: 'build' })
  })

  it('hipoteca para pagar una deuda antes de declararse en bancarrota', () => {
    let s = give(newGame(), 'p2', [14])
    s = give(s, 'p1', [37])
    s = setup(s, (d) => { d.players[0].money = 5; d.players[0].position = 10 })
    s = run(s, { type: 'roll', dice: [1, 3] })
    expect(decideBot(s)).toEqual({ type: 'mortgage', tile: 37 })
  })

  it('propone un intercambio para completar un grupo', () => {
    const s = give(give(newGame(), 'p1', [1]), 'p2', [3])
    const a = decideBot(s)
    expect(a).toMatchObject({ type: 'proposeTrade', offer: { toId: 'p2', get: { tiles: [3] } } })
  })
})
