import { BOARD, GROUP_COLORS, GROUPS, TRANSPORT_RENTS, UTILITY_MULTIPLIERS } from '../../engine/board'
import { CARD_BY_ID } from '../../engine/cards'
import { getPlayer, netWorth, rentFor } from '../../engine/queries'
import { isOwnable } from '../../engine/types'
import { useGame } from '../../store/gameStore'
import { tileName } from '../format'
import { ActionButton, Money, Sheet } from '../primitives'
import { TokenIcon } from '../Token'
import { LangToggle } from '../Header'
import { useT } from '../useT'
import { buildingLabel } from './ManageModal'

export function TileModal({ index }: { index: number }) {
  const game = useGame((s) => s.game)!
  const lang = useGame((s) => s.lang)
  const setModal = useGame((s) => s.setModal)
  const t = useT()
  const tile = BOARD[index]
  const own = game.ownership[index]
  const owner = own?.owner ? getPlayer(game, own.owner) : null
  const close = () => setModal({ type: 'none' })
  const RENT_LABELS = ['tile.rentBase', 'tile.rent1', 'tile.rent2', 'tile.rent3', 'tile.rent4', 'tile.rentHotel']

  return (
    <Sheet title={tileName(lang, index)} onClose={close}>
      {tile.kind === 'property' && (
        <div className="-mx-4 -mt-3 mb-3 h-3" style={{ background: GROUP_COLORS[tile.group].bg }} />
      )}
      {isOwnable(tile) && <p className="mb-3 italic">{t(tile.factKey)}</p>}
      {isOwnable(tile) && (
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
          <dt>{t('tile.price')}</dt><dd className="text-right"><Money amount={tile.price} /></dd>
          <dt>{t('tile.owner')}</dt>
          <dd className="text-right">{owner ? owner.name : t('tile.noOwner')}</dd>
          {tile.kind === 'property' && (
            <>
              {tile.rents.map((r, i) => (
                <div key={i} className={`contents ${own.houses === i && owner ? 'font-bold' : ''}`}>
                  <dt>{t(RENT_LABELS[i])}</dt>
                  <dd className="text-right"><Money amount={r} /></dd>
                </div>
              ))}
              <dt>{t('tile.groupDouble')}</dt><dd className="text-right"><Money amount={tile.rents[0] * 2} /></dd>
              <dt>{t('tile.houseCost')}</dt><dd className="text-right"><Money amount={tile.houseCost} /></dd>
              {owner && <><dt>{t('tile.buildings')}</dt><dd className="text-right">{buildingLabel(own.houses, t)}</dd></>}
            </>
          )}
          {tile.kind === 'transport' &&
            TRANSPORT_RENTS.map((r, i) => (
              <div key={i} className="contents">
                <dt>{t('tile.transportN', { n: i + 1 })}</dt><dd className="text-right"><Money amount={r} /></dd>
              </div>
            ))}
          {tile.kind === 'utility' &&
            UTILITY_MULTIPLIERS.map((m, i) => (
              <div key={i} className="contents">
                <dt>{t('tile.utilityN', { n: i + 1 })}</dt><dd className="text-right">{t('tile.timesDice', { m })}</dd>
              </div>
            ))}
          <dt>{t('tile.mortgage')}</dt><dd className="text-right"><Money amount={tile.mortgage} /></dd>
          {owner && (
            <>
              <dt className="font-semibold">{t('tile.currentRent')}</dt>
              <dd className="text-right font-semibold">
                {own.mortgaged ? t('manage.mortgaged') : tile.kind === 'utility' ? t('tile.timesDice', { m: rentFor(game, index, 1) }) : <Money amount={rentFor(game, index, 0)} />}
              </dd>
            </>
          )}
        </dl>
      )}
      {tile.kind === 'tax' && <p>{t('tile.taxInfo', { amount: tile.amount })}</p>}
      {tile.kind === 'card' && <p>{t('tile.cardInfo')}</p>}
      {tile.kind === 'go' && <p>{t('tile.goInfo')}</p>}
      {tile.kind === 'jail' && <p>{t('tile.jailInfo')}</p>}
      {tile.kind === 'parking' && <p>{t('tile.parkingInfo')}</p>}
      {tile.kind === 'goToJail' && <p>{t('tile.goToJailInfo')}</p>}
    </Sheet>
  )
}

