import { describe, expect, it } from 'vitest'
import { rentFor } from '../../src/engine/queries'
import { give, money, newGame, run, setup } from './helpers'

describe('alquileres', () => {
  it('alquiler base de una propiedad suelta', () => {
    const s = give(newGame(), 'p2', [14]) // Gràcia, base 12
    expect(rentFor(s, 14, 7)).toBe(12)
  })

  it('el doble con el grupo completo y sin casas', () => {
    const s = give(newGame(), 'p2', [11, 13, 14])
    expect(rentFor(s, 14, 7)).toBe(24)
    expect(rentFor(s, 11, 7)).toBe(20)
  })

  it('con casas y hotel usa la tabla', () => {
    let s = give(newGame(), 'p2', [11, 13], 3)
    s = give(s, 'p2', [14], 3)
    expect(rentFor(s, 14, 7)).toBe(500)
    s = give(s, 'p2', [14], 5)
    expect(rentFor(s, 14, 7)).toBe(900)
  })

  it('hipotecada no cobra alquiler', () => {
    const s = setup(give(newGame(), 'p2', [14]), (d) => { d.ownership[14].mortgaged = true })
    expect(rentFor(s, 14, 7)).toBe(0)
  })

  it('transporte: 25/50/100/200 según cuántos tenga el dueño', () => {
    let s = give(newGame(), 'p2', [5])
    expect(rentFor(s, 5, 7)).toBe(25)
    s = give(s, 'p2', [15])
    expect(rentFor(s, 5, 7)).toBe(50)
    s = give(s, 'p2', [25, 35])
    expect(rentFor(s, 5, 7)).toBe(200)
    expect(rentFor(s, 5, 7, 2)).toBe(400) // carta: paga el doble
  })

  it('servicios: 4× o 10× los dados', () => {
    let s = give(newGame(), 'p2', [12])
    expect(rentFor(s, 12, 8)).toBe(32)
    s = give(s, 'p2', [28])
    expect(rentFor(s, 12, 8)).toBe(80)
  })

  it('al caer se paga al dueño y queda en el registro', () => {
    let s = give(newGame(), 'p2', [14]) // Gràcia
    s = setup(s, (d) => { d.players[0].position = 10 })
    s = run(s, { type: 'roll', dice: [1, 3] })
    expect(money(s, 'p1')).toBe(1488)
    expect(money(s, 'p2')).toBe(1512)
    const entry = s.log.find((l) => l.key === 'log.rent')!
    expect(entry.vars).toMatchObject({ name: 'Ana', amount: 12, owner: 'Marc' })
    expect(entry.tiles).toEqual({ tile: 14 })
  })

  it('al caer en un servicio ajeno se paga según los dados de la tirada', () => {
    let s = give(newGame(), 'p2', [12])
    s = setup(s, (d) => { d.players[0].position = 7 })
    s = run(s, { type: 'roll', dice: [2, 3] })
    expect(money(s, 'p1')).toBe(1500 - 20)
  })
})
