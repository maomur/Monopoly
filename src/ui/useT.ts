import { useCallback } from 'react'
import { translate } from '../i18n'
import { useGame } from '../store/gameStore'

export function useT() {
  const lang = useGame((s) => s.lang)
  // La ciudad cambia los textos: al cambiarla hay que volver a traducir
  const city = useGame((s) => s.city)
  return useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, city],
  )
}
