import { describe, expect, it } from 'vitest'
import { applyAction } from '../../src/engine/reducer'
import { canPayDebt } from '../../src/engine/validate'
import { give, money, newGame, run, setup } from './helpers'

describe('deudas y bancarrota', () => {
  it('si no llega para el alquiler entra en fase de deuda', () => {
    let s = give(newGame(), 'p2', [39], 5) // hotel en Passeig de Gràcia: 2000
    s = setup(s, (d) => { d.players[0].position = 35 })
    s = run(s, { type: 'roll', dice: [1, 3] })
    expect(s.phase).toBe('debt')
    expect(s.debts[0]).toEqual({ debtorId: 'p1', creditorId: 'p2', amount: 2000 })
    expect(canPayDebt(s).ok).toBe(false)
    expect(applyAction(s, { type: 'endTurn' })).toBe(s)
  })

  it('puede hipotecar para pagar y la partida sigue', () => {
    let s = give(newGame(), 'p2', [14]) // alquiler 12
    s = give(s, 'p1', [37])
    s = setup(s, (d) => {
      d.players[0].money = 5
      d.players[0].position = 10
    })
    s = run(s, { type: 'roll', dice: [1, 3] })
    expect(s.phase).toBe('debt')
    s = run(s, { type: 'mortgage', tile: 37 }, { type: 'payDebt' })
    expect(money(s, 'p1')).toBe(5 + 175 - 12)
    expect(money(s, 'p2')).toBe(1512)
    expect(s.phase).toBe('awaitEndTurn')
  })

  it('bancarrota ante un jugador: el acreedor se queda dinero y propiedades', () => {
    let s = give(newGame(3), 'p2', [39], 5)
    s = give(s, 'p1', [1, 3], 2) // marrón con 2 casas cada una
    s = setup(s, (d) => {
      d.players[0].money = 100
      d.players[0].position = 35
      d.players[0].jailFreeCards = ['festa']
    })
    s = run(s, { type: 'roll', dice: [1, 3] }, { type: 'bankrupt' })
    const p1 = s.players[0]
    expect(p1.bankrupt).toBe(true)
    expect(s.ownership[1].owner).toBe('p2')
    expect(s.ownership[1].houses).toBe(0)
    // 100 € + 4 casas × 50 / 2 = 200
    expect(money(s, 'p2')).toBe(1500 + 200)
    expect(s.players[1].jailFreeCards).toEqual(['festa'])
    expect(s.current).toBe(1)
    expect(s.phase).toBe('awaitRoll')
  })

  it('bancarrota ante la banca: las propiedades vuelven libres', () => {
    let s = give(newGame(3), 'p1', [1, 3])
    s = setup(s, (d) => {
      d.players[0].money = 50
      d.players[0].position = 0
      d.ownership[1].mortgaged = true
    })
    s = run(s, { type: 'roll', dice: [1, 3] }, { type: 'bankrupt' }) // Tasa turística 200
    expect(s.ownership[1]).toEqual({ owner: null, houses: 0, mortgaged: false })
    expect(s.ownership[3].owner).toBeNull()
  })

  it('gana el último jugador en pie', () => {
    let s = give(newGame(2), 'p2', [39], 5)
    s = setup(s, (d) => { d.players[0].position = 35 })
    s = run(s, { type: 'roll', dice: [1, 3] }, { type: 'bankrupt' })
    expect(s.phase).toBe('gameOver')
    expect(s.winnerId).toBe('p2')
    expect(applyAction(s, { type: 'roll' })).toBe(s)
  })

  it('las cartas de "paga a cada jugador" generan deudas con cada uno', () => {
    let s = setup(newGame(3), (d) => {
      d.players[0].money = 30
      d.decks.festa = ['f02', ...d.decks.festa.filter((x) => x !== 'f02')]
      d.players[0].position = 14 // 14 + 3 = 17 Festa Major
    })
    s = run(s, { type: 'roll', dice: [1, 2] })
    // Paga 20 al primero (le quedan 10) y debe 20 al segundo
    expect(money(s, 'p1')).toBe(10)
    expect(s.phase).toBe('debt')
    expect(s.debts).toEqual([{ debtorId: 'p1', creditorId: 'p3', amount: 20 }])
  })
})
