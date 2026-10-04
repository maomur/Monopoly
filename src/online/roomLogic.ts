// Lógica de una sala online. Pura (sin red ni Cloudflare) para poder probarla con Vitest.
// El servidor la envuelve en un Durable Object y se encarga de enviar los mensajes.
import type { Action } from '../engine/actions'
import { actorId, decideBot } from '../engine/bot'
import { currentPlayer } from '../engine/queries'
import { applyAction } from '../engine/reducer'
import { createGame, TOKENS, type GameEvent, type GameState } from '../engine/state'
import { managerId } from '../engine/validate'
import { MAX_SEATS, type ClientMsg, type PublicRoom, type QuickSetup, type Seat } from './protocol'

interface PrivateSeat extends Seat {
  /** Clave secreta del móvil dueño del asiento (null en bots) */
  key: string | null
}

export interface RoomData {
  /** La sala existe porque alguien la creó (unirse a un código inventado da error) */
  created: boolean
  phase: 'lobby' | 'playing'
  seats: PrivateSeat[]
  hostSeatId: string | null
  quick: QuickSetup
  game: GameState | null
}

export interface Effects {
  /** Hay que reenviar la sala a todos */
  room?: boolean
  /** Nuevo estado de partida y eventos a animar */
  state?: { game: GameState; events: GameEvent[] }
  /** Error solo para quien envió el mensaje */
  error?: string
}

const BOT_NAMES = ['Bot Gaudí', 'Bot Montserrat', 'Bot Mercè', 'Bot Pep']

let seatSeq = 0
const newSeatId = () => `s${Date.now().toString(36)}${(seatSeq++).toString(36)}`

export function emptyRoom(): RoomData {
  return { created: false, phase: 'lobby', seats: [], hostSeatId: null, quick: { type: 'none' }, game: null }
}

export class RoomLogic {
  code: string
  data: RoomData

  constructor(code: string, data?: RoomData) {
    this.code = code
    this.data = data ?? emptyRoom()
  }

  seatByKey(key: string): PrivateSeat | undefined {
    return this.data.seats.find((s) => s.key === key)
  }

  publicRoom(): PublicRoom {
    return {
      code: this.code,
      phase: this.data.phase,
      seats: this.data.seats.map(({ key: _key, ...s }) => s),
      hostSeatId: this.data.hostSeatId,
      quick: this.data.quick,
    }
  }

  isHost(key: string): boolean {
    const s = this.seatByKey(key)
    return !!s && s.id === this.data.hostSeatId
  }

  /** Marca la conexión del móvil (los bots siempre están "conectados") */
  setConnected(key: string, connected: boolean): boolean {
    const s = this.seatByKey(key)
    if (!s || s.connected === connected) return false
    s.connected = connected
    return true
  }

  private freeToken(prefer?: string) {
    const used = new Set(this.data.seats.map((s) => s.token))
    if (prefer && !used.has(prefer as Seat['token'])) return prefer as Seat['token']
    return TOKENS.find((t) => !used.has(t)) ?? TOKENS[0]
  }

  private nextHost() {
    const human = this.data.seats.find((s) => !s.isBot)
    this.data.hostSeatId = human?.id ?? null
  }

