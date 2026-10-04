// Ventanas emergentes de la partida: caer en una casilla y todas las decisiones
// (comprar, subastar, deuda, intercambio, salir de la Ronda).
import { useEffect, useState, type ReactNode } from 'react'
import { BOARD, JAIL_FINE } from '../../engine/board'
import { actorId } from '../../engine/bot'
import { countOwnedOfKind, getPlayer, ownableTile, ownsFullGroup } from '../../engine/queries'
import {
  canBankrupt, canBuy, canPayDebt, canPayJail, canRoll, canUseJailCard, minBid,
} from '../../engine/validate'
import { useGame, type LandEvent } from '../../store/gameStore'
import { tileName } from '../format'
import { TradeSummary, HoldingsView } from '../modals/TradeModal'
import { ActionButton, Money, Popup } from '../primitives'
import { TileCard, tileColors } from '../TileCard'
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
    <article className="popup-card overflow-hidden rounded-2xl bg-white text-ink shadow-2xl ring-1 ring-ink/10">
      <header className="px-4 py-3 text-center text-white" style={{ background: color }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">{kicker}</p>
        <h2 id={titleId} className="font-display text-2xl font-bold leading-tight [text-wrap:balance]">{title}</h2>
      </header>
      <div className="popup-body space-y-3 px-4 py-3">{children}</div>
      <footer className="popup-foot space-y-2 border-t border-ink/10 bg-arena/60 px-4 py-3">{footer}</footer>
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

/** Cifra que sube de 0 al valor al abrirse la ventana */
function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setN(value)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900)
      setN(Math.round(value * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <Money amount={n} />
}

function Avatar({ id }: { id: string | null }) {
  const game = useGame((s) => s.game)!
  const t = useT()
  if (!id) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-mar-deep text-white shadow-lg ring-4 ring-white">
          {/* Banca: edificio con columnas */}
          <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true" fill="currentColor">
            <path d="M12 2 2 7v2h20V7z" />
            <rect x="4" y="10" width="2.5" height="8" />
            <rect x="9" y="10" width="2.5" height="8" />
            <rect x="13.5" y="10" width="2.5" height="8" />
            <rect x="18" y="10" width="2.5" height="8" />
            <rect x="2" y="19" width="20" height="3" />
          </svg>
        </span>
        <span className="text-sm font-semibold">{t('payment.bank')}</span>
      </div>
    )
  }
  const p = getPlayer(game, id)
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <span className="grid h-14 w-14 place-items-center rounded-full text-white shadow-lg ring-4 ring-white" style={{ background: p.color }}>
        <TokenIcon token={p.token} className="h-9 w-9" />
      </span>
      <span className="max-w-24 truncate text-sm font-semibold">{p.name}</span>
    </div>
  )
}

/** Por qué se paga esa cantidad (casas, grupo, transportes…) */
function rentReason(t: (k: string, v?: Record<string, string | number>) => string, game: ReturnType<typeof useGame.getState>['game'], tile: number, amount: number): string {
  const g = game!
  const own = g.ownership[tile]
  const info = BOARD[tile]
  if (!own?.owner) return ''
  if (info.kind === 'property') {
    if (own.houses === 5) return t('build.hotel')
    if (own.houses > 0) return t('build.houses', { n: own.houses })
    return ownsFullGroup(g, own.owner, info.group) ? t('tile.groupDouble') : t('tile.rentBase')
  }
  if (info.kind === 'transport') return t('tile.transportN', { n: countOwnedOfKind(g, own.owner, 'transport') })
  if (info.kind === 'utility' && g.dice) return t('payment.utility', { d: g.dice[0] + g.dice[1], m: Math.round(amount / (g.dice[0] + g.dice[1])) })
  return ''
}

