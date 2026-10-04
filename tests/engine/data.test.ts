import { describe, expect, it } from 'vitest'
import { BOARD, GROUPS, TRANSPORT_INDICES, UTILITY_INDICES } from '../../src/engine/board'
import { FESTA_CARDS, SORPRESA_CARDS } from '../../src/engine/cards'
import { es } from '../../src/i18n/es'
import { ca } from '../../src/i18n/ca'
import { isOwnable } from '../../src/engine/types'

describe('datos del tablero', () => {
  it('tiene 40 casillas con índices consecutivos', () => {
    expect(BOARD).toHaveLength(40)
    BOARD.forEach((t, i) => expect(t.index).toBe(i))
  })

  it('tiene las esquinas en su sitio', () => {
    expect(BOARD[0].kind).toBe('go')
    expect(BOARD[10].kind).toBe('jail')
    expect(BOARD[20].kind).toBe('parking')
    expect(BOARD[30].kind).toBe('goToJail')
  })

  it('tiene 8 grupos con 2–3 propiedades, ordenados de barato a caro', () => {
    const sizes = Object.values(GROUPS).map((g) => g.length)
    expect(sizes).toEqual([2, 3, 3, 3, 3, 3, 3, 2])
    const props = BOARD.filter((t) => t.kind === 'property')
    expect(props).toHaveLength(22)
    expect(props[0].kind === 'property' && props[0].price).toBe(60)
    expect(props[21].kind === 'property' && props[21].price).toBe(400)
  })

  it('cada propiedad tiene alquileres crecientes e hipoteca = mitad del precio', () => {
    for (const t of BOARD) {
      if (t.kind !== 'property') continue
      expect(t.rents).toHaveLength(6)
      for (let i = 1; i < 6; i++) expect(t.rents[i]).toBeGreaterThan(t.rents[i - 1])
      expect(t.mortgage).toBe(t.price / 2)
    }
  })

  it('tiene 4 transportes, 2 servicios, 2 impuestos y 3+3 casillas de carta', () => {
    expect(TRANSPORT_INDICES).toEqual([5, 15, 25, 35])
    expect(UTILITY_INDICES).toEqual([12, 28])
    expect(BOARD.filter((t) => t.kind === 'tax').map((t) => t.kind === 'tax' && t.amount)).toEqual([200, 100])
    const cards = BOARD.filter((t) => t.kind === 'card')
    expect(cards.filter((t) => t.kind === 'card' && t.deck === 'sorpresa')).toHaveLength(3)
    expect(cards.filter((t) => t.kind === 'card' && t.deck === 'festa')).toHaveLength(3)
  })

  it('cada casilla comprable tiene dato curioso en ambos idiomas', () => {
    for (const t of BOARD) {
      if (!isOwnable(t)) continue
      expect(es).toHaveProperty(t.factKey)
      expect(ca).toHaveProperty(t.factKey)
    }
  })
})

describe('cartas', () => {
  it('hay 16 cartas por mazo, con ids únicos y texto en ambos idiomas', () => {
    expect(SORPRESA_CARDS).toHaveLength(16)
    expect(FESTA_CARDS).toHaveLength(16)
    const ids = new Set([...SORPRESA_CARDS, ...FESTA_CARDS].map((c) => c.id))
    expect(ids.size).toBe(32)
    for (const c of [...SORPRESA_CARDS, ...FESTA_CARDS]) {
      expect(es).toHaveProperty(c.textKey)
      expect(ca).toHaveProperty(c.textKey)
    }
  })

  it('cada mazo tiene una carta de salir de la Ronda', () => {
    expect(SORPRESA_CARDS.filter((c) => c.effect.type === 'jailFree')).toHaveLength(1)
    expect(FESTA_CARDS.filter((c) => c.effect.type === 'jailFree')).toHaveLength(1)
  })
})

describe('i18n', () => {
  it('es y ca tienen exactamente las mismas claves', () => {
    expect(Object.keys(ca).sort()).toEqual(Object.keys(es).sort())
  })
})
