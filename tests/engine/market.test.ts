import { describe, expect, it } from 'vitest'
import { applyAction } from '../../src/engine/reducer'
import { canProposeTrade } from '../../src/engine/validate'
import type { TradeOffer } from '../../src/engine/state'
import { give, money, newGame, run, setup } from './helpers'

describe('subasta', () => {
  it('si no compra, se subasta y gana la puja más alta', () => {
    let s = run(newGame(3), { type: 'roll', dice: [2, 4] }, { type: 'decline' }) // Sants 100
    expect(s.phase).toBe('auction')
    expect(s.auction!.bidders).toEqual(['p1', 'p2', 'p3'])
    s = run(
      s,
      { type: 'passBid', playerId: 'p1' },
      { type: 'bid', playerId: 'p2', amount: 50 },
      { type: 'bid', playerId: 'p3', amount: 60 },
      { type: 'passBid', playerId: 'p2' },
    )
    expect(s.phase).toBe('awaitEndTurn')
    expect(s.ownership[6].owner).toBe('p3')
    expect(money(s, 'p3')).toBe(1440)
  })

  it('si nadie puja, la casilla sigue libre', () => {
    let s = run(newGame(2), { type: 'roll', dice: [2, 4] }, { type: 'decline' })
    s = run(s, { type: 'passBid', playerId: 'p1' }, { type: 'passBid', playerId: 'p2' })
    expect(s.ownership[6].owner).toBeNull()
  })

  it('no se puede pujar por debajo del mínimo ni fuera de turno', () => {
    let s = run(newGame(2), { type: 'roll', dice: [2, 4] }, { type: 'decline' })
    expect(applyAction(s, { type: 'bid', playerId: 'p2', amount: 50 })).toBe(s)
    s = run(s, { type: 'bid', playerId: 'p1', amount: 20 })
    expect(applyAction(s, { type: 'bid', playerId: 'p2', amount: 20 })).toBe(s)
  })

  it('quien no puede pagar la puja mínima queda fuera', () => {
    let s = setup(newGame(2), (d) => { d.players[1].money = 5 })
    s = run(s, { type: 'roll', dice: [2, 4] }, { type: 'decline' })
    expect(s.auction!.bidders).toEqual(['p1'])
    s = run(s, { type: 'bid', playerId: 'p1', amount: 10 })
    expect(s.ownership[6].owner).toBe('p1')
  })
})

describe('intercambios', () => {
  const offer = (o: Partial<TradeOffer> = {}): TradeOffer => ({
    fromId: 'p1',
    toId: 'p2',
    give: { money: 100, tiles: [1], jailCards: 0 },
    get: { money: 0, tiles: [3], jailCards: 0 },
    ...o,
  })

  it('se acepta y se intercambian propiedades y dinero', () => {
    let s = give(give(newGame(), 'p1', [1]), 'p2', [3])
    s = run(s, { type: 'proposeTrade', offer: offer() })
    expect(s.phase).toBe('trade')
    s = run(s, { type: 'acceptTrade' })
    expect(s.ownership[1].owner).toBe('p2')
    expect(s.ownership[3].owner).toBe('p1')
    expect(money(s, 'p1')).toBe(1400)
    expect(money(s, 'p2')).toBe(1600)
    expect(s.phase).toBe('awaitRoll')
  })

  it('se rechaza y no cambia nada', () => {
    let s = give(give(newGame(), 'p1', [1]), 'p2', [3])
    s = run(s, { type: 'proposeTrade', offer: offer() }, { type: 'rejectTrade' })
    expect(s.ownership[1].owner).toBe('p1')
    expect(money(s, 'p1')).toBe(1500)
  })

  it('no se ofrece lo que no se tiene ni propiedades con edificios en el grupo', () => {
    let s = give(newGame(), 'p2', [3])
    expect(canProposeTrade(s, offer()).ok).toBe(false)
    s = give(give(newGame(), 'p1', [1, 3], 1), 'p2', [6])
    expect(canProposeTrade(s, offer({ give: { money: 0, tiles: [1], jailCards: 0 }, get: { money: 0, tiles: [6], jailCards: 0 } })).ok).toBe(false)
  })

  it('completar un grupo por intercambio lanza el evento', () => {
    let s = give(give(newGame(), 'p1', [1]), 'p2', [3])
    s = run(s, {
      type: 'proposeTrade',
      offer: offer({ give: { money: 100, tiles: [], jailCards: 0 } }),
    }, { type: 'acceptTrade' })
    expect(s.events.some((e) => e.type === 'groupComplete' && e.playerId === 'p1')).toBe(true)
  })
})

