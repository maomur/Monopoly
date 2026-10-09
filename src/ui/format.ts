import { BOARD } from '../engine/board'
import type { LogEntry } from '../engine/state'
import { formatMoney, translate, type Lang } from '../i18n'
import { cityString } from '../cities'

/** Nombre visible de una casilla en el idioma actual */
export function tileName(lang: Lang, index: number): string {
  const t = BOARD[index]
  if (t.kind === 'tax') return translate(lang, t.nameKey)
  if (t.kind === 'card') return translate(lang, `deck.${t.deck}`)
  if (t.kind === 'go') return translate(lang, 'tile.go.short')
  if (t.kind === 'jail' || t.kind === 'parking' || t.kind === 'goToJail') return translate(lang, t.nameKey)
  return cityString(lang, `tname.${index}`) ?? t.name
}

/** Nombre corto para la celda del tablero */
export function tileShort(lang: Lang, index: number): string {
  const t = BOARD[index]
  switch (t.kind) {
    case 'go': return translate(lang, 'tile.go.short')
    case 'jail': return translate(lang, 'short.jail')
    case 'parking': return translate(lang, 'short.parking')
    case 'goToJail': return translate(lang, 'short.goToJail')
    case 'card': return translate(lang, t.deck === 'sorpresa' ? 'short.sorpresa' : 'short.festa')
    case 'tax': return translate(lang, t.nameKey)
    default: return cityString(lang, `tname.${index}`) ?? t.name
  }
}

export function logText(lang: Lang, e: LogEntry): string {
  const vars: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(e.vars ?? {})) {
    vars[k] = k === 'amount' && typeof v === 'number' ? formatMoney(v) : v
  }
  for (const [k, v] of Object.entries(e.tiles ?? {})) vars[k] = tileName(lang, v)
  for (const [k, v] of Object.entries(e.texts ?? {})) vars[k] = translate(lang, v)
  return translate(lang, e.key, vars)
}

export { formatMoney }
