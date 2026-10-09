import { describe, expect, it } from 'vitest'
import { setActiveCity } from '../../src/cities'
import { createGame } from '../../src/engine/state'
import { translate } from '../../src/i18n'
import { RoomLogic } from '../../src/online/roomLogic'
import { tileName, tileShort } from '../../src/ui/format'

describe('ciudades', () => {
  it('la partida guarda su ciudad (Barcelona por defecto)', () => {
    const players = [{ name: 'A', token: 'sagrada' as const, isBot: false }, { name: 'B', token: 'patinete' as const, isBot: true }]
    expect(createGame({ seed: 1, players }).city).toBe('bcn')
    expect(createGame({ seed: 1, players, city: 'roma' }).city).toBe('roma')
  })

  it('Roma cambia nombres, cartas y textos; Barcelona sigue igual', () => {
    setActiveCity('roma')
    expect(tileName('es', 39)).toBe('Via Condotti')
    expect(tileShort('es', 10)).toBe('GRA')
    expect(translate('es', 'card.s16')).toContain('Roma Termini')
    expect(translate('ca', 'deck.festa')).toBe('Dolce Vita')
    expect(translate('es', 'tile.ibi')).toBe('IMU')
    setActiveCity('bcn')
    expect(tileName('es', 39)).toBe('Passeig de Gràcia')
    expect(tileShort('es', 10)).toBe('Ronda')
    expect(translate('es', 'card.s16')).toContain('Estació de Sants')
  })

  it('Roma tiene nombre propio para todas las casillas que se compran', () => {
    setActiveCity('roma')
    const own = [1, 3, 5, 6, 8, 9, 11, 12, 13, 14, 15, 16, 18, 19, 21, 23, 24, 25, 26, 27, 28, 29, 31, 32, 34, 35, 37, 39]
    setActiveCity('bcn')
    const bcn = own.map((i) => tileName('es', i))
    setActiveCity('roma')
    own.forEach((i, k) => expect(tileName('es', i)).not.toBe(bcn[k]))
    setActiveCity('bcn')
  })

  it('la sala online juega en la ciudad de quien la crea', () => {
    const r = new RoomLogic('ROMAA')
    r.handle('k', { t: 'hello', key: 'k', create: true, city: 'roma' })
    r.handle('k', { t: 'join', name: 'Ana', token: 'sagrada' })
    r.handle('k', { t: 'addBot' })
    expect(r.publicRoom().city).toBe('roma')
    r.handle('k', { t: 'start' })
    expect(r.data.game!.city).toBe('roma')
  })
})
