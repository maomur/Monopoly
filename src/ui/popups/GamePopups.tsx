// Ventanas emergentes de la partida: caer en una casilla y todas las decisiones
// (comprar, subastar, deuda, intercambio, salir de la Ronda).
import { useState, type ReactNode } from 'react'
import { JAIL_FINE } from '../../engine/board'
import { actorId } from '../../engine/bot'
import { getPlayer, ownableTile } from '../../engine/queries'
import {
  canBankrupt, canBuy, canPayDebt, canPayJail, canRoll, canUseJailCard, minBid,
} from '../../engine/validate'
import { useGame } from '../../store/gameStore'
import { TradeSummary } from '../modals/TradeModal'
import { ActionButton, Money, Popup } from '../primitives'
import { TileCard } from '../TileCard'
import { TokenIcon } from '../Token'
import { useT } from '../useT'

function Who({ id, light = false }: { id: string; light?: boolean }) {
  const game = useGame((s) => s.game)!
  const p = getPlayer(game, id)
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${light ? 'text-white' : ''}`}>
      <span className="grid h-6 w-6 place-items-center rounded-full text-white ring-2 ring-white/70" style={{ background: p.color }}>
        <TokenIcon token={p.token} className="h-4 w-4" />
      </span>
      {p.name}
    </span>
  )
}

/** Tarjeta genérica (sin casilla) con cabecera de color */
function PopupCard({
  color,
  kicker,
  title,
  titleId,
  children,
  footer,
}: {
  color: string
  kicker: ReactNode
  title: ReactNode
  titleId: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white text-ink shadow-2xl ring-1 ring-ink/10">
      <header className="px-4 py-3 text-center text-white" style={{ background: color }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">{kicker}</p>
        <h2 id={titleId} className="font-display text-2xl font-bold leading-tight [text-wrap:balance]">{title}</h2>
      </header>
      <div className="space-y-3 px-4 py-3">{children}</div>
      <footer className="space-y-2 border-t border-ink/10 bg-arena/60 px-4 py-3">{footer}</footer>
    </article>
  )
}

function ManageLink() {
  const setModal = useGame((s) => s.setModal)
  const t = useT()
  return (
    <ActionButton variant="ghost" className="w-full" onClick={() => setModal({ type: 'manage' })}>
      {t('action.manage')}
    </ActionButton>
  )
}

// ---------- Caer en una casilla (informativo) ----------

export function LandingPopup() {
  const e = useGame((s) => s.shownLanding)!
  const game = useGame((s) => s.game)!
  const dismiss = useGame((s) => s.dismissLanding)
  const setModal = useGame((s) => s.setModal)
  const t = useT()
  const p = getPlayer(game, e.playerId)
  const to = e.toId ? getPlayer(game, e.toId) : null

  const headlines: Record<string, ReactNode> = {
    rent: <>{t('landing.rent', { name: p.name, owner: to?.name ?? '' })} <Money amount={e.amount ?? 0} className="text-sol" /></>,
    tax: <>{t('landing.tax', { name: p.name })} <Money amount={e.amount ?? 0} className="text-sol" /></>,
    own: t('landing.own', { name: p.name }),
    mortgaged: t('landing.mortgaged', { name: p.name }),
    goToJail: t('landing.goToJail', { name: p.name }),
    parking: t('landing.parking', { name: p.name }),
    visit: t('landing.visit', { name: p.name }),
  }

  return (
    <Popup onClose={dismiss} labelledBy="landing-title">
      <TileCard index={e.tile} titleId="landing-title" headline={headlines[e.outcome]}>
        {p.isBot ? (
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
              <div className="bot-timer h-full rounded-full bg-mar" />
            </div>
            <ActionButton ignoreBusy onClick={dismiss}>{t('ui.ok')}</ActionButton>
          </div>
        ) : (
          <>
            <ActionButton ignoreBusy big variant="primary" className="w-full" onClick={dismiss}>
              {t('ui.continue')}
            </ActionButton>
            {e.outcome === 'own' && (
              <ActionButton
                variant="ghost"
                className="w-full"
                onClick={() => {
                  dismiss()
                  setModal({ type: 'manage' })
                }}
              >
                {t('action.manage')}
              </ActionButton>
            )}
          </>
        )}
      </TileCard>
    </Popup>
  )
}

// ---------- Decisiones ----------

function BuyPopup() {
  const game = useGame((s) => s.game)!
  const dispatch = useGame((s) => s.dispatch)
  const t = useT()
  const p = game.players[game.current]
  const tile = ownableTile(p.position)
  return (
    <Popup labelledBy="buy-title">
      <TileCard index={tile.index} titleId="buy-title" headline={t('popup.forSale')}>
        <p className="text-center text-sm">
          <Who id={p.id} /> · {t('ui.cash')}: <Money amount={p.money} className="font-bold" />
        </p>
        <div className="flex gap-2">
          <ActionButton big variant="primary" className="flex-1" check={canBuy(game)} onClick={() => dispatch({ type: 'buy' })}>
            {t('action.buy')} <Money amount={tile.price} />
          </ActionButton>
          <ActionButton big className="flex-1" onClick={() => dispatch({ type: 'decline' })}>
            {t('action.auction')}
          </ActionButton>
        </div>
        {p.money < tile.price && <ManageLink />}
      </TileCard>
    </Popup>
  )
}

function AuctionPopup() {
  const game = useGame((s) => s.game)!
  const dispatch = useGame((s) => s.dispatch)
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
    <Popup labelledBy="auction-title">
      <TileCard index={a.tile} titleId="auction-title" compact headline={t('popup.auction')}>
        <div className="grid grid-cols-2 gap-2 text-center text-sm">
          <div className="rounded-xl bg-white p-2 ring-1 ring-ink/10">
            <p className="text-xs uppercase tracking-wider opacity-70">{t('auction.highest')}</p>
            <p className="font-display text-xl font-bold">
              {a.highestBidder ? <Money amount={a.highestBid} /> : '—'}
            </p>
            <p className="truncate text-xs">{a.highestBidder ? getPlayer(game, a.highestBidder).name : t('auction.noBids')}</p>
          </div>
          <div className="rounded-xl bg-white p-2 ring-1 ring-ink/10">
            <p className="text-xs uppercase tracking-wider opacity-70">{t('auction.value')}</p>
            <p className="font-display text-xl font-bold"><Money amount={tile.price} /></p>
            <p className="text-xs">{t('auction.bidders', { n: a.bidders.length })}</p>
          </div>
        </div>
        <p className="text-center text-sm">
          {t('auction.turn')} <Who id={bidder} /> · <Money amount={p.money} />
        </p>
        {p.isBot ? (
          <p className="animate-pulse text-center">{t('ui.botThinking')}</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {steps.map((v) => (
                <ActionButton key={v} variant="primary" onClick={() => dispatch({ type: 'bid', playerId: bidder, amount: v })}>
                  <Money amount={v} />
                </ActionButton>
              ))}
            </div>
            <div className="flex gap-2">
              <form
                className="flex flex-1 gap-1"
                onSubmit={(ev) => {
                  ev.preventDefault()
                  const v = Number(custom)
                  if (Number.isFinite(v) && v > 0) dispatch({ type: 'bid', playerId: bidder, amount: Math.floor(v) })
                  setCustom('')
                }}
              >
                <label className="sr-only" htmlFor="custom-bid">{t('auction.custom')}</label>
                <input
                  id="custom-bid"
                  inputMode="numeric"
                  className="h-11 min-w-0 flex-1 rounded-lg border-2 border-mar/30 bg-white px-2 tabular-nums"
                  placeholder={t('auction.custom')}
                  value={custom}
                  onChange={(ev) => setCustom(ev.target.value.replace(/\D/g, ''))}
                />
                <button type="submit" className="h-11 rounded-lg bg-mar px-3 font-semibold text-white">{t('auction.bid')}</button>
              </form>
              <ActionButton variant="danger" onClick={() => dispatch({ type: 'passBid', playerId: bidder })}>
                {t('auction.pass')}
              </ActionButton>
            </div>
          </>
        )}
      </TileCard>
    </Popup>
  )
}

function DebtPopup() {
  const game = useGame((s) => s.game)!
  const dispatch = useGame((s) => s.dispatch)
  const setModal = useGame((s) => s.setModal)
  const t = useT()
  const d = game.debts[0]
  const debtor = getPlayer(game, d.debtorId)
  return (
    <Popup labelledBy="debt-title">
      <PopupCard
        color="#B0442D"
        kicker={t('debt.kicker')}
        title={<Money amount={d.amount} />}
        titleId="debt-title"
        footer={
          <>
            <ActionButton big variant="primary" className="w-full" check={canPayDebt(game)} onClick={() => dispatch({ type: 'payDebt' })}>
              {t('action.payDebt')}
            </ActionButton>
            <div className="flex gap-2">
              <ActionButton className="flex-1" onClick={() => setModal({ type: 'manage' })}>{t('action.manage')}</ActionButton>
              <ActionButton variant="danger" className="flex-1" check={canBankrupt(game)} onClick={() => setModal({ type: 'confirmBankrupt' })}>
                {t('action.bankrupt')}
              </ActionButton>
            </div>
          </>
        }
      >
        <p className="text-center">
          <Who id={debtor.id} /> {t('debt.owes')} <Money amount={d.amount} className="font-bold" />{' '}
          {d.creditorId ? t('debt.to', { name: getPlayer(game, d.creditorId).name }) : t('debt.toBank')}.
        </p>
        <p className="rounded-xl bg-arena px-3 py-2 text-center text-sm">
          {t('debt.has')} <Money amount={debtor.money} className="font-bold" />. {t('debt.hint')}
        </p>
      </PopupCard>
    </Popup>
  )
}

function TradePopup() {
  const game = useGame((s) => s.game)!
  const dispatch = useGame((s) => s.dispatch)
  const t = useT()
  const tr = game.trade!
  return (
    <Popup labelledBy="trade-title" wide>
      <PopupCard
        color="#0B5CAD"
        kicker={t('trade.kicker')}
        title={t('trade.titleFor', { name: getPlayer(game, tr.toId).name })}
        titleId="trade-title"
        footer={
          <div className="flex gap-2">
            <ActionButton big variant="primary" className="flex-1" onClick={() => dispatch({ type: 'acceptTrade' })}>
              {t('action.accept')}
            </ActionButton>
            <ActionButton big variant="danger" className="flex-1" onClick={() => dispatch({ type: 'rejectTrade' })}>
              {t('action.reject')}
            </ActionButton>
          </div>
        }
      >
        <p className="text-center text-sm">
          {t('trade.passPhone', { name: getPlayer(game, tr.toId).name })}
        </p>
        <p className="text-center"><Who id={tr.fromId} /> {t('trade.offers')}</p>
        <TradeSummary offer={tr} viewerId={tr.toId} />
      </PopupCard>
    </Popup>
  )
}

function JailPopup() {
  const game = useGame((s) => s.game)!
  const dispatch = useGame((s) => s.dispatch)
  const t = useT()
  const p = game.players[game.current]
  return (
    <Popup labelledBy="jail-title">
      <PopupCard
        color="#8E1B2C"
        kicker={t('tile.jail')}
        title={t('jail.title')}
        titleId="jail-title"
        footer={
          <>
            <ActionButton big variant="primary" className="w-full" check={canRoll(game)} onClick={() => dispatch({ type: 'roll' })}>
              🎲 {t('action.rollJail')}
            </ActionButton>
            <div className="flex gap-2">
              <ActionButton className="flex-1" check={canPayJail(game)} onClick={() => dispatch({ type: 'payJail' })}>
                {t('action.payJail', { amount: JAIL_FINE })}
              </ActionButton>
              <ActionButton className="flex-1" check={canUseJailCard(game)} onClick={() => dispatch({ type: 'useJailCard' })}>
                {t('action.useJailCard')}
              </ActionButton>
            </div>
            <ManageLink />
          </>
        }
      >
        <p className="text-center"><Who id={p.id} /></p>
        <p className="text-center">{t('jail.status', { tries: 3 - p.jailTurns })}</p>
        <p className="text-center text-sm opacity-75">{t('jail.options', { amount: JAIL_FINE })}</p>
      </PopupCard>
    </Popup>
  )
}

/** Decide qué ventana de decisión toca según el estado de la partida */
export function DecisionPopups() {
  const game = useGame((s) => s.game)!
  const busy = useGame((s) => s.busy)
  const shownCard = useGame((s) => s.shownCard)
  const shownLanding = useGame((s) => s.shownLanding)
  const modal = useGame((s) => s.modal)
  if (busy || shownCard || shownLanding || modal.type !== 'none') return null
  const actor = actorId(game)
  const human = actor ? !getPlayer(game, actor).isBot : false
  const p = game.players[game.current]

  switch (game.phase) {
    case 'awaitBuy':
      return human ? <BuyPopup /> : null
    case 'auction':
      return <AuctionPopup />
    case 'debt':
      return human ? <DebtPopup /> : null
    case 'trade':
      return human ? <TradePopup /> : null
    case 'awaitRoll':
      return human && p.inJail ? <JailPopup /> : null
    default:
      return null
  }
}

