import { useState } from 'react'
import { GROUP_COLORS, JAIL_FINE } from '../engine/board'
import { actorId } from '../engine/bot'
import { getPlayer, ownableTile } from '../engine/queries'
import {
  canBankrupt, canBuy, canEndTurn, canPayDebt, canPayJail, canRoll,
  canUseJailCard, minBid,
} from '../engine/validate'
import { useGame } from '../store/gameStore'
import { tileName } from './format'
import { ActionButton, Money } from './primitives'
import { TokenIcon } from './Token'
import { TradeSummary } from './modals/TradeModal'
import { useT } from './useT'

function Who({ id }: { id: string }) {
  const game = useGame((s) => s.game)!
  const p = getPlayer(game, id)
  return (
    <span className="inline-flex items-center gap-1 font-semibold">
      <span className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: p.color }}>
        <TokenIcon token={p.token} className="h-4 w-4" />
      </span>
      {p.name}
    </span>
  )
}

function AuctionPanel() {
  const game = useGame((s) => s.game)!
  const dispatch = useGame((s) => s.dispatch)
  const lang = useGame((s) => s.lang)
  const t = useT()
  const a = game.auction!
  const bidder = a.bidders[a.turn]
  const p = getPlayer(game, bidder)
  const min = minBid(game)
  const [custom, setCustom] = useState('')
  const tile = ownableTile(a.tile)
  const steps = [min, Math.ceil((min + 10) / 10) * 10, Math.ceil((min + 50) / 10) * 10].filter(
    (v, i, arr) => arr.indexOf(v) === i && v <= p.money,
  )

  return (
    <div className="space-y-2">
      <p className="text-sm">
        {t('auction.title', { tile: tileName(lang, a.tile) })} · {t('auction.value')} <Money amount={tile.price} />
      </p>
      <p className="text-sm">
        {a.highestBidder ? (
          <>{t('auction.highest')} <Money amount={a.highestBid} className="font-bold" /> ({getPlayer(game, a.highestBidder).name})</>
        ) : (
          t('auction.noBids')
        )}
      </p>
      <p className="text-sm">{t('auction.turn')} <Who id={bidder} /> · <Money amount={p.money} /></p>
      <div className="flex flex-wrap gap-2">
        {steps.map((v) => (
          <ActionButton key={v} variant="primary" onClick={() => dispatch({ type: 'bid', playerId: bidder, amount: v })}>
            {t('auction.bid')} <Money amount={v} />
          </ActionButton>
        ))}
        <form
          className="flex gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            const v = Number(custom)
            if (Number.isFinite(v)) dispatch({ type: 'bid', playerId: bidder, amount: Math.floor(v) })
            setCustom('')
          }}
        >
          <label className="sr-only" htmlFor="custom-bid">{t('auction.custom')}</label>
          <input
            id="custom-bid"
            inputMode="numeric"
            className="h-11 w-20 rounded-lg border-2 border-mar/30 bg-white px-2 tabular-nums"
            placeholder={String(min)}
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))}
          />
          <button type="submit" className="h-11 rounded-lg bg-mar px-3 font-semibold text-white">OK</button>
        </form>
        <ActionButton variant="danger" onClick={() => dispatch({ type: 'passBid', playerId: bidder })}>
          {t('auction.pass')}
        </ActionButton>
      </div>
    </div>
  )
}

