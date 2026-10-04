// Estado de la app: partida (motor puro) + estado de interfaz + cola de animaciones + bots.
import { create } from 'zustand'
import type { Action } from '../engine/actions'
import { actorId, decideBot } from '../engine/bot'
import { getPlayer } from '../engine/queries'
import { applyAction } from '../engine/reducer'
import { randomSeed } from '../engine/rng'
import { createGame, type GameEvent, type GameState, type PlayerSetup, type QuickMode } from '../engine/state'
import type { Lang } from '../i18n'
import { setMuted, sfx } from '../audio/sfx'
import { loadGame, loadPrefs, saveGame, savePrefs } from './persistence'

export type Modal =
  | { type: 'none' }
  | { type: 'manage' }
  | { type: 'trade' }
  | { type: 'help' }
  | { type: 'tile'; index: number }
  | { type: 'confirmBankrupt' }
  | { type: 'menu' }

export type QuickSetup = { type: 'none' } | { type: 'rounds'; limit: number } | { type: 'time'; minutes: number }

export type LandEvent = Extract<GameEvent, { type: 'land' }>

/** Resultados que merecen ventana: para humanos casi todo, para bots solo lo que cuesta dinero o cárcel */
const HUMAN_LANDING = new Set(['own', 'mortgaged', 'rent', 'tax', 'goToJail', 'parking', 'visit'])
const BOT_LANDING = new Set(['rent', 'tax', 'goToJail'])
const BOT_LANDING_MS = 2600

// Ritmo de la partida (ms). Más lento para poder seguir la ficha.
const STEP_MS = 270 // cada casilla del recorrido
const DICE_MS = 1000 // dados rodando
const LAND_PAUSE_MS = 900 // la ficha se posa y la casilla brilla antes de abrir la ventana
const JUMP_MS = 700 // saltos directos (ir a la Ronda)
const MONEY_STAGGER_MS = 260 // entre animaciones de dinero seguidas
const MONEY_FX_MS = 1700 // vida de las monedas en pantalla
const BOT_DELAY_MS = 1000
const BOT_CARD_MS = 2800

export interface MoneyFx {
  id: number
  fromId: string | null
  toId: string | null
  amount: number
}

interface Store {
  lang: Lang
  muted: boolean
  game: GameState | null
  savedGame: GameState | null
  /** Posición mostrada de cada ficha (se anima casilla a casilla hacia la real) */
  displayPos: number[]
  /** Hay animaciones en curso: los botones esperan */
  busy: boolean
  queue: GameEvent[]
  /** Carta que se está mostrando */
  shownCard: { cardId: string; playerId: string } | null
  /** Ventana de "has caído en…" que se está mostrando */
  shownLanding: LandEvent | null
  modal: Modal
  zoom: boolean
  toast: { text: string; id: number } | null
  /** Destacar brevemente un grupo completado */
  celebrate: number
  /** Dados rodando */
  rolling: boolean
  /** Contador de tiradas: cada tirada lanza de nuevo la animación 3D */
  rollSeq: number
  /** Casilla donde acaba de posarse una ficha (brilla) */
  landingAt: { tile: number; playerId: string } | null
  /** Monedas volando entre jugadores */
  moneyFx: MoneyFx[]
  /** Dinero mostrado: se actualiza cuando llegan las monedas, no antes */
  displayMoney: Record<string, number>

  newGame: (players: PlayerSetup[], quick: QuickSetup) => void
  continueGame: () => void
  quitGame: () => void
  dispatch: (a: Action) => void
  dismissCard: () => void
  dismissLanding: () => void
  setLang: (l: Lang) => void
  toggleMute: () => void
  setSound: (on: boolean) => void
  setModal: (m: Modal) => void
  toggleZoom: () => void
  showToast: (text: string) => void
}

let stepTimer: ReturnType<typeof setTimeout> | null = null
let botTimer: ReturnType<typeof setTimeout> | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null
let fxSeq = 0

const moneyOf = (g: GameState) => Object.fromEntries(g.players.map((p) => [p.id, p.money]))

const prefs = loadPrefs()
setMuted(prefs.muted)

