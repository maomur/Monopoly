import type { ReactNode } from 'react'
import { BOARD, GROUP_COLORS, HOTEL, TRANSPORT_RENTS, UTILITY_MULTIPLIERS } from '../engine/board'
import { countOwnedOfKind, getPlayer, ownsFullGroup } from '../engine/queries'
import { isOwnable } from '../engine/types'
import { useGame } from '../store/gameStore'
import { tileName } from './format'
import { Money } from './primitives'
import { useT } from './useT'

/** Colores de cabecera para lo que no es un barrio */
const KIND_COLORS = {
  transport: { bg: '#1F3A5F', text: '#FFFFFF' },
  utility: { bg: '#3F5468', text: '#FFFFFF' },
  tax: { bg: '#B0442D', text: '#FFFFFF' },
  corner: { bg: '#0B5CAD', text: '#FFFFFF' },
  sorpresa: { bg: '#0B5CAD', text: '#FFFFFF' },
  festa: { bg: '#B0442D', text: '#FFFFFF' },
  goToJail: { bg: '#8E1B2C', text: '#FFFFFF' },
}

export function tileColors(index: number): { bg: string; text: string } {
  const t = BOARD[index]
  switch (t.kind) {
    case 'property': return GROUP_COLORS[t.group]
    case 'transport': return KIND_COLORS.transport
    case 'utility': return KIND_COLORS.utility
    case 'tax': return KIND_COLORS.tax
    case 'card': return KIND_COLORS[t.deck]
    case 'goToJail': return KIND_COLORS.goToJail
    default: return KIND_COLORS.corner
  }
}