export function CardModal() {
  const card = useGame((s) => s.shownCard)!
  const game = useGame((s) => s.game)!
  const dismiss = useGame((s) => s.dismissCard)
  const t = useT()
  const c = CARD_BY_ID[card.cardId]
  const p = getPlayer(game, card.playerId)
  const sorpresa = c.deck === 'sorpresa'
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-6" role="dialog" aria-modal="true" aria-labelledby="card-title">
      <div className="card-flip w-full max-w-xs">
        <div
          className={`rounded-2xl border-4 p-5 text-center shadow-2xl ${sorpresa ? 'border-mar bg-white' : 'border-terracota bg-white'}`}
        >
          <p id="card-title" className={`font-display text-xl font-bold ${sorpresa ? 'text-mar' : 'text-terracota'}`}>
            {sorpresa ? '?' : '★'} {t(`deck.${c.deck}`)}
          </p>
          <p className="mt-1 text-sm opacity-70">{p.name}</p>
          <p className="my-5 text-lg leading-snug">{t(c.textKey)}</p>
          <button
            type="button"
            autoFocus
            onClick={dismiss}
            className="min-h-12 w-full rounded-xl bg-terracota px-4 font-display text-lg font-semibold text-white"
          >
            {p.isBot ? t('ui.ok') : t('ui.continue')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConfirmBankruptModal() {
  const game = useGame((s) => s.game)!
  const dispatch = useGame((s) => s.dispatch)
  const setModal = useGame((s) => s.setModal)
  const t = useT()
  const d = game.debts[0]
  if (!d) return null
  const close = () => setModal({ type: 'none' })
  return (
    <Sheet
      title={t('bankrupt.title')}
      onClose={close}
      footer={
        <div className="flex gap-2">
          <ActionButton className="flex-1" onClick={close}>{t('ui.cancel')}</ActionButton>
          <ActionButton variant="danger" className="flex-1" onClick={() => { close(); dispatch({ type: 'bankrupt' }) }}>
            {t('bankrupt.confirm')}
          </ActionButton>
        </div>
      }
    >
      <p>
        {d.creditorId
          ? t('bankrupt.toPlayer', { name: getPlayer(game, d.debtorId).name, creditor: getPlayer(game, d.creditorId).name })
          : t('bankrupt.toBank', { name: getPlayer(game, d.debtorId).name })}
      </p>
    </Sheet>
  )
}

export function GameOverModal() {
  const game = useGame((s) => s.game)!
  const quit = useGame((s) => s.quitGame)
  const t = useT()
  const winner = getPlayer(game, game.winnerId!)
  const ranking = [...game.players].sort((a, b) => netWorth(game, b.id) - netWorth(game, a.id))
  return (
    <Sheet title={t('gameOver.title')} closable={false}
      footer={<ActionButton big variant="primary" className="w-full" onClick={quit}>{t('gameOver.newGame')}</ActionButton>}
    >
      <div className="py-2 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full text-white" style={{ background: winner.color }}>
          <TokenIcon token={winner.token} className="h-14 w-14" />
        </div>
        <p className="mt-2 font-display text-2xl font-bold">{t('gameOver.winner', { name: winner.name })}</p>
      </div>
      <ol className="mt-2 space-y-1">
        {ranking.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2">
            <span className="w-5 font-bold">{i + 1}.</span>
            <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
            <span className="flex-1">{p.name}{p.bankrupt ? ` · ${t('players.bankrupt')}` : ''}</span>
            <Money amount={netWorth(game, p.id)} />
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs opacity-70">{t('gameOver.netWorthNote')}</p>
    </Sheet>
  )
}

export function MenuModal() {
  const setModal = useGame((s) => s.setModal)
  const quit = useGame((s) => s.quitGame)
  const t = useT()
  const close = () => setModal({ type: 'none' })
  return (
    <Sheet title={t('menu.title')} onClose={close}>
      <div className="grid gap-2 pb-2">
        <div className="flex items-center justify-between">
          <span>{t('ui.language')}</span>
          <LangToggle />
        </div>
        <ActionButton onClick={() => setModal({ type: 'help' })}>{t('ui.help')}</ActionButton>
        <ActionButton onClick={quit}>{t('menu.exit')}</ActionButton>
        <p className="text-sm opacity-70">{t('menu.saved')}</p>
      </div>
    </Sheet>
  )
}

export function HelpModal() {
  const setModal = useGame((s) => s.setModal)
  const t = useT()
  const rules = ['rules.goal', 'rules.turn', 'rules.buy', 'rules.rent', 'rules.build', 'rules.mortgage', 'rules.jail', 'rules.trade', 'rules.bankrupt', 'rules.quick']
  return (
    <Sheet title={t('ui.help')} onClose={() => setModal({ type: 'none' })}>
      <ul className="list-disc space-y-2 pb-2 pl-5">
        {rules.map((k) => <li key={k}>{t(k)}</li>)}
      </ul>
      <p className="mb-2 text-sm opacity-70">{t('rules.groups', { n: Object.keys(GROUPS).length })}</p>
    </Sheet>
  )
}