/** Recibo de pago: quién paga, a quién, cuánto y por qué. Sin toda la ficha. */
function PaymentTicket({ e, footer }: { e: LandEvent; footer: ReactNode }) {
  const game = useGame((s) => s.game)!
  const lang = useGame((s) => s.lang)
  const t = useT()
  const colors = tileColors(e.tile)
  const amount = e.amount ?? 0
  const reason = e.outcome === 'rent' ? rentReason(t, game, e.tile, amount) : ''
  return (
    <article className="popup-card ticket overflow-hidden rounded-2xl bg-white text-ink shadow-2xl ring-1 ring-ink/10">
      <header className="px-4 py-2.5 text-center" style={{ background: colors.bg, color: colors.text }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
          {e.outcome === 'rent' ? t('payment.rent') : t('payment.tax')}
        </p>
        <h2 id="landing-title" className="font-display text-xl font-bold leading-tight">{tileName(lang, e.tile)}</h2>
      </header>
      <div className="popup-body px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <Avatar id={e.playerId} />
          <div className="coin-track relative mt-5 h-6 flex-1" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="coin-run" style={{ animationDelay: `${i * 180}ms` }}>€</span>
            ))}
          </div>
          <Avatar id={e.toId ?? null} />
        </div>
        <p className="mt-3 text-center font-display text-5xl font-bold text-terracota">
          <CountUp value={amount} />
        </p>
        {reason && <p className="mt-1 text-center text-sm opacity-75">{reason}</p>}
      </div>
      <div className="ticket-perf" aria-hidden="true" />
      <footer className="popup-foot space-y-2 bg-arena/60 px-4 py-3">{footer}</footer>
    </article>
  )
}

export function LandingPopup() {
  const e = useGame((s) => s.shownLanding)!
  const game = useGame((s) => s.game)!
  const dismiss = useGame((s) => s.dismissLanding)
  const setModal = useGame((s) => s.setModal)
  const isLocal = useGame((s) => s.isLocal)
  const t = useT()
  const p = getPlayer(game, e.playerId)

  const headlines: Record<string, ReactNode> = {
    own: t('landing.own', { name: p.name }),
    mortgaged: t('landing.mortgaged', { name: p.name }),
    goToJail: t('landing.goToJail', { name: p.name }),
    parking: t('landing.parking', { name: p.name }),
    visit: t('landing.visit', { name: p.name }),
  }

  const footer = !isLocal(p.id) ? (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
        <div className="bot-timer h-full rounded-full bg-mar" />
      </div>
      <ActionButton ignoreBusy onClick={dismiss}>{t('ui.ok')}</ActionButton>
    </div>
  ) : (
    <>
      <ActionButton ignoreBusy big variant="primary" className="w-full" onClick={dismiss}>
        {e.outcome === 'rent' || e.outcome === 'tax' ? t('payment.pay') : t('ui.continue')}
      </ActionButton>
      {e.outcome === 'own' && (
        <ActionButton
          ignoreBusy
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
  )

  return (
    <Popup onClose={dismiss} labelledBy="landing-title" originTile={e.tile}>
      {e.outcome === 'rent' || e.outcome === 'tax' ? (
        <PaymentTicket e={e} footer={footer} />
      ) : (
        <TileCard index={e.tile} titleId="landing-title" compact headline={headlines[e.outcome]}>
          {footer}
        </TileCard>
      )}
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
    <Popup labelledBy="buy-title" originTile={tile.index}>
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
  const isLocal = useGame((s) => s.isLocal)
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
    <Popup labelledBy="auction-title" originTile={a.tile}>
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
        {!isLocal(bidder) ? (
          <p className="animate-pulse text-center">{p.isBot ? t('ui.botThinking') : t('ui.playing')}</p>
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
  const online = useGame((s) => !!s.online)
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
        {!online && !getPlayer(game, tr.fromId).isBot && (
          <p className="text-center text-sm">{t('trade.passPhone', { name: getPlayer(game, tr.toId).name })}</p>
        )}
        <p className="text-center"><Who id={tr.fromId} /> {t('trade.offers')}</p>
        <div className="land:hidden"><TradeSummary offer={tr} viewerId={tr.toId} /></div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 land:grid-cols-2">
          <HoldingsView game={game} ownerId={tr.toId} side={tr.get} tone="give" title={t('trade.yours')} />
          <HoldingsView game={game} ownerId={tr.fromId} side={tr.give} tone="get" title={getPlayer(game, tr.fromId).name} />
        </div>
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
  const isLocal = useGame((s) => s.isLocal)
  if (busy || shownCard || shownLanding || modal.type !== 'none') return null
  const actor = actorId(game)
  const human = actor ? isLocal(actor) : false
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

