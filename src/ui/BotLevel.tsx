// Selector y etiqueta del nivel de los bots
import { BOT_LEVELS, type BotLevel } from '../engine/state'
import { useT } from './useT'

export const BOT_LEVEL_ICON: Record<BotLevel, string> = { beginner: '🌱', intermediate: '🎯', expert: '🧠' }

export function BotLevelPicker({ value, onChange, compact = false }: { value: BotLevel; onChange: (l: BotLevel) => void; compact?: boolean }) {
  const t = useT()
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t('bot.level')}>
        {BOT_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={value === l}
            onClick={() => onChange(l)}
            className={`min-h-10 whitespace-nowrap rounded-lg border-2 px-0.5 text-[13px] font-semibold leading-tight max-[359px]:text-[11px] ${value === l ? 'border-mar bg-mar text-white' : 'border-mar/25 bg-white text-mar-deep'}`}
          >
            {BOT_LEVEL_ICON[l]} {t(`bot.${l}`)}
          </button>
        ))}
      </div>
      {!compact && <p className="mt-1 text-xs opacity-70">{t(`bot.${value}.hint`)}</p>}
    </div>
  )
}

/** "🧠 Experto" junto al nombre de un bot */
export function BotBadge({ level }: { level?: BotLevel }) {
  const t = useT()
  const l = level ?? 'intermediate'
  return (
    <span className="ml-1 whitespace-nowrap rounded-full bg-ink/8 px-1.5 py-0.5 text-[11px] font-semibold" title={t('bot.level')}>
      🤖 {BOT_LEVEL_ICON[l]} {t(`bot.${l}`)}
    </span>
  )
}
