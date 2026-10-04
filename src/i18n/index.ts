import { es, type I18nKey, type Dict } from './es'
import { ca } from './ca'

export type Lang = 'es' | 'ca'
export type { I18nKey }

export const DICTS: Record<Lang, Dict> = { es, ca }

/** Traduce una clave e interpola {variables}. Función pura: el idioma se pasa explícito. */
export function translate(
  lang: Lang,
  key: I18nKey | string,
  vars?: Record<string, string | number>,
): string {
  const dict = DICTS[lang] as Record<string, string>
  let s = dict[key] ?? (es as Record<string, string>)[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  }
  return s
}

/** Formatea dinero en euros con separador de miles (1.500 €) */
export function formatMoney(amount: number): string {
  return `${amount.toLocaleString('es-ES', { useGrouping: 'always' } as Intl.NumberFormatOptions)} €`
}