  handle(key: string, msg: ClientMsg, now = Date.now()): Effects {
    const d = this.data
    const seat = this.seatByKey(key)

    switch (msg.t) {
      case 'hello':
        if (msg.create && !d.created) d.created = true
        if (!d.created) return { error: 'roomNotFound' }
        if (seat) {
          seat.connected = true
          return { room: true }
        }
        return {}

      case 'join': {
        if (seat) return {}
        if (!d.created) return { error: 'roomNotFound' }
        if (d.phase !== 'lobby') return { error: 'gameStarted' }
        if (d.seats.length >= MAX_SEATS) return { error: 'roomFull' }
        const s: PrivateSeat = {
          id: newSeatId(),
          key,
          name: msg.name.trim().slice(0, 14) || `Jugador ${d.seats.length + 1}`,
          token: this.freeToken(msg.token),
          isBot: false,
          connected: true,
          playerId: null,
        }
        d.seats.push(s)
        if (!d.hostSeatId) d.hostSeatId = s.id
        return { room: true }
      }

      case 'update': {
        if (!seat || d.phase !== 'lobby') return {}
        seat.name = msg.name.trim().slice(0, 14) || seat.name
        const taken = d.seats.some((o) => o !== seat && o.token === msg.token)
        if (!taken) seat.token = msg.token
        return { room: true }
      }

      case 'addBot': {
        if (!this.isHost(key) || d.phase !== 'lobby') return {}
        if (d.seats.length >= MAX_SEATS) return { error: 'roomFull' }
        const bots = d.seats.filter((s) => s.isBot).length
        d.seats.push({
          id: newSeatId(),
          key: null,
          name: BOT_NAMES[bots % BOT_NAMES.length],
          token: this.freeToken(),
          isBot: true,
          connected: true,
          playerId: null,
        })
        return { room: true }
      }

      case 'removeSeat': {
        if (!this.isHost(key) || d.phase !== 'lobby') return {}
        const target = d.seats.find((s) => s.id === msg.seatId)
        if (!target || target.id === d.hostSeatId) return {}
        d.seats = d.seats.filter((s) => s !== target)
        return { room: true }
      }

      case 'setQuick':
        if (!this.isHost(key) || d.phase !== 'lobby') return {}
        d.quick = msg.quick
        return { room: true }

      case 'leave': {
        if (!seat) return {}
        if (d.phase === 'lobby') {
          d.seats = d.seats.filter((s) => s !== seat)
          if (seat.id === d.hostSeatId) this.nextHost()
        } else {
          // En partida el asiento se queda: un bot juega por él mientras no vuelva
          seat.connected = false
        }
        return { room: true }
      }

      case 'start': {
        if (!this.isHost(key) || d.phase !== 'lobby') return {}
        if (d.seats.length < 2) return { error: 'needTwo' }
        d.seats.forEach((s, i) => (s.playerId = `p${i + 1}`))
        d.game = createGame({
          seed: (Math.random() * 2 ** 32) >>> 0,
          now,
          quickMode: d.quick,
          players: d.seats.map((s) => ({ name: s.name, token: s.token, isBot: s.isBot })),
        })
        d.phase = 'playing'
        return { room: true, state: { game: d.game, events: [] } }
      }

      case 'rematch': {
        if (!this.isHost(key) || d.phase !== 'playing' || d.game?.phase !== 'gameOver') return {}
        d.phase = 'lobby'
        d.game = null
        d.seats.forEach((s) => (s.playerId = null))
        return { room: true }
      }

      case 'action': {
        if (!seat?.playerId || !d.game || d.phase !== 'playing') return { error: 'notInGame' }
        const action = this.sanitize(msg.action)
        if (!this.mayAct(seat.playerId, action, now)) return { error: 'notYourTurn' }
        const next = applyAction(d.game, action)
        if (next === d.game) return { error: 'invalidAction' }
        d.game = next
        return { state: { game: next, events: next.events } }
      }
    }
  }

  /** Nadie puede elegir sus dados ni fingir ser otro jugador */
  private sanitize(a: Action): Action {
    if (a.type === 'roll') return { type: 'roll' }
    return a
  }

  /** ¿Puede este jugador enviar esta acción ahora? (las reglas finas las valida el motor) */
  mayAct(playerId: string, a: Action, now: number): boolean {
    const g = this.data.game!
    switch (a.type) {
      case 'bid':
      case 'passBid':
        return a.playerId === playerId
      case 'build':
      case 'sell':
      case 'mortgage':
      case 'unmortgage':
      case 'payDebt':
      case 'bankrupt':
        return managerId(g) === playerId
      case 'proposeTrade':
        return a.offer.fromId === playerId
      case 'acceptTrade':
      case 'rejectTrade':
        return g.trade?.toId === playerId
      case 'timeUp':
        return g.quickMode.type === 'time' && now >= g.quickMode.endsAt
      default:
        return currentPlayer(g).id === playerId
    }
  }

  /** Jugador que debe actuar y si lo hace el servidor: bot, o humano desconectado */
  pendingAutoActor(): { playerId: string; reason: 'bot' | 'away' } | null {
    const g = this.data.game
    if (!g || this.data.phase !== 'playing' || g.phase === 'gameOver') return null
    const id = actorId(g)
    if (!id) return null
    const seat = this.data.seats.find((s) => s.playerId === id)
    if (!seat) return null
    if (seat.isBot) return { playerId: id, reason: 'bot' }
    if (!seat.connected) return { playerId: id, reason: 'away' }
    return null
  }

  /** El servidor juega un paso por un bot (o por un humano ausente) */
  autoStep(): Effects {
    const g = this.data.game
    if (!g || !this.pendingAutoActor()) return {}
    const a = decideBot(g)
    if (!a) return {}
    const next = applyAction(g, a)
    if (next === g) return {}
    this.data.game = next
    return { state: { game: next, events: next.events } }
  }
}

/**
 * Cuánto esperar antes de que el servidor juegue por un bot, para que los móviles
 * tengan tiempo de animar lo anterior (dados, recorrido, ventanas, monedas).
 */
export function animationBudgetMs(events: GameEvent[]): number {
  let ms = 900
  for (const e of events) {
    switch (e.type) {
      case 'dice': ms += 1250; break
      case 'move': ms += e.direct ? 700 : (((e.backwards ? e.from - e.to : e.to - e.from) + 40) % 40) * 270; break
      case 'land': ms += 900 + (e.outcome === 'rent' || e.outcome === 'tax' || e.outcome === 'goToJail' ? 2600 : 0); break
      case 'card': ms += 2800; break
      case 'money': ms += 260; break
      case 'groupComplete': ms += 400; break
      case 'bankrupt': ms += 6500; break
    }
  }
  return Math.min(ms, 15000)
}

export const AWAY_GRACE_MS = 20000
