// Ciudades: el juego (reglas, precios, bots) es el mismo; cada ciudad aporta su "piel":
// nombres de casillas, cartas, datos curiosos, fichas y textos.
export type CityId = 'bcn' | 'roma' | 'medellin' | 'buenosaires'

/** Textos de la ciudad que sustituyen a los de Barcelona (claves de i18n, p. ej. 'card.s01', 'tname.21') */
export type CityStrings = Record<string, string>

export interface CityInfo {
  id: CityId
  /** Nombre visible en el selector */
  name: string
  country: string
  flag: string
  /** Jugable o "próximamente" */
  available: boolean
  /** Colores de la tarjeta del selector */
  colors: { from: string; to: string; accent: string }
  /** Iconos propios de algunas casillas (índice → icono), p. ej. terminal de autobús en vez de puerto */
  glyphs?: Record<number, string>
  /** Textos propios por idioma (el catalán cae al castellano si falta algo) */
  strings?: { es: CityStrings; ca?: CityStrings }
}
