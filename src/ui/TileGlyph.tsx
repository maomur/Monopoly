// Iconos de trazo simple para las casillas que no son barrios.
// Un solo grosor de línea y sin relleno salvo donde ayuda a reconocerlo.
import { BOARD } from '../engine/board'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Svg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {children}
    </svg>
  )
}

const GLYPHS: Record<string, React.ReactNode> = {
  // Tren de cercanías / alta velocidad
  train: (
    <g {...S}>
      <rect x="6" y="3" width="12" height="13" rx="3" />
      <path d="M6 10h12M9 19l-2 2M15 19l2 2" />
      <circle cx="9.5" cy="13" r=".6" fill="currentColor" />
      <circle cx="14.5" cy="13" r=".6" fill="currentColor" />
    </g>
  ),
  ship: (
    <g {...S}>
      <path d="M4 15l2 4h12l2-4H4z" />
      <path d="M8 15V9h8v6M12 9V5" />
      <path d="M3 21c2 0 2-1 4.5-1S10 21 12 21s2-1 4.5-1 2.5 1 4.5 1" />
    </g>
  ),
  plane: (
    <g {...S}>
      <path d="M21 12l-8-1.5V5a1 1 0 0 0-2 0v5.5L3 12v2l8-1v5l-2.5 2h7L13 18v-5l8 1z" />
    </g>
  ),
  metro: (
    <g {...S}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M7.5 16V8l4.5 6 4.5-6v8" />
    </g>
  ),
  water: (
    <g {...S}>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
    </g>
  ),
  sorpresa: (
    <g {...S}>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14" />
      <circle cx="12" cy="17" r=".7" fill="currentColor" />
    </g>
  ),
  festa: (
    <g {...S}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="2.5" />
    </g>
  ),
  tax: (
    <g {...S}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15 8.8a4 4 0 1 0 0 6.4M7.5 11h6M7.5 13.5h6" />
    </g>
  ),
  go: (
    <g {...S} strokeWidth={2.2}>
      <path d="M20 12H5M10 6l-6 6 6 6" />
    </g>
  ),
  // Cono de tráfico: atasco en la Ronda
  jail: (
    <g {...S}>
      <path d="M9.5 5h5l3.5 13H6z" />
      <path d="M8.3 10h7.4M7.2 14h9.6M4 18h16" />
    </g>
  ),
  // Banco del parque y sol: siesta en la Ciutadella
  parking: (
    <g {...S}>
      <circle cx="17" cy="6.5" r="2.5" />
      <path d="M3 13h14M4 16h12M6 16v4M14 16v4M4 10h12" />
    </g>
  ),
  // Señal de zona de bajas emisiones
  goToJail: (
    <g {...S}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M7 14.5l1.2-3.2c.2-.5.7-.8 1.2-.8h5.2c.5 0 1 .3 1.2.8l1.2 3.2M7 14.5h10v2H7z" />
      <path d="M6 6l12 12" />
    </g>
  ),
}

/** Icono de la casilla o null si es un barrio (los barrios llevan banda de color) */
export function glyphFor(index: number): string | null {
  const t = BOARD[index]
  switch (t.kind) {
    case 'transport':
      return index === 25 ? 'ship' : index === 35 ? 'plane' : 'train'
    case 'utility':
      return index === 12 ? 'metro' : 'water'
    case 'card':
      return t.deck
    case 'tax':
      return 'tax'
    case 'go':
    case 'jail':
    case 'parking':
    case 'goToJail':
      return t.kind
    default:
      return null
  }
}

export function TileGlyph({ name, className }: { name: string; className?: string }) {
  return <Svg className={className}>{GLYPHS[name]}</Svg>
}