export const useGame = create<Store>((set, get) => {
  /** Procesa la cola de eventos de uno en uno (movimientos animados, cartas…) */
  function pump() {
    if (stepTimer) return
    const { queue, game } = get()
    if (!game) return
    if (get().shownCard || get().shownLanding) return // esperando a que se cierre la ventana
    const e = queue[0]
    if (!e) {
      // Fin de la cola: el dinero mostrado coincide con el real
      set({ busy: false, landingAt: null, displayMoney: moneyOf(game) })
      scheduleBot()
      return
    }
    set({ busy: true })
    const next = (ms: number) => {
      stepTimer = setTimeout(() => { stepTimer = null; pump() }, ms)
    }
    const idx = e.type === 'move' ? game.players.findIndex((p) => p.id === e.playerId) : -1
    switch (e.type) {
      case 'move': {
        const pos = [...get().displayPos]
        if (get().landingAt) set({ landingAt: null })
        if (e.direct || pos[idx] === e.to) {
          if (e.direct && pos[idx] !== e.to) sfx.whoosh()
          pos[idx] = e.to
          set({ displayPos: pos, queue: queue.slice(1) })
          next(e.direct ? JUMP_MS : 0)
          return
        }
        pos[idx] = e.backwards ? (pos[idx] + 39) % 40 : (pos[idx] + 1) % 40
        sfx.step()
        set({ displayPos: pos })
        next(STEP_MS)
        return
      }
      case 'card': {
        sfx.card()
        set({ queue: queue.slice(1), shownCard: { cardId: e.cardId, playerId: e.playerId } })
        if (getPlayer(game, e.playerId).isBot) {
          stepTimer = setTimeout(() => { stepTimer = null; get().dismissCard() }, BOT_CARD_MS)
        }
        return
      }
      case 'land': {
        // La ficha se posa, la casilla brilla y después se abre la ventana
        if (e.outcome !== 'go') sfx.land()
        set({ queue: queue.slice(1), landingAt: { tile: e.tile, playerId: e.playerId } })
        stepTimer = setTimeout(() => {
          stepTimer = null
          const g = get().game
          if (!g) return
          const bot = getPlayer(g, e.playerId).isBot
          if ((bot ? BOT_LANDING : HUMAN_LANDING).has(e.outcome)) {
            set({ shownLanding: e })
            if (bot) stepTimer = setTimeout(() => { stepTimer = null; get().dismissLanding() }, BOT_LANDING_MS)
            return
          }
          pump()
        }, e.outcome === 'go' ? 400 : LAND_PAUSE_MS)
        return
      }
      case 'money': {
        if (e.amount <= 0) {
          set({ queue: queue.slice(1) })
          pump()
          return
        }
        // Quien paga oye monedas que caen; quien cobra, monedas que suben (al llegar)
        if (e.fromId) sfx.coinOut()
        if (e.toId) setTimeout(() => sfx.coinIn(), e.fromId ? 750 : 0)
        const fx: MoneyFx = { id: ++fxSeq, fromId: e.fromId, toId: e.toId, amount: e.amount }
        const dm = { ...get().displayMoney }
        if (e.fromId && dm[e.fromId] !== undefined) dm[e.fromId] -= e.amount
        if (e.toId && dm[e.toId] !== undefined) dm[e.toId] += e.amount
        set({ queue: queue.slice(1), moneyFx: [...get().moneyFx, fx], displayMoney: dm })
        setTimeout(() => set({ moneyFx: get().moneyFx.filter((x) => x.id !== fx.id) }), MONEY_FX_MS)
        next(MONEY_STAGGER_MS)
        return
      }
      case 'groupComplete':
        sfx.fanfare()
        set({ queue: queue.slice(1), celebrate: Date.now() })
        next(400)
        return
      case 'dice':
        sfx.dice()
        set({ queue: queue.slice(1), rolling: true, landingAt: null, rollSeq: get().rollSeq + 1 })
        stepTimer = setTimeout(() => {
          stepTimer = null
          set({ rolling: false })
          next(250)
        }, DICE_MS)
        return
      default:
        // Eventos sin animación propia: solo suenan
        switch (e.type) {
          case 'jail': sfx.jail(); break
          case 'buy': sfx.buy(); break
          case 'build': sfx.build(e.houses === 5); break
          case 'mortgage': sfx.mortgage(e.mortgaged); break
          case 'bid': sfx.bid(); break
          case 'auctionEnd': sfx.gavel(!!e.winnerId); break
          case 'trade': if (e.accepted) sfx.deal(); else sfx.noDeal(); break
          case 'bankrupt': sfx.bankrupt(); break
          case 'gameOver': sfx.victory(); break
        }
        set({ queue: queue.slice(1) })
        pump()
    }
  }

  function scheduleBot() {
    if (botTimer) clearTimeout(botTimer)
    botTimer = null
    const { game, busy, shownCard, shownLanding } = get()
    if (!game || busy || shownCard || shownLanding || game.phase === 'gameOver') return
    const id = actorId(game)
    if (!id || !getPlayer(game, id).isBot) return
    botTimer = setTimeout(() => {
      botTimer = null
      const g = get().game
      if (!g || get().busy) return
      const a = decideBot(g)
      if (a) get().dispatch(a)
    }, BOT_DELAY_MS)
  }

  function start(game: GameState) {
    if (stepTimer) clearTimeout(stepTimer)
    stepTimer = null
    set({
      game,
      savedGame: null,
      displayPos: game.players.map((p) => p.position),
      displayMoney: moneyOf(game),
      moneyFx: [],
      rolling: false,
      landingAt: null,
      queue: [],
      busy: false,
      shownCard: null,
      shownLanding: null,
      modal: { type: 'none' },
    })
    saveGame(game)
    scheduleBot()
  }

  return {
    lang: prefs.lang,
    muted: prefs.muted,
    game: null,
    savedGame: loadGame(),
    displayPos: [],
    busy: false,
    queue: [],
    shownCard: null,
    shownLanding: null,
    modal: { type: 'none' },
    rolling: false,
    rollSeq: 0,
    landingAt: null,
    moneyFx: [],
    displayMoney: {},
    zoom: false,
    toast: null,
    celebrate: 0,

    newGame: (players, quick) => {
      start(createGame({ players, quickMode: quick, seed: randomSeed(), now: Date.now() }))
    },

    continueGame: () => {
      const g = get().savedGame
      if (g) start(g)
    },

    quitGame: () => {
      if (stepTimer) clearTimeout(stepTimer)
      if (botTimer) clearTimeout(botTimer)
      stepTimer = null
      botTimer = null
      const g = get().game
      set({ game: null, savedGame: g && g.phase !== 'gameOver' ? g : null, modal: { type: 'none' }, queue: [], busy: false, shownCard: null, shownLanding: null })
    },

    dispatch: (a) => {
      const g = get().game
      if (!g) return
      const next = applyAction(g, a)
      if (next === g) return
      saveGame(next)
      set({ game: next, queue: [...get().queue, ...next.events] })
      // Cerrar modales que ya no aplican
      const m = get().modal
      if (m.type === 'confirmBankrupt' && next.phase !== 'debt') set({ modal: { type: 'none' } })
      if (m.type === 'trade' && a.type === 'proposeTrade') set({ modal: { type: 'none' } })
      pump()
      scheduleBot()
    },

    dismissCard: () => {
      set({ shownCard: null })
      pump()
    },

    dismissLanding: () => {
      set({ shownLanding: null })
      pump()
    },

    setLang: (lang) => {
      set({ lang })
      savePrefs({ lang, muted: get().muted })
      document.documentElement.lang = lang
    },

    toggleMute: () => {
      const muted = !get().muted
      set({ muted })
      setMuted(muted)
      if (!muted) sfx.test()
      savePrefs({ lang: get().lang, muted })
    },

    setSound: (on) => {
      if (get().muted === !on) return
      get().toggleMute()
    },

    setModal: (modal) => set({ modal }),
    toggleZoom: () => set({ zoom: !get().zoom }),

    showToast: (text) => {
      if (toastTimer) clearTimeout(toastTimer)
      set({ toast: { text, id: Date.now() } })
      toastTimer = setTimeout(() => set({ toast: null }), 2600)
    },
  }
})

export type { QuickMode }
