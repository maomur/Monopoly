import type { TokenId } from '../engine/state'
import { activeCity } from '../cities'

// Fichas originales, trazos simples (se pulirán en la fase de diseño)
const PATHS: Record<TokenId, React.ReactNode> = {
  // Torres puntiagudas
  sagrada: (
    <g fill="currentColor">
      <path d="M6 22 L8 6 L10 22Z" />
      <path d="M10.5 22 L12 2 L13.5 22Z" />
      <path d="M14 22 L16 6 L18 22Z" />
      <rect x="4" y="20" width="16" height="2.5" rx="1" />
    </g>
  ),
  patinete: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M15 4 L17 17 M13 4 h5 M6 17 h11" />
      <circle cx="6" cy="19" r="2.2" fill="currentColor" />
      <circle cx="17.5" cy="19" r="2.2" fill="currentColor" />
    </g>
  ),
  gaviota: (
    <path
      d="M2 12 Q7 6 12 12 Q17 6 22 12 Q17 9.5 12 15 Q7 9.5 2 12Z"
      fill="currentColor"
    />
  ),
  tranvia: (
    <g fill="currentColor">
      <rect x="4" y="6" width="16" height="12" rx="3" />
      <rect x="6.5" y="8.5" width="4.5" height="4" rx="1" fill="#fff" />
      <rect x="13" y="8.5" width="4.5" height="4" rx="1" fill="#fff" />
      <path d="M12 6 L9 2 M12 6 L15 2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="20" r="1.8" />
      <circle cx="16" cy="20" r="1.8" />
    </g>
  ),
  // Torre humana: tres pisos de cabezas
  castell: (
    <g fill="currentColor">
      <circle cx="12" cy="4" r="2.2" />
      <circle cx="9" cy="10" r="2.2" />
      <circle cx="15" cy="10" r="2.2" />
      <circle cx="6" cy="16.5" r="2.2" />
      <circle cx="12" cy="16.5" r="2.2" />
      <circle cx="18" cy="16.5" r="2.2" />
      <rect x="3" y="20" width="18" height="2.5" rx="1" />
    </g>
  ),
  // Flor de cuatro pétalos de la baldosa
  panot: (
    <g fill="currentColor">
      <ellipse cx="12" cy="6" rx="3" ry="4.5" />
      <ellipse cx="12" cy="18" rx="3" ry="4.5" />
      <ellipse cx="6" cy="12" rx="4.5" ry="3" />
      <ellipse cx="18" cy="12" rx="4.5" ry="3" />
      <circle cx="12" cy="12" r="2.2" fill="#fff" />
    </g>
  ),
}

export const TOKEN_LABEL_KEY: Record<TokenId, string> = {
  sagrada: 'token.sagrada',
  patinete: 'token.patinete',
  gaviota: 'token.gaviota',
  tranvia: 'token.tranvia',
  castell: 'token.castell',
  panot: 'token.panot',
}

/** Fichas de Roma (las que no aparecen se comparten con Barcelona) */
const ROMA_PATHS: Partial<Record<TokenId, React.ReactNode>> = {
  // Coliseo: dos pisos de arcos (huecos recortados) y el borde roto
  sagrada: (
    <g fill="currentColor">
      <path fillRule="evenodd" d="M2 21 V10 Q2 6 12 6 Q22 6 22 9 V21Z M4.5 13 v-2 a1.2 1.2 0 0 1 2.4 0 v2Z M4.5 19 v-2.5 a1.2 1.2 0 0 1 2.4 0 V19Z M8.5 13 v-2 a1.2 1.2 0 0 1 2.4 0 v2Z M8.5 19 v-2.5 a1.2 1.2 0 0 1 2.4 0 V19Z M12.5 13 v-2 a1.2 1.2 0 0 1 2.4 0 v2Z M12.5 19 v-2.5 a1.2 1.2 0 0 1 2.4 0 V19Z M16.5 13 v-2 a1.2 1.2 0 0 1 2.4 0 v2Z M16.5 19 v-2.5 a1.2 1.2 0 0 1 2.4 0 V19Z" />
      <path d="M17 6 L22 4 V9Z" />
    </g>
  ),
  // Vespa de lado
  patinete: (
    <g fill="currentColor">
      <path d="M5 16 Q5 11 10 11 H13 L15 6 H17 L15.5 11 Q20 11 20 16Z" />
      <rect x="14" y="4.5" width="5" height="1.8" rx="0.9" />
      <circle cx="6.5" cy="18" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <rect x="8" y="9.2" width="5" height="1.8" rx="0.9" />
    </g>
  ),
  // Cucurucho de helado con dos bolas
  castell: (
    <g fill="currentColor">
      <circle cx="9.5" cy="8" r="3.6" />
      <circle cx="14.5" cy="8" r="3.6" />
      <circle cx="12" cy="4.6" r="3.2" />
      <path d="M6.5 11 H17.5 L12 22.5Z" />
      <path d="M8.5 13.5 L14 18 M15.5 13.5 L10 18" stroke="#fff" strokeWidth="1" opacity=".7" />
    </g>
  ),
  // Sampietrino: adoquines en diagonal
  panot: (
    <g fill="currentColor" transform="rotate(45 12 12)">
      <rect x="5" y="5" width="6.4" height="6.4" rx="1.2" />
      <rect x="12.6" y="5" width="6.4" height="6.4" rx="1.2" />
      <rect x="5" y="12.6" width="6.4" height="6.4" rx="1.2" />
      <rect x="12.6" y="12.6" width="6.4" height="6.4" rx="1.2" />
    </g>
  ),
}

export function TokenIcon({ token, className }: { token: TokenId; className?: string }) {
  const path = (activeCity() === 'roma' && ROMA_PATHS[token]) || PATHS[token]
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {path}
    </svg>
  )
}
