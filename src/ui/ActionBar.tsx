import { actorId } from '../engine/bot'
import { getPlayer } from '../engine/queries'
import { canEndTurn, canRoll } from '../engine/validate'
import { useGame } from '../store/gameStore'
import { ActionButton } from './primitives'
import { TokenIcon } from './Token'
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

/**
 * Barra fija: solo tirar los dados y terminar el turno (más gestionar e intercambiar).
 * Comprar, subastar, deudas, intercambios recibidos y la Ronda se deciden en ventanas emergentes.
 */
export function ActionBar() {
  const game = useGame((s) => s.game)!
  const dispatch = useGame((s) => s.dispatch)
  const setModal = useGame((s) => s.setModal)
  const busy = useGame((s) => s.busy)
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

  const secondary = (
    <div className="flex gap-2">
      <ActionButton className="flex-1" onClick={() => setModal({ type: 'manage' })}>{t('action.manage')}</ActionButton>
      <ActionButton className="flex-1" onClick={() => setModal({ type: 'trade' })}>{t('action.trade')}</ActionButton>
    </div>
  )

  if (game.phase === 'awaitRoll' && !p.inJail) {
    return (
      <div className="space-y-2">
        <ActionButton big variant="primary" className="w-full" check={canRoll(game)} onClick={() => dispatch({ type: 'roll' })}>
          🎲 {game.extraRoll ? t('action.rollAgain') : t('action.roll')}
        </ActionButton>
        {secondary}
      </div>
    )
  }

  if (game.phase === 'awaitEndTurn') {
    return (
      <div className="space-y-2">
        <ActionButton big variant="primary" className="w-full" check={canEndTurn(game)} onClick={() => dispatch({ type: 'endTurn' })}>
          {t('action.endTurn')} ➜
        </ActionButton>
        {secondary}
      </div>
    )
  }

  // Mientras se anima no adelantamos nada; después, hay una ventana esperando una decisión
  if (busy) return <div className="min-h-14" />
  return (
    <div className="flex min-h-14 items-center justify-center gap-2 text-base">
      {actorPlayer && <Who id={actorPlayer.id} />} <span>{t('ui.decidePopup')}</span>
    </div>
  )
}