export function ActionBar() {
  const game = useGame((s) => s.game)!
  const lang = useGame((s) => s.lang)
  const dispatch = useGame((s) => s.dispatch)
  const setModal = useGame((s) => s.setModal)
  const t = useT()
  const actor = actorId(game)
  const p = game.players[game.current]
  const actorPlayer = actor ? getPlayer(game, actor) : null

  if (game.phase === 'gameOver') return null

  if (actorPlayer?.isBot) {
    return (
      <div className="flex min-h-14 items-center justify-center gap-2 text-base">
        <Who id={actorPlayer.id} /> <span className="animate-pulse">{t('ui.botThinking')}</span>
      </div>
    )
  }

  const manageBtn = (
    <ActionButton onClick={() => setModal({ type: 'manage' })}>{t('action.manage')}</ActionButton>
  )
  const tradeBtn = (
    <ActionButton onClick={() => setModal({ type: 'trade' })}>{t('action.trade')}</ActionButton>
  )

  switch (game.phase) {
    case 'awaitRoll':
      return (
        <div className="space-y-2">
          {p.inJail && (
            <p className="text-sm">{t('jail.status', { tries: 3 - p.jailTurns })}</p>
          )}
          <ActionButton big variant="primary" className="w-full" check={canRoll(game)} onClick={() => dispatch({ type: 'roll' })}>
            🎲 {p.inJail ? t('action.rollJail') : game.extraRoll ? t('action.rollAgain') : t('action.roll')}
          </ActionButton>
          <div className="flex flex-wrap gap-2">
            {p.inJail && (
              <>
                <ActionButton check={canPayJail(game)} onClick={() => dispatch({ type: 'payJail' })}>
                  {t('action.payJail', { amount: JAIL_FINE })}
                </ActionButton>
                <ActionButton check={canUseJailCard(game)} onClick={() => dispatch({ type: 'useJailCard' })}>
                  {t('action.useJailCard')}
                </ActionButton>
              </>
            )}
            {manageBtn}
            {tradeBtn}
          </div>
        </div>
      )

    case 'awaitBuy': {
      const tile = ownableTile(p.position)
      return (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-base">
            {tile.kind === 'property' && (
              <span className="h-4 w-4 shrink-0 rounded" style={{ background: GROUP_COLORS[tile.group].bg }} />
            )}
            <span>
              {t('buy.question', { tile: tileName(lang, tile.index) })} <Money amount={tile.price} className="font-bold" />{t('buy.questionEnd')}
            </span>
          </p>
          <div className="flex gap-2">
            <ActionButton big variant="primary" className="flex-1" check={canBuy(game)} onClick={() => dispatch({ type: 'buy' })}>
              {t('action.buy')}
            </ActionButton>
            <ActionButton big className="flex-1" onClick={() => dispatch({ type: 'decline' })}>
              {t('action.auction')}
            </ActionButton>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="ghost" onClick={() => setModal({ type: 'tile', index: tile.index })}>
              {t('action.details')}
            </ActionButton>
            {manageBtn}
          </div>
        </div>
      )
    }

    case 'auction':
      return <AuctionPanel />

    case 'awaitEndTurn':
      return (
        <div className="space-y-2">
          <ActionButton big variant="primary" className="w-full" check={canEndTurn(game)} onClick={() => dispatch({ type: 'endTurn' })}>
            {t('action.endTurn')} ➜
          </ActionButton>
          <div className="flex flex-wrap gap-2">
            {manageBtn}
            {tradeBtn}
          </div>
        </div>
      )

    case 'debt': {
      const d = game.debts[0]
      const debtor = getPlayer(game, d.debtorId)
      return (
        <div className="space-y-2">
          <p className="text-sm">
            <Who id={debtor.id} /> {t('debt.owes')} <Money amount={d.amount} className="font-bold" />{' '}
            {d.creditorId ? t('debt.to', { name: getPlayer(game, d.creditorId).name }) : t('debt.toBank')}.{' '}
            {t('debt.has')} <Money amount={debtor.money} />.
          </p>
          <ActionButton big variant="primary" className="w-full" check={canPayDebt(game)} onClick={() => dispatch({ type: 'payDebt' })}>
            {t('action.payDebt')}
          </ActionButton>
          <div className="flex flex-wrap gap-2">
            {manageBtn}
            <ActionButton variant="danger" check={canBankrupt(game)} onClick={() => setModal({ type: 'confirmBankrupt' })}>
              {t('action.bankrupt')}
            </ActionButton>
          </div>
        </div>
      )
    }

    case 'trade': {
      const tr = game.trade!
      return (
        <div className="space-y-2">
          <p className="text-sm">
            <Who id={tr.toId} />, {t('trade.incoming', { name: getPlayer(game, tr.fromId).name })}
          </p>
          <TradeSummary offer={tr} viewerId={tr.toId} />
          <div className="flex gap-2">
            <ActionButton big variant="primary" className="flex-1" onClick={() => dispatch({ type: 'acceptTrade' })}>
              {t('action.accept')}
            </ActionButton>
            <ActionButton big variant="danger" className="flex-1" onClick={() => dispatch({ type: 'rejectTrade' })}>
              {t('action.reject')}
            </ActionButton>
          </div>
        </div>
      )
    }
  }
  return null
}
