// Estado de la app: partida (motor puro) + estado de interfaz + cola de animaciones + bots.
import { create } from 'zustand'
import type { Action } from '../engine/actions'
import { actorId, decideBot } from '../engine/bot'
import { getPlayer } from '../engine/queries'
import { applyAction } from '../engine/reducer'
import { randomSeed } from '../engine/rng'
import { createGame, type GameEvent, type GameState, type PlayerSetup, type QuickMode } from '../engine/state'
import type { Lang } from '../i18n'
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

const STEP_MS = 140
const BOT_DELAY_MS = 650
const BOT_CARD_MS = 1800

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
  modal: Modal
  zoom: boolean
  toast: { text: string; id: number } | null
  /** Destacar brevemente un grupo completado */
  celebrate: number

  newGame: (players: PlayerSetup[], quick: QuickSetup) => void
  continueGame: () => void
  quitGame: () => void
  dispatch: (a: Action) => void
  dismissCard: () => void
  setLang: (l: Lang) => void
  toggleMute: () => void
  setModal: (m: Modal) => void
  toggleZoom: () => void
  showToast: (text: string) => void
}

let stepTimer: ReturnType<typeof setTimeout> | null = null
let botTimer: ReturnType<typeof setTimeout> | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null

const prefs = loadPrefs()

export const useGame = create<Store>((set, get) => {
  /** Procesa la cola de eventos de uno en uno (movimientos animados, cartas…) */
  function pump() {
    if (stepTimer) return
    const { queue, game } = get()
    if (!game) return
    if (get().shownCard) return // esperando a que se cierre la carta
    const e = queue[0]
    if (!e) {
      set({ busy: false })
      scheduleBot()
      return
    }
    set({ busy: true })
    const idx = e.type === 'move' ? game.players.findIndex((p) => p.id === e.playerId) : -1
    switch (e.type) {
      case 'move': {
        const pos = [...get().displayPos]
        if (e.direct || pos[idx] === e.to) {
          pos[idx] = e.to
          set({ displayPos: pos, queue: queue.slice(1) })
          stepTimer = setTimeout(() => { stepTimer = null; pump() }, e.direct ? 350 : 0)
          return
        }
        pos[idx] = e.backwards ? (pos[idx] + 39) % 40 : (pos[idx] + 1) % 40
        set({ displayPos: pos })
        stepTimer = setTimeout(() => { stepTimer = null; pump() }, STEP_MS)
        return
      }
      case 'card': {
        set({ queue: queue.slice(1), shownCard: { cardId: e.cardId, playerId: e.playerId } })
        if (getPlayer(game, e.playerId).isBot) {
          stepTimer = setTimeout(() => { stepTimer = null; get().dismissCard() }, BOT_CARD_MS)
        }
        return
      }
      case 'groupComplete':
        set({ queue: queue.slice(1), celebrate: Date.now() })
        pump()
        return
      case 'dice':
        set({ queue: queue.slice(1) })
        stepTimer = setTimeout(() => { stepTimer = null; pump() }, 450)
        return
      default:
        set({ queue: queue.slice(1) })
        pump()
    }
  }

  function scheduleBot() {
    if (botTimer) clearTimeout(botTimer)
    botTimer = null
    const { game, busy, shownCard } = get()
    if (!game || busy || shownCard || game.phase === 'gameOver') return
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
      queue: [],
      busy: false,
      shownCard: null,
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
    modal: { type: 'none' },
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
      set({ game: null, savedGame: g && g.phase !== 'gameOver' ? g : null, modal: { type: 'none' }, queue: [], busy: false, shownCard: null })
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

    setLang: (lang) => {
      set({ lang })
      savePrefs({ lang, muted: get().muted })
      document.documentElement.lang = lang
    },

    toggleMute: () => {
      const muted = !get().muted
      set({ muted })
      savePrefs({ lang: get().lang, muted })
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
