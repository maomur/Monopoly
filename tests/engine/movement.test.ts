import { describe, expect, it } from 'vitest'
import { applyAction } from '../../src/engine/reducer'
import { give, money, newGame, run, setup } from './helpers'

describe('movimiento', () => {
  it('avanza la suma de los dados y ofrece comprar una casilla libre', () => {
    const s = run(newGame(), { type: 'roll', dice: [2, 4] })
    expect(s.players[0].position).toBe(6) // Sants
    expect(s.phase).toBe('awaitBuy')
  })

  it('cobra 200 € al pasar por la SALIDA', () => {
    let s = setup(newGame(), (d) => { d.players[0].position = 38 })
    s = run(s, { type: 'roll', dice: [1, 3] }) // 38 → 2 (Festa Major)
    expect(s.players[0].position).toBe(2)
    expect(s.log.some((l) => l.key === 'log.passGo')).toBe(true)
  })

  it('con dobles vuelve a tirar; sin dobles termina el turno', () => {
    let s = run(newGame(), { type: 'roll', dice: [3, 3] }, { type: 'decline' })
    // subasta: los dos pasan
    s = run(s, { type: 'passBid', playerId: 'p1' }, { type: 'passBid', playerId: 'p2' })
    expect(s.phase).toBe('awaitRoll')
    expect(s.current).toBe(0)
    s = setup(s, (d) => { d.ownership[9].owner = 'p1' })
    s = run(s, { type: 'roll', dice: [1, 2] }) // 6 → 9 (propia)
    expect(s.phase).toBe('awaitEndTurn')
    s = run(s, { type: 'endTurn' })
    expect(s.current).toBe(1)
  })

  it('tres dobles seguidos mandan a la cárcel', () => {
    // casillas propias para que no haya que decidir compra
    let s = give(newGame(), 'p1', [6, 12])
    s = run(s, { type: 'roll', dice: [3, 3] }, { type: 'roll', dice: [3, 3] }, { type: 'roll', dice: [4, 4] })
    expect(s.players[0].position).toBe(10)
    expect(s.players[0].inJail).toBe(true)
    expect(s.phase).toBe('awaitEndTurn')
  })

  it('caer en "¡Multa de la ZBE!" manda a la cárcel sin cobrar la SALIDA', () => {
    let s = setup(newGame(), (d) => { d.players[0].position = 25 })
    s = run(s, { type: 'roll', dice: [2, 3] })
    expect(s.players[0].position).toBe(10)
    expect(s.players[0].inJail).toBe(true)
    expect(money(s, 'p1')).toBe(1500)
  })

  it('no se puede terminar el turno sin tirar', () => {
    const s = newGame()
    expect(applyAction(s, { type: 'endTurn' })).toBe(s)
  })

  it('el impuesto se paga a la banca', () => {
    const s = run(newGame(), { type: 'roll', dice: [1, 3] }) // casilla 4, Tasa turística
    expect(money(s, 'p1')).toBe(1300)
  })
})
