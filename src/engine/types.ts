// Tipos de datos del tablero. Sin dependencias de UI.

export type ColorGroup =
  | 'brown'
  | 'lightblue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'darkblue'

export type DeckId = 'sorpresa' | 'festa'

interface TileBase {
  /** Posición 0–39 en sentido horario desde la SALIDA */
  index: number
  /** Nombre propio del lugar (igual en es/ca salvo que haya clave i18n) */
  name: string
}

export interface PropertyTile extends TileBase {
  kind: 'property'
  group: ColorGroup
  price: number
  /** [base, 1 casa, 2 casas, 3 casas, 4 casas, hotel] */
  rents: [number, number, number, number, number, number]
  houseCost: number
  mortgage: number
  /** Clave i18n del dato curioso */
  factKey: string
}

export interface TransportTile extends TileBase {
  kind: 'transport'
  price: number
  mortgage: number
  factKey: string
}

export interface UtilityTile extends TileBase {
  kind: 'utility'
  price: number
  mortgage: number
  factKey: string
}

export interface TaxTile extends TileBase {
  kind: 'tax'
  amount: number
  /** Clave i18n del nombre */
  nameKey: string
}

export interface CardTile extends TileBase {
  kind: 'card'
  deck: DeckId
}

export interface CornerTile extends TileBase {
  kind: 'go' | 'jail' | 'parking' | 'goToJail'
  nameKey: string
}

export type Tile =
  | PropertyTile
  | TransportTile
  | UtilityTile
  | TaxTile
  | CardTile
  | CornerTile

export type OwnableTile = PropertyTile | TransportTile | UtilityTile

export function isOwnable(t: Tile): t is OwnableTile {
  return t.kind === 'property' || t.kind === 'transport' || t.kind === 'utility'
}

// ---- Cartas ----

export type CardEffect =
  | { type: 'money'; amount: number } // + cobra, − paga a la banca
  | { type: 'eachPlayer'; amount: number } // + cobras de cada jugador, − pagas a cada jugador
  | { type: 'moveTo'; target: number } // avanza hasta la casilla (cobra SALIDA si pasa)
  | { type: 'moveBack'; steps: number }
  | { type: 'nearest'; kind: 'transport' | 'utility'; rentMultiplier: number }
  | { type: 'goToJail' }
  | { type: 'jailFree' }
  | { type: 'repairs'; perHouse: number; perHotel: number }

export interface Card {
  id: string
  deck: DeckId
  /** Clave i18n del texto */
  textKey: string
  effect: CardEffect
}
