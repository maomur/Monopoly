// ============================================================
//  BCN Tycoon — mazos de cartas (EDITABLE)
//  Los textos están en src/i18n (claves card.*)
// ============================================================
import type { Card } from './types'

export const SORPRESA_CARDS: Card[] = [
  { id: 's01', deck: 'sorpresa', textKey: 'card.s01', effect: { type: 'moveTo', target: 25 } },
  { id: 's02', deck: 'sorpresa', textKey: 'card.s02', effect: { type: 'moveBack', steps: 3 } },
  { id: 's03', deck: 'sorpresa', textKey: 'card.s03', effect: { type: 'moveTo', target: 0 } },
  { id: 's04', deck: 'sorpresa', textKey: 'card.s04', effect: { type: 'moveTo', target: 39 } },
  { id: 's05', deck: 'sorpresa', textKey: 'card.s05', effect: { type: 'moveTo', target: 24 } },
  { id: 's06', deck: 'sorpresa', textKey: 'card.s06', effect: { type: 'moveTo', target: 11 } },
  { id: 's07', deck: 'sorpresa', textKey: 'card.s07', effect: { type: 'nearest', kind: 'transport', rentMultiplier: 2 } },
  { id: 's08', deck: 'sorpresa', textKey: 'card.s08', effect: { type: 'nearest', kind: 'utility', rentMultiplier: 10 } },
  { id: 's09', deck: 'sorpresa', textKey: 'card.s09', effect: { type: 'goToJail' } },
  { id: 's10', deck: 'sorpresa', textKey: 'card.s10', effect: { type: 'jailFree' } },
  { id: 's11', deck: 'sorpresa', textKey: 'card.s11', effect: { type: 'money', amount: -50 } },
  { id: 's12', deck: 'sorpresa', textKey: 'card.s12', effect: { type: 'money', amount: 150 } },
  { id: 's13', deck: 'sorpresa', textKey: 'card.s13', effect: { type: 'repairs', perHouse: 25, perHotel: 100 } },
  { id: 's14', deck: 'sorpresa', textKey: 'card.s14', effect: { type: 'money', amount: -15 } },
  { id: 's15', deck: 'sorpresa', textKey: 'card.s15', effect: { type: 'eachPlayer', amount: -50 } },
  { id: 's16', deck: 'sorpresa', textKey: 'card.s16', effect: { type: 'moveTo', target: 5 } },
]

export const FESTA_CARDS: Card[] = [
  { id: 'f01', deck: 'festa', textKey: 'card.f01', effect: { type: 'money', amount: 100 } },
  { id: 'f02', deck: 'festa', textKey: 'card.f02', effect: { type: 'eachPlayer', amount: -20 } },
  { id: 'f03', deck: 'festa', textKey: 'card.f03', effect: { type: 'eachPlayer', amount: 10 } },
  { id: 'f04', deck: 'festa', textKey: 'card.f04', effect: { type: 'money', amount: 200 } },
  { id: 'f05', deck: 'festa', textKey: 'card.f05', effect: { type: 'money', amount: -50 } },
  { id: 'f06', deck: 'festa', textKey: 'card.f06', effect: { type: 'money', amount: 50 } },
  { id: 'f07', deck: 'festa', textKey: 'card.f07', effect: { type: 'jailFree' } },
  { id: 'f08', deck: 'festa', textKey: 'card.f08', effect: { type: 'goToJail' } },
  { id: 'f09', deck: 'festa', textKey: 'card.f09', effect: { type: 'moveTo', target: 0 } },
  { id: 'f10', deck: 'festa', textKey: 'card.f10', effect: { type: 'money', amount: 20 } },
  { id: 'f11', deck: 'festa', textKey: 'card.f11', effect: { type: 'money', amount: -100 } },
  { id: 'f12', deck: 'festa', textKey: 'card.f12', effect: { type: 'money', amount: 100 } },
  { id: 'f13', deck: 'festa', textKey: 'card.f13', effect: { type: 'money', amount: 25 } },
  { id: 'f14', deck: 'festa', textKey: 'card.f14', effect: { type: 'repairs', perHouse: 40, perHotel: 115 } },
  { id: 'f15', deck: 'festa', textKey: 'card.f15', effect: { type: 'money', amount: -50 } },
  { id: 'f16', deck: 'festa', textKey: 'card.f16', effect: { type: 'money', amount: 10 } },
]

export const ALL_CARDS: Card[] = [...SORPRESA_CARDS, ...FESTA_CARDS]
export const CARD_BY_ID: Record<string, Card> = Object.fromEntries(ALL_CARDS.map((c) => [c.id, c]))
