// Estado de la partida y creación inicial. Todo serializable a JSON (localStorage).
import { BOARD, START_MONEY } from './board'
import { FESTA_CARDS, SORPRESA_CARDS } from './cards'
import { shuffle } from './rng'
import { type ColorGroup, type DeckId, isOwnable } from './types'

export const TOKENS = ['sagrada', 'patinete', 'gaviota', 'tranvia', 'castell', 'panot'] as const
export type TokenId = (typeof TOKENS)[number]

export const PLAYER_COLORS = ['#E63946', '#1D7DD8', '#2A9D5C', '#F4A100'] as const

export interface Player {
  id: string
  name: string
  token: TokenId
  color: string
  isBot: boolean
  money: number
  position: number
  inJail: boolean
  /** Intentos fallidos de salir con dobles */
  jailTurns: number
  /** Cartas "sal de la Ronda" que tiene (de qué mazo vienen, para devolverlas) */
  jailFreeCards: DeckId[]
  bankrupt: boolean
}

export interface Ownership {
  owner: string | null
  /** 0–4 casas, 5 = hotel */
  houses: number
  mortgaged: boolean
}

export interface Debt {
  debtorId: string
  /** null = la banca */
  creditorId: string | null
  amount: number
}

export interface Auction {
  tile: number
  highestBid: number
  highestBidder: string | null
  /** Jugadores que siguen pujando, en orden de turno */
  bidders: string[]
  /** Índice dentro de bidders de quien tiene que pujar ahora */
  turn: number
}

export interface TradeSide {
  money: number
  tiles: number[]
  jailCards: number
}

export interface TradeOffer {
  fromId: string
  toId: string
  give: TradeSide
  get: TradeSide
}

export type Phase =
  | 'awaitRoll'
  | 'awaitBuy'
  | 'auction'
  | 'awaitEndTurn'
  | 'debt'
  | 'trade'
  | 'gameOver'

/** Fase a la que se vuelve tras resolver deudas o intercambios */
export type ResumePhase = 'awaitRoll' | 'awaitEndTurn' | 'awaitBuy'

export type QuickMode =
  | { type: 'none' }
  | { type: 'rounds'; limit: number }
  | { type: 'time'; minutes: number; endsAt: number }

/** Entrada del registro. Las variables "tiles" se traducen al renderizar (cambio de idioma en vivo). */
export interface LogEntry {
  id: number
  key: string
  vars?: Record<string, string | number>
  /** Variables que son índices de casilla (se muestran con su nombre traducido) */
  tiles?: Record<string, number>
  /** Variables que son claves i18n (p. ej. el texto de una carta) */
  texts?: Record<string, string>
}

export type LandOutcome =
  | 'free' | 'own' | 'mortgaged' | 'rent' | 'tax' | 'card' | 'goToJail' | 'parking' | 'visit' | 'go'

/** Eventos que produce la última acción, para que la UI los anime en orden */
export type GameEvent =
  | { type: 'dice'; dice: [number, number]; playerId: string }
  | { type: 'move'; playerId: string; from: number; to: number; direct: boolean; backwards?: boolean }
  | { type: 'money'; fromId: string | null; toId: string | null; amount: number }
  | { type: 'card'; cardId: string; playerId: string }
  | { type: 'jail'; playerId: string }
  | { type: 'buy'; playerId: string; tile: number }
  | { type: 'groupComplete'; playerId: string; group: ColorGroup }
  | { type: 'build'; tile: number; houses: number }
  | {
      type: 'land'
      playerId: string
      tile: number
      /** Qué pasa al caer: la UI decide qué ventana mostrar */
      outcome: LandOutcome
      /** Dinero pagado (alquiler o impuesto) */
      amount?: number
      /** A quién se paga (null = banca) */
      toId?: string | null
    }
  | { type: 'bankrupt'; playerId: string; creditorId?: string | null }
  | { type: 'bid'; playerId: string; amount: number }
  | { type: 'trade'; accepted: boolean }
  | { type: 'mortgage'; tile: number; mortgaged: boolean }
  | { type: 'auctionEnd'; winnerId: string | null }
  | { type: 'gameOver'; winnerId: string }

export interface GameState {
  version: number
  players: Player[]
  current: number
  phase: Phase
  resumePhase: ResumePhase
  ownership: Record<number, Ownership>
  dice: [number, number] | null
  doublesCount: number
  /** Tras sacar dobles (y no ir a la cárcel), el jugador vuelve a tirar */
  extraRoll: boolean
  decks: Record<DeckId, string[]>
  rng: number
  debts: Debt[]
  auction: Auction | null
  trade: TradeOffer | null
  lastCard: { cardId: string; playerId: string } | null
  /** Última casilla en la que cayó el jugador (para mostrar el dato curioso) */
  lastLanded: number | null
  round: number
  /** Última vuelta en la que A propuso un intercambio a B (clave "A>B"); evita que los bots insistan */
  tradeCooldown: Record<string, number>
  quickMode: QuickMode
  winnerId: string | null
  log: LogEntry[]
  logSeq: number
  events: GameEvent[]
  /** Contador de acciones aplicadas: la UI lo usa para saber qué eventos ya animó */
  actionSeq: number
}

export const STATE_VERSION = 1

export interface PlayerSetup {
  name: string
  token: TokenId
  isBot: boolean
}

export interface GameSetup {
  players: PlayerSetup[]
  quickMode?: { type: 'none' } | { type: 'rounds'; limit: number } | { type: 'time'; minutes: number }
  seed: number
  /** Marca de tiempo actual (ms) para el modo por tiempo; se pasa para que sea pura */
  now?: number
}

export function createGame(setup: GameSetup): GameState {
  if (setup.players.length < 2 || setup.players.length > 4) {
    throw new Error('Se necesitan entre 2 y 4 jugadores')
  }
  let seed = setup.seed >>> 0
  const [sorpresa, s1] = shuffle(SORPRESA_CARDS.map((c) => c.id), seed)
  const [festa, s2] = shuffle(FESTA_CARDS.map((c) => c.id), s1)
  seed = s2

  const ownership: Record<number, Ownership> = {}
  for (const t of BOARD) {
    if (isOwnable(t)) ownership[t.index] = { owner: null, houses: 0, mortgaged: false }
  }

  const players: Player[] = setup.players.map((p, i) => ({
    id: `p${i + 1}`,
    name: p.name.trim() || `Jugador ${i + 1}`,
    token: p.token,
    color: PLAYER_COLORS[i],
    isBot: p.isBot,
    money: START_MONEY,
    position: 0,
    inJail: false,
    jailTurns: 0,
    jailFreeCards: [],
    bankrupt: false,
  }))

  const qm = setup.quickMode ?? { type: 'none' }
  const quickMode: QuickMode =
    qm.type === 'time'
      ? { type: 'time', minutes: qm.minutes, endsAt: (setup.now ?? 0) + qm.minutes * 60_000 }
      : qm

  return {
    version: STATE_VERSION,
    players,
    current: 0,
    phase: 'awaitRoll',
    resumePhase: 'awaitRoll',
    ownership,
    dice: null,
    doublesCount: 0,
    extraRoll: false,
    decks: { sorpresa, festa },
    rng: seed,
    debts: [],
    auction: null,
    trade: null,
    lastCard: null,
    lastLanded: null,
    round: 1,
    tradeCooldown: {},
    quickMode,
    winnerId: null,
    log: [{ id: 1, key: 'log.start', vars: { name: players[0].name } }],
    logSeq: 1,
    events: [],
    actionSeq: 0,
  }
}
