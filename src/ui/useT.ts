import { useCallback } from 'react'
import { translate } from '../i18n'
import { useGame } from '../store/gameStore'

export function useT() {
  const lang = useGame((s) => s.lang)
  return useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  )
}
