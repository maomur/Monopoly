import { STATE_VERSION, type GameState } from '../engine/state'
import type { Lang } from '../i18n'

const SAVE_KEY = 'bcn-tycoon:save'
const PREFS_KEY = 'bcn-tycoon:prefs'

export interface Prefs {
  lang: Lang
  muted: boolean
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export function loadGame(): GameState | null {
  return safe(() => {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const g = JSON.parse(raw) as GameState
    if (g.version !== STATE_VERSION || g.phase === 'gameOver') return null
    return g
  }, null)
}

export function saveGame(g: GameState | null): void {
  safe(() => {
    if (!g || g.phase === 'gameOver') localStorage.removeItem(SAVE_KEY)
    // events no hace falta guardarlos
    else localStorage.setItem(SAVE_KEY, JSON.stringify({ ...g, events: [] }))
  }, undefined)
}

export function loadPrefs(): Prefs {
  return safe(() => {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>
    return { lang: p.lang === 'ca' ? 'ca' : 'es', muted: !!p.muted }
  }, { lang: 'es', muted: false })
}

export function savePrefs(p: Prefs): void {
  safe(() => localStorage.setItem(PREFS_KEY, JSON.stringify(p)), undefined)
}
