import { getPlayer } from '../../engine/queries'
import { useGame } from '../../store/gameStore'
import { TokenIcon } from '../Token'
import { useT } from '../useT'

/** Anuncio a pantalla completa: alguien se ha arruinado y queda fuera de la partida */
export function BankruptPopup() {
  const info = useGame((s) => s.shownBankrupt)!
  const game = useGame((s) => s.game)!
  const dismiss = useGame((s) => s.dismissBankrupt)
  const myId = useGame((s) => s.online?.myPlayerId ?? null)
  const t = useT()
  const p = getPlayer(game, info.playerId)
  const creditor = info.creditorId ? getPlayer(game, info.creditorId) : null
  const left = game.players.filter((x) => !x.bankrupt).length
  const me = myId === p.id
  return (
    <div className="bankrupt-overlay fixed inset-0 z-[60] grid place-items-center overflow-y-auto p-5" role="alertdialog" aria-modal="true" aria-labelledby="bk-title">
      <div className="bankrupt-card relative w-full max-w-sm rounded-3xl bg-[#1A1A2E] px-5 pb-5 pt-7 text-center text-white shadow-2xl ring-1 ring-white/10 land:max-w-md land:pt-5">
        <div className="relative mx-auto h-24 w-24 land:h-16 land:w-16">
          <div className="bankrupt-token grid h-full w-full place-items-center rounded-full border-4 border-white/80 text-white" style={{ background: p.color }}>
            <TokenIcon token={p.token} className="h-[70%] w-[70%]" />
          </div>
          <span className="bankrupt-stamp pointer-events-none absolute left-1/2 top-1/2 whitespace-nowrap rounded-md border-[3px] border-[#FF4D4D] px-2 py-0.5 font-display text-xl font-extrabold uppercase tracking-widest text-[#FF4D4D]">
            {t('bankrupt.stamp')}
          </span>
        </div>
        <h2 id="bk-title" className="mt-5 font-display text-2xl font-bold land:mt-3 land:text-xl">
          {me ? t('bankrupt.headlineYou') : t('bankrupt.headline', { name: p.name })}
        </h2>
        <p className="mt-2 text-white/80">
          {creditor ? t('bankrupt.assetsTo', { name: creditor.name }) : t('bankrupt.assetsBank')}
        </p>
        {game.phase !== 'gameOver' && (
          <p className="mt-1 text-sm text-white/60">{t('bankrupt.remaining', { n: left })}</p>
        )}
        <button
          type="button"
          autoFocus
          onClick={dismiss}
          className="mt-5 min-h-12 w-full rounded-xl bg-white font-display text-lg font-semibold text-ink land:mt-3"
        >
          {t('ui.continue')}
        </button>
      </div>
    </div>
  )
}
