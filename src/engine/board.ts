// ============================================================
//  BCN Tycoon — datos del tablero (EDITABLE)
//  Precios, alquileres, costes de construcción e hipotecas.
//  rents = [base, 1 casa, 2 casas, 3 casas, 4 casas, hotel]
// ============================================================
import type { ColorGroup, Tile } from './types'

export const START_MONEY = 1500
export const GO_SALARY = 200
export const JAIL_INDEX = 10
export const GO_TO_JAIL_INDEX = 30
export const JAIL_FINE = 50
export const MAX_JAIL_TURNS = 3
export const MORTGAGE_INTEREST = 0.1
export const BOARD_SIZE = 40
/** Alquiler de transporte según cuántos posee el dueño (1–4) */
export const TRANSPORT_RENTS = [25, 50, 100, 200] as const
/** Multiplicador de servicios según cuántos posee el dueño (1–2) × dados */
export const UTILITY_MULTIPLIERS = [4, 10] as const
export const MAX_HOUSES = 4 // 5 = hotel
export const HOTEL = 5
export const MIN_FIRST_BID = 10

/** Colores de grupo (UI). Paleta viva con buen contraste sobre blanco. */
export const GROUP_COLORS: Record<ColorGroup, { bg: string; text: string }> = {
  brown: { bg: '#8B4A2B', text: '#FFFFFF' },
  lightblue: { bg: '#5EC8E5', text: '#0B2A3A' },
  pink: { bg: '#E0458B', text: '#FFFFFF' },
  orange: { bg: '#F28C28', text: '#2A1300' },
  red: { bg: '#D7263D', text: '#FFFFFF' },
  yellow: { bg: '#FFD23F', text: '#2A2200' },
  green: { bg: '#1E9E5A', text: '#FFFFFF' },
  darkblue: { bg: '#1B3A8C', text: '#FFFFFF' },
}

