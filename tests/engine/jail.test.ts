import { describe, expect, it } from 'vitest'
import { applyAction } from '../../src/engine/reducer'
import { money, newGame, run, setup } from './helpers'

const jailed = () =>
  setup(newGame(), (d) => {
    d.players[0].position = 10
    d.players[0].inJail = true
  })

describe('cárcel (atasco en la Ronda)', () => {
  it('pagar 50 € libera y luego se tira normal', () => {
    let s = run(jailed(), { type: 'payJail' })
    expect(s.players[0].inJail).toBe(false)
    expect(money(s, 'p1')).toBe(1450)
    expect(s.phase).toBe('awaitRoll')
    s = run(s, { type: 'roll', dice: [1, 2] })
    expect(s.players[0].position).toBe(13)
  })

  it('sacar dobles libera y mueve, pero no da tirada extra', () => {
    const s = run(jailed(), { type: 'roll', dice: [2, 2] })
    expect(s.players[0].inJail).toBe(false)
    expect(s.players[0].position).toBe(14)
    expect(s.extraRoll).toBe(false)
  })

  it('sin dobles se queda; al tercer fallo paga 50 € y sale', () => {
    let s = jailed()
    for (let i = 0; i < 2; i++) {
      s = run(s, { type: 'roll', dice: [1, 2] })
      expect(s.players[0].inJail).toBe(true)
      expect(s.players[0].position).toBe(10)
      // pasar turno del otro jugador
      s = run(s, { type: 'endTurn' })
      s = setup(s, (d) => { d.current = 0; d.phase = 'awaitRoll' })
    }
    s = run(s, { type: 'roll', dice: [1, 2] })
    expect(s.players[0].inJail).toBe(false)
    expect(s.players[0].position).toBe(13)
    expect(money(s, 'p1')).toBe(1450)
  })

  it('la carta de salir libera y vuelve al mazo', () => {
    let s = setup(jailed(), (d) => {
      d.players[0].jailFreeCards = ['sorpresa']
      d.decks.sorpresa = d.decks.sorpresa.filter((id) => id !== 's10')
    })
    s = run(s, { type: 'useJailCard' })
    expect(s.players[0].inJail).toBe(false)
    expect(s.players[0].jailFreeCards).toHaveLength(0)
    expect(s.decks.sorpresa).toContain('s10')
  })

  it('no se puede usar la carta si no se tiene', () => {
    const s = jailed()
    expect(applyAction(s, { type: 'useJailCard' })).toBe(s)
  })

  it('en la cárcel se sigue cobrando alquiler', () => {
    let s = setup(jailed(), (d) => {
      d.ownership[14] = { owner: 'p1', houses: 0, mortgaged: false }
      d.current = 1
      d.players[1].position = 10
    })
    s = run(s, { type: 'roll', dice: [1, 3] })
    expect(money(s, 'p1')).toBe(1512)
  })
})
