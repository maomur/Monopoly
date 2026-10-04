import { GROUPS } from '../../engine/board'
import { CARD_BY_ID } from '../../engine/cards'
import { getPlayer, netWorth } from '../../engine/queries'
import { useGame } from '../../store/gameStore'
import { ActionButton, Money, Popup, Sheet } from '../primitives'
import { TileCard } from '../TileCard'
import { TokenIcon } from '../Token'
import { sfx } from '../../audio/sfx'
import { LangToggle, SoundToggle } from '../Header'
import { useInstall } from '../install'
import { useT } from '../useT'

export function TileModal({ index }: { index: number }) {
  const setModal = useGame((s) => s.setModal)
  const t = useT()
  const close = () => setModal({ type: 'none' })
  return (
    <Popup onClose={close} labelledBy="tile-title" originTile={index}>
      <TileCard index={index} titleId="tile-title">
        <ActionButton className="w-full" onClick={close}>{t('ui.close')}</ActionButton>
      </TileCard>
    </Popup>
  )
}

export function CardModal() {
  const card = useGame((s) => s.shownCard)!
  const game = useGame((s) => s.game)!
  const dismiss = useGame((s) => s.dismissCard)
  const isLocal = useGame((s) => s.isLocal)
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
            {isLocal(p.id) ? t('ui.continue') : t('ui.ok')}
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
  const online = useGame((s) => s.online)
  const send = useGame((s) => s.onlineSend)
  const t = useT()
  const isHost = !!online?.room && online.room.hostSeatId === online.you
  const winner = getPlayer(game, game.winnerId!)
  const ranking = [...game.players].sort((a, b) => netWorth(game, b.id) - netWorth(game, a.id))
  return (
    <Sheet title={t('gameOver.title')} closable={false}
      footer={
        online ? (
          <div className="grid gap-2">
            {isHost ? (
              <ActionButton big variant="primary" className="w-full" onClick={() => send({ t: 'rematch' })}>{t('online.rematch')}</ActionButton>
            ) : (
              <p className="text-center text-sm">{t('online.waitingRematch')}</p>
            )}
            <ActionButton variant="ghost" className="w-full" onClick={quit}>{t('online.leave')}</ActionButton>
          </div>
        ) : (
          <ActionButton big variant="primary" className="w-full" onClick={quit}>{t('gameOver.newGame')}</ActionButton>
        )
      }
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

const SOUND_PREVIEW: [string, () => void][] = [
  ['sound.step', () => { for (let i = 0; i < 5; i++) setTimeout(sfx.step, i * 270) }],
  ['sound.dice', sfx.dice],
  ['sound.land', sfx.land],
  ['sound.popup', sfx.whoosh],
  ['sound.card', sfx.card],
  ['sound.pay', sfx.coinOut],
  ['sound.receive', sfx.coinIn],
  ['sound.buy', sfx.buy],
  ['sound.build', () => sfx.build(false)],
  ['sound.hotel', () => sfx.build(true)],
  ['sound.mortgage', () => sfx.mortgage(true)],
  ['sound.unmortgage', () => sfx.mortgage(false)],
  ['sound.bid', sfx.bid],
  ['sound.sold', () => sfx.gavel(true)],
  ['sound.deal', sfx.deal],
  ['sound.noDeal', sfx.noDeal],
  ['sound.jail', sfx.jail],
  ['sound.group', sfx.fanfare],
  ['sound.bankrupt', sfx.bankrupt],
  ['sound.victory', sfx.victory],
  ['sound.deny', sfx.deny],
]

export function InstallApp() {
  const [mode, install] = useInstall()
  const t = useT()
  if (!mode) return null
  if (mode === 'prompt') {
    return <ActionButton variant="primary" onClick={install}>📲 {t('install.button')}</ActionButton>
  }
  return <p className="rounded-xl bg-white px-3 py-2 text-sm">📲 {t('install.ios')}</p>
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{t('ui.sound')}</span>
          <SoundToggle />
        </div>
        <InstallApp />
        <details className="rounded-xl bg-white px-3 py-2">
          <summary className="cursor-pointer py-1 font-semibold">{t('sound.preview')}</summary>
          <div className="grid grid-cols-2 gap-2 py-2">
            {SOUND_PREVIEW.map(([key, play]) => (
              <button key={key} type="button" onClick={play} className="min-h-10 rounded-lg bg-arena px-2 text-left text-sm font-semibold">
                ▶ {t(key)}
              </button>
            ))}
          </div>
        </details>
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