describe('cartas', () => {
  const withTop = (deck: 'sorpresa' | 'festa', id: string, position: number) =>
    setup(newGame(), (d) => {
      d.decks[deck] = [id, ...d.decks[deck].filter((x) => x !== id)]
      d.players[0].position = position
    })

  it('cobra dinero y la carta va al fondo del mazo', () => {
    const s = run(withTop('festa', 'f01', 0), { type: 'roll', dice: [1, 1] }) // casilla 2
    expect(money(s, 'p1')).toBe(1600)
    expect(s.decks.festa.at(-1)).toBe('f01')
    expect(s.lastCard).toEqual({ cardId: 'f01', playerId: 'p1' })
  })

  it('retroceder 3 casillas y resolver la nueva casilla', () => {
    const s = run(withTop('sorpresa', 's02', 4), { type: 'roll', dice: [1, 2] }) // 7 → 4 impuesto
    expect(s.players[0].position).toBe(4)
    expect(money(s, 'p1')).toBe(1300)
  })

  it('avanzar hasta la SALIDA cobra 200 €', () => {
    const s = run(withTop('sorpresa', 's03', 33), { type: 'roll', dice: [1, 2] }) // 36 → 0
    expect(s.players[0].position).toBe(0)
    expect(money(s, 'p1')).toBe(1700)
  })

  it('transporte más cercano: paga el doble si tiene dueño', () => {
    let s = withTop('sorpresa', 's07', 20)
    s = give(s, 'p2', [25])
    s = run(s, { type: 'roll', dice: [1, 1] }) // 22 → 25
    expect(s.players[0].position).toBe(25)
    expect(money(s, 'p1')).toBe(1450)
  })

  it('la carta de salir de la cárcel se guarda y no vuelve al mazo', () => {
    const s = run(withTop('sorpresa', 's10', 4), { type: 'roll', dice: [1, 2] })
    expect(s.players[0].jailFreeCards).toEqual(['sorpresa'])
    expect(s.decks.sorpresa).not.toContain('s10')
  })

  it('reparaciones: paga por casa y hotel', () => {
    let s = give(withTop('sorpresa', 's13', 4), 'p1', [11, 13], 2)
    s = give(s, 'p1', [14], 5)
    s = run(s, { type: 'roll', dice: [1, 2] })
    expect(money(s, 'p1')).toBe(1500 - (4 * 25 + 100))
  })
})

describe('partida rápida', () => {
  it('por vueltas: termina al acabar la última y gana el mayor patrimonio', () => {
    let s = setup(newGame(2), (d) => {
      d.quickMode = { type: 'rounds', limit: 1 }
      d.ownership[39] = { owner: 'p2', houses: 0, mortgaged: false }
      d.ownership[3] = { owner: 'p2', houses: 0, mortgaged: false }
    })
    s = run(s, { type: 'roll', dice: [1, 2] }, { type: 'endTurn' })
    expect(s.phase).toBe('awaitRoll')
    s = run(s, { type: 'roll', dice: [1, 2] }, { type: 'endTurn' })
    expect(s.phase).toBe('gameOver')
    expect(s.winnerId).toBe('p2')
  })

  it('por tiempo: al agotarse gana el mayor patrimonio', () => {
    let s = setup(newGame(2), (d) => {
      d.quickMode = { type: 'time', minutes: 30, endsAt: 0 }
      d.players[0].money = 2000
    })
    s = run(s, { type: 'timeUp' })
    expect(s.winnerId).toBe('p1')
  })
})
