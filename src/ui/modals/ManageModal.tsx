import { BOARD, GROUP_COLORS, HOTEL } from '../../engine/board'
import { getPlayer, ownableTile, tilesOwnedBy, unmortgageCost } from '../../engine/queries'
import { canBuild, canMortgage, canSell, canUnmortgage, managerId } from '../../engine/validate'
import { useGame } from '../../store/gameStore'
import { tileName } from '../format'
import { ActionButton, Money, Sheet } from '../primitives'
import { useT } from '../useT'

export function buildingLabel(houses: number, t: (k: string, v?: Record<string, string | number>) => string) {
  if (houses === HOTEL) return t('build.hotel')
  if (houses === 0) return t('build.none')
  return t('build.houses', { n: houses })
}

export function ManageModal() {
  const game = useGame((s) => s.game)!
  const lang = useGame((s) => s.lang)
  const dispatch = useGame((s) => s.dispatch)
  const setModal = useGame((s) => s.setModal)
  const t = useT()
  const pid = managerId(game)
  const p = getPlayer(game, pid)
  const tiles = tilesOwnedBy(game, pid)
  const close = () => setModal({ type: 'none' })

  return (
    <Sheet
      title={<>{t('manage.title')} · {p.name}</>}
      onClose={close}
      footer={
        <div className="flex items-center justify-between">
          <span>{t('ui.cash')}: <Money amount={p.money} className="font-bold" /></span>
          <ActionButton ignoreBusy variant="primary" onClick={close}>{t('ui.done')}</ActionButton>
        </div>
      }
    >
      {tiles.length === 0 && <p className="py-4 text-center opacity-70">{t('manage.empty')}</p>}
      <p className="mb-2 text-sm opacity-75">{t('manage.hint')}</p>
      <ul className="divide-y divide-ink/10">
        {tiles.map((i) => {
          const tile = ownableTile(i)
          const own = game.ownership[i]
          return (
            <li key={i} className="py-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-4 w-4 shrink-0 rounded"
                  style={{ background: tile.kind === 'property' ? GROUP_COLORS[tile.group].bg : '#9AA5B1' }}
                />
                <span className="flex-1 font-semibold">{tileName(lang, i)}</span>
                <span className="text-sm opacity-75">
                  {own.mortgaged ? t('manage.mortgaged') : tile.kind === 'property' ? buildingLabel(own.houses, t) : ''}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {BOARD[i].kind === 'property' && tile.kind === 'property' && (
                  <>
                    <ActionButton check={canBuild(game, i)} onClick={() => dispatch({ type: 'build', tile: i })}>
                      + {own.houses === 4 ? t('build.hotelShort') : t('build.houseShort')} (<Money amount={tile.houseCost} />)
                    </ActionButton>
                    <ActionButton check={canSell(game, i)} onClick={() => dispatch({ type: 'sell', tile: i })}>
                      − {t('build.sell')} (+<Money amount={Math.floor(tile.houseCost / 2)} />)
                    </ActionButton>
                  </>
                )}
                {own.mortgaged ? (
                  <ActionButton check={canUnmortgage(game, i)} onClick={() => dispatch({ type: 'unmortgage', tile: i })}>
                    {t('action.unmortgage')} (−<Money amount={unmortgageCost(i)} />)
                  </ActionButton>
                ) : (
                  <ActionButton check={canMortgage(game, i)} onClick={() => dispatch({ type: 'mortgage', tile: i })}>
                    {t('action.mortgage')} (+<Money amount={tile.mortgage} />)
                  </ActionButton>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
