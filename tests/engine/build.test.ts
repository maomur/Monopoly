import { describe, expect, it } from 'vitest'
import { applyAction } from '../../src/engine/reducer'
import { canBuild, canMortgage, canSell } from '../../src/engine/validate'
import { give, money, newGame, run, setup } from './helpers'

// Marrón: 1 (Nou Barris) y 3 (Sant Andreu), casa 50 €
const brown = () => give(newGame(), 'p1', [1, 3])

describe('construcción uniforme', () => {
  it('no se puede construir sin el grupo completo', () => {
    const s = give(newGame(), 'p1', [1])
    expect(canBuild(s, 1)).toMatchObject({ ok: false, reason: 'reason.needGroup' })
  })

  it('hay que construir de forma uniforme', () => {
    let s = run(brown(), { type: 'build', tile: 1 })
    expect(s.ownership[1].houses).toBe(1)
    expect(money(s, 'p1')).toBe(1450)
    expect(canBuild(s, 1)).toMatchObject({ ok: false, reason: 'reason.unevenBuild' })
    expect(canBuild(s, 3).ok).toBe(true)
    s = run(s, { type: 'build', tile: 3 }, { type: 'build', tile: 1 })
    expect(s.ownership[1].houses).toBe(2)
  })

  it('el hotel va después de 4 casas, y no hay nada después del hotel', () => {
    let s = give(newGame(), 'p1', [1, 3], 4)
    s = run(s, { type: 'build', tile: 1 })
    expect(s.ownership[1].houses).toBe(5)
    expect(s.log.at(-1)!.key).toBe('log.buildHotel')
    s = run(s, { type: 'build', tile: 3 })
    expect(canBuild(s, 1)).toMatchObject({ ok: false, reason: 'reason.maxBuildings' })
  })

  it('no se construye con una propiedad del grupo hipotecada', () => {
    const s = setup(brown(), (d) => { d.ownership[3].mortgaged = true })
    expect(canBuild(s, 1)).toMatchObject({ ok: false, reason: 'reason.groupMortgaged' })
  })

  it('hace falta dinero', () => {
    const s = setup(brown(), (d) => { d.players[0].money = 40 })
    expect(canBuild(s, 1)).toMatchObject({ ok: false, reason: 'reason.noMoney' })
  })

  it('la venta también es uniforme y devuelve la mitad', () => {
    let s = setup(give(newGame(), 'p1', [1, 3], 2), (d) => { d.ownership[3].houses = 1 })
    expect(canSell(s, 3)).toMatchObject({ ok: false, reason: 'reason.unevenSell' })
    s = run(s, { type: 'sell', tile: 1 })
    expect(s.ownership[1].houses).toBe(1)
    expect(money(s, 'p1')).toBe(1525)
  })

  it('no se puede construir fuera de turno', () => {
    const s = setup(brown(), (d) => { d.current = 1 })
    expect(applyAction(s, { type: 'build', tile: 1 })).toBe(s)
  })
})

describe('hipotecas', () => {
  it('hipotecar da la mitad del precio y deshipotecar cuesta +10 %', () => {
    let s = give(newGame(), 'p1', [39]) // Passeig de Gràcia 400, hipoteca 200
    s = run(s, { type: 'mortgage', tile: 39 })
    expect(money(s, 'p1')).toBe(1700)
    s = run(s, { type: 'unmortgage', tile: 39 })
    expect(money(s, 'p1')).toBe(1480)
    expect(s.ownership[39].mortgaged).toBe(false)
  })

  it('no se hipoteca si hay edificios en el grupo', () => {
    const s = setup(brown(), (d) => { d.ownership[3].houses = 1 })
    expect(canMortgage(s, 1)).toMatchObject({ ok: false, reason: 'reason.hasBuildingsInGroup' })
  })
})
