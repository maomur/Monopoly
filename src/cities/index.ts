import type { CityId, CityInfo } from './types'
import { ROMA } from './roma'

export type { CityId, CityInfo }

/** Marca común de la app (provisional: se cambia aquí y en index.html / manifiesto) */
export const BRAND = 'Tycoon'

export const CITIES: CityInfo[] = [
  {
    id: 'bcn',
    name: 'Barcelona',
    country: 'España',
    flag: '🇪🇸',
    available: true,
    colors: { from: '#1572CF', to: '#073B73', accent: '#FFC930' },
  },
  ROMA,
  {
    id: 'medellin',
    name: 'Medellín',
    country: 'Colombia',
    flag: '🇨🇴',
    available: false,
    colors: { from: '#2E8B57', to: '#0F4A2C', accent: '#FFD23F' },
  },
]

export const cityInfo = (id: CityId): CityInfo => CITIES.find((c) => c.id === id) ?? CITIES[0]

// Ciudad activa: decide qué textos se muestran (la fija el store al elegir ciudad o cargar partida)
let active: CityId = 'bcn'
export const setActiveCity = (id: CityId) => {
  active = id
}
export const activeCity = () => active

/** Texto de la ciudad activa para esta clave, si la ciudad lo redefine */
export function cityString(lang: 'es' | 'ca', key: string): string | undefined {
  const s = cityInfo(active).strings
  if (!s) return undefined
  return (lang === 'ca' ? s.ca?.[key] : undefined) ?? s.es[key]
}