function RentRow({ label, value, active }: { label: string; value: ReactNode; active?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 rounded-md px-2 py-[3px] ${active ? 'bg-sol/45 font-bold' : ''}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

/**
 * Ficha de casilla con aspecto de escritura de propiedad: cabecera de color,
 * precio y dueño, dato curioso y tabla de alquileres. `children` va al pie (botones).
 */
export function TileCard({
  index,
  headline,
  children,
  titleId,
  compact = false,
}: {
  index: number
  /** Mensaje destacado encima de la ficha (p. ej. "Pagas 26 € a Marc") */
  headline?: ReactNode
  children?: ReactNode
  titleId?: string
  /** Solo cabecera, precio y dueño (para subastas) */
  compact?: boolean
}) {
  const game = useGame((s) => s.game)!
  const lang = useGame((s) => s.lang)
  const t = useT()
  const tile = BOARD[index]
  const colors = tileColors(index)
  const own = game.ownership[index]
  const owner = own?.owner ? getPlayer(game, own.owner) : null

  let kindLabel = ''
  if (tile.kind === 'property') kindLabel = t('tileCard.group', { group: t(`group.${tile.group}`) })
  else if (tile.kind === 'transport') kindLabel = t('tileCard.transport')
  else if (tile.kind === 'utility') kindLabel = t('tileCard.utility')
  else if (tile.kind === 'tax') kindLabel = t('tileCard.tax')
  else if (tile.kind === 'card') kindLabel = t('tileCard.card')
  else kindLabel = t('tileCard.corner')

  // Fila de alquiler que se aplicaría ahora mismo
  let level = -1
  if (owner && !own.mortgaged && tile.kind === 'property') {
    level = own.houses > 0 ? own.houses + 1 : ownsFullGroup(game, owner.id, tile.group) ? 1 : 0
  }
  const transportOwned = owner && tile.kind === 'transport' ? countOwnedOfKind(game, owner.id, 'transport') : 0
  const utilityOwned = owner && tile.kind === 'utility' ? countOwnedOfKind(game, owner.id, 'utility') : 0

  return (
    <article className="popup-card overflow-hidden rounded-2xl bg-white text-ink shadow-2xl ring-1 ring-ink/10">
      {headline && <div className="bg-ink px-4 py-2.5 text-center font-display text-lg font-semibold text-white land:py-1.5">{headline}</div>}

      <header className="px-4 pb-3 pt-3 text-center land:py-2" style={{ background: colors.bg, color: colors.text }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">{kindLabel}</p>
        <h2 id={titleId} className="font-display text-2xl font-bold leading-tight [text-wrap:balance]">{tileName(lang, index)}</h2>
      </header>

      <div className={`popup-body space-y-3 px-4 py-3 land:py-2 ${isOwnable(tile) && !compact ? 'land:grid land:grid-cols-2 land:items-start land:gap-4 land:space-y-0' : ''}`}>
        <div className="space-y-3">
        {isOwnable(tile) && (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="rounded-full bg-arena px-3 py-1">
              {t('tile.price')} <Money amount={tile.price} className="font-bold" />
            </span>
            {owner ? (
              <span className="flex items-center gap-1.5 rounded-full bg-arena px-3 py-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: owner.color }} />
                {owner.name}
                {own.mortgaged && <span className="ml-1 rounded bg-terracota px-1 text-[11px] font-bold text-white">{t('manage.mortgaged')}</span>}
              </span>
            ) : (
              <span className="rounded-full bg-olivo px-3 py-1 font-semibold text-white">{t('tile.noOwner')}</span>
            )}
          </div>
        )}

        {!compact && isOwnable(tile) && (
          <blockquote className="relative rounded-xl bg-arena px-4 py-2.5 pl-8 text-[15px] italic leading-snug">
            <span aria-hidden="true" className="absolute left-2.5 top-0.5 font-display text-3xl not-italic text-terracota">“</span>
            {t(tile.factKey)}
          </blockquote>
        )}

        </div>
        <div className="space-y-3">
        {!compact && tile.kind === 'property' && (
          <>
            {own.houses > 0 && (
              <p className="text-center text-sm font-semibold">
                {own.houses === HOTEL ? '🏨 ' + t('build.hotel') : '🏠'.repeat(own.houses) + ' ' + t('build.houses', { n: own.houses })}
              </p>
            )}
            <dl className="text-sm">
              <RentRow label={t('tile.rentBase')} value={<Money amount={tile.rents[0]} />} active={level === 0} />
              <RentRow label={t('tile.groupDouble')} value={<Money amount={tile.rents[0] * 2} />} active={level === 1} />
              {[1, 2, 3, 4].map((h) => (
                <RentRow key={h} label={t(`tile.rent${h}`)} value={<Money amount={tile.rents[h]} />} active={level === h + 1} />
              ))}
              <RentRow label={t('tile.rentHotel')} value={<Money amount={tile.rents[5]} />} active={level === 6} />
            </dl>
            <p className="flex justify-between border-t border-dashed border-ink/20 pt-2 text-xs opacity-80">
              <span>{t('tile.houseCost')}: <Money amount={tile.houseCost} /></span>
              <span>{t('tile.mortgage')}: <Money amount={tile.mortgage} /></span>
            </p>
          </>
        )}

        {!compact && tile.kind === 'transport' && (
          <>
            <dl className="text-sm">
              {TRANSPORT_RENTS.map((r, i) => (
                <RentRow key={i} label={t('tile.transportN', { n: i + 1 })} value={<Money amount={r} />} active={!own.mortgaged && transportOwned === i + 1} />
              ))}
            </dl>
            <p className="border-t border-dashed border-ink/20 pt-2 text-right text-xs opacity-80">
              {t('tile.mortgage')}: <Money amount={tile.mortgage} />
            </p>
          </>
        )}

        {!compact && tile.kind === 'utility' && (
          <>
            <dl className="text-sm">
              {UTILITY_MULTIPLIERS.map((m, i) => (
                <RentRow key={i} label={t('tile.utilityN', { n: i + 1 })} value={t('tile.timesDice', { m })} active={!own.mortgaged && utilityOwned === i + 1} />
              ))}
            </dl>
            <p className="border-t border-dashed border-ink/20 pt-2 text-right text-xs opacity-80">
              {t('tile.mortgage')}: <Money amount={tile.mortgage} />
            </p>
          </>
        )}

        {tile.kind === 'tax' && <p className="text-center">{t('tile.taxInfo', { amount: tile.amount })}</p>}
        {tile.kind === 'card' && <p className="text-center">{t('tile.cardInfo')}</p>}
        {tile.kind === 'go' && <p className="text-center">{t('tile.goInfo')}</p>}
        {tile.kind === 'jail' && <p className="text-center">{t('tile.jailInfo')}</p>}
        {tile.kind === 'parking' && <p className="text-center">{t('tile.parkingInfo')}</p>}
        {tile.kind === 'goToJail' && <p className="text-center">{t('tile.goToJailInfo')}</p>}
        </div>
      </div>

      {children && <footer className="popup-foot space-y-2 border-t border-ink/10 bg-arena/60 px-4 py-3">{children}</footer>}
    </article>
  )
}