export const BOARD: Tile[] = [
  { index: 0, kind: 'go', name: "Plaça d'Espanya", nameKey: 'tile.go' },
  {
    index: 1, kind: 'property', name: 'Nou Barris', group: 'brown',
    price: 60, rents: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgage: 30,
    factKey: 'fact.nouBarris',
  },
  { index: 2, kind: 'card', name: 'Festa Major', deck: 'festa' },
  {
    index: 3, kind: 'property', name: 'Sant Andreu', group: 'brown',
    price: 60, rents: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgage: 30,
    factKey: 'fact.santAndreu',
  },
  { index: 4, kind: 'tax', name: 'Tasa turística', nameKey: 'tile.touristTax', amount: 200 },
  { index: 5, kind: 'transport', name: 'Estació de Sants', price: 200, mortgage: 100, factKey: 'fact.estacioSants' },
  {
    index: 6, kind: 'property', name: 'Sants', group: 'lightblue',
    price: 100, rents: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50,
    factKey: 'fact.sants',
  },
  { index: 7, kind: 'card', name: 'Sorpresa BCN', deck: 'sorpresa' },
  {
    index: 8, kind: 'property', name: 'Horta', group: 'lightblue',
    price: 100, rents: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50,
    factKey: 'fact.horta',
  },
  {
    index: 9, kind: 'property', name: 'Poblenou', group: 'lightblue',
    price: 120, rents: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgage: 60,
    factKey: 'fact.poblenou',
  },
  { index: 10, kind: 'jail', name: 'Ronda de Dalt', nameKey: 'tile.jail' },
  {
    index: 11, kind: 'property', name: 'Raval', group: 'pink',
    price: 140, rents: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70,
    factKey: 'fact.raval',
  },
  { index: 12, kind: 'utility', name: 'Metro TMB', price: 150, mortgage: 75, factKey: 'fact.metro' },
  {
    index: 13, kind: 'property', name: 'Barceloneta', group: 'pink',
    price: 140, rents: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70,
    factKey: 'fact.barceloneta',
  },
  {
    index: 14, kind: 'property', name: 'Gràcia', group: 'pink',
    price: 160, rents: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgage: 80,
    factKey: 'fact.gracia',
  },
  { index: 15, kind: 'transport', name: 'Estació de França', price: 200, mortgage: 100, factKey: 'fact.estacioFranca' },
  {
    index: 16, kind: 'property', name: 'Poble-sec', group: 'orange',
    price: 180, rents: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90,
    factKey: 'fact.poblesec',
  },
  { index: 17, kind: 'card', name: 'Festa Major', deck: 'festa' },
  {
    index: 18, kind: 'property', name: 'Sant Antoni', group: 'orange',
    price: 180, rents: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90,
    factKey: 'fact.santAntoni',
  },
  {
    index: 19, kind: 'property', name: 'El Born', group: 'orange',
    price: 200, rents: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgage: 100,
    factKey: 'fact.born',
  },
  { index: 20, kind: 'parking', name: 'Ciutadella', nameKey: 'tile.parking' },
  {
    index: 21, kind: 'property', name: 'Les Corts', group: 'red',
    price: 220, rents: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110,
    factKey: 'fact.lesCorts',
  },
  { index: 22, kind: 'card', name: 'Sorpresa BCN', deck: 'sorpresa' },
  {
    index: 23, kind: 'property', name: 'Sant Gervasi', group: 'red',
    price: 220, rents: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110,
    factKey: 'fact.santGervasi',
  },
  {
    index: 24, kind: 'property', name: 'Sarrià', group: 'red',
    price: 240, rents: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgage: 120,
    factKey: 'fact.sarria',
  },
  { index: 25, kind: 'transport', name: 'Port de Barcelona', price: 200, mortgage: 100, factKey: 'fact.port' },
  {
    index: 26, kind: 'property', name: 'La Rambla', group: 'yellow',
    price: 260, rents: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130,
    factKey: 'fact.rambla',
  },
  {
    index: 27, kind: 'property', name: 'Rambla de Catalunya', group: 'yellow',
    price: 260, rents: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130,
    factKey: 'fact.ramblaCatalunya',
  },
  { index: 28, kind: 'utility', name: 'Aigües de Barcelona', price: 150, mortgage: 75, factKey: 'fact.aigues' },
  {
    index: 29, kind: 'property', name: 'Plaça de Catalunya', group: 'yellow',
    price: 280, rents: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgage: 140,
    factKey: 'fact.placaCatalunya',
  },
  { index: 30, kind: 'goToJail', name: 'ZBE', nameKey: 'tile.goToJail' },
  {
    index: 31, kind: 'property', name: 'Avinguda Diagonal', group: 'green',
    price: 300, rents: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150,
    factKey: 'fact.diagonal',
  },
  {
    index: 32, kind: 'property', name: "Quadrat d'Or", group: 'green',
    price: 300, rents: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150,
    factKey: 'fact.quadratOr',
  },
  { index: 33, kind: 'card', name: 'Festa Major', deck: 'festa' },
  {
    index: 34, kind: 'property', name: 'Tibidabo', group: 'green',
    price: 320, rents: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgage: 160,
    factKey: 'fact.tibidabo',
  },
  { index: 35, kind: 'transport', name: 'Aeroport del Prat', price: 200, mortgage: 100, factKey: 'fact.aeroport' },
  { index: 36, kind: 'card', name: 'Sorpresa BCN', deck: 'sorpresa' },
  {
    index: 37, kind: 'property', name: 'Pedralbes', group: 'darkblue',
    price: 350, rents: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgage: 175,
    factKey: 'fact.pedralbes',
  },
  { index: 38, kind: 'tax', name: 'IBI', nameKey: 'tile.ibi', amount: 100 },
  {
    index: 39, kind: 'property', name: 'Passeig de Gràcia', group: 'darkblue',
    price: 400, rents: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgage: 200,
    factKey: 'fact.passeigGracia',
  },
]

/** Índices de casillas de cada grupo de color */
export const GROUPS: Record<ColorGroup, number[]> = BOARD.reduce(
  (acc, t) => {
    if (t.kind === 'property') acc[t.group].push(t.index)
    return acc
  },
  {
    brown: [], lightblue: [], pink: [], orange: [],
    red: [], yellow: [], green: [], darkblue: [],
  } as Record<ColorGroup, number[]>,
)

export const GROUP_ORDER: ColorGroup[] = [
  'brown', 'lightblue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkblue',
]

export const TRANSPORT_INDICES = BOARD.filter((t) => t.kind === 'transport').map((t) => t.index)
export const UTILITY_INDICES = BOARD.filter((t) => t.kind === 'utility').map((t) => t.index)
