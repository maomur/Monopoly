import type { TokenId } from '../engine/state'

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

export function TokenIcon({ token, className }: { token: TokenId; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {PATHS[token]}
    </svg>
  )
}
