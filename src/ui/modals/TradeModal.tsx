import { useState } from 'react'
import { GROUP_COLORS } from '../../engine/board'
import { getPlayer, groupHasBuildings, ownableTile, tilesOwnedBy } from '../../engine/queries'
import type { GameState, TradeOffer, TradeSide } from '../../engine/state'
import { canProposeTrade } from '../../engine/validate'
import { useGame } from '../../store/gameStore'
import { tileName } from '../format'
import { ActionButton, Money, Sheet } from '../primitives'
import { useT } from '../useT'

function Swatch({ tile }: { tile: number }) {
  const t = ownableTile(tile)
  return (
    <span
      className="inline-block h-3 w-3 shrink-0 rounded-sm"
      style={{ background: t.kind === 'property' ? GROUP_COLORS[t.group].bg : '#9AA5B1' }}
    />
  )
}

function SideList({ side }: { side: TradeSide }) {
  const lang = useGame((s) => s.lang)
  const t = useT()
  const items: React.ReactNode[] = []
  if (side.money) items.push(<Money key="m" amount={side.money} />)
  side.tiles.forEach((i) =>
    items.push(
      <span key={i} className="inline-flex items-center gap-1"><Swatch tile={i} />{tileName(lang, i)}</span>,
    ),
  )
  if (side.jailCards) items.push(<span key="j">{t('trade.jailCards', { n: side.jailCards })}</span>)
  if (!items.length) return <span className="opacity-60">{t('trade.nothing')}</span>
  return <span className="flex flex-wrap gap-x-3 gap-y-1">{items}</span>
}

/** Resumen de una oferta desde el punto de vista de quien la recibe */
export function TradeSummary({ offer, viewerId }: { offer: TradeOffer; viewerId: string }) {
  const t = useT()
  const receives = offer.toId === viewerId ? offer.give : offer.get
  const gives = offer.toId === viewerId ? offer.get : offer.give
  return (
    <div className="grid gap-1 rounded-lg bg-white p-2 text-sm">
      <div><span className="font-semibold text-olivo">{t('trade.youGet')}:</span> <SideList side={receives} /></div>
      <div><span className="font-semibold text-terracota">{t('trade.youGive')}:</span> <SideList side={gives} /></div>
    </div>
  )
}

function Picker({
  game,
  ownerId,
  side,
  onChange,
  title,
}: {
  game: GameState
  ownerId: string
  side: TradeSide
  onChange: (s: TradeSide) => void
  title: string
}) {
  const lang = useGame((s) => s.lang)
  const t = useT()
  const owner = getPlayer(game, ownerId)
  const tiles = tilesOwnedBy(game, ownerId)
  return (
    <fieldset className="rounded-xl border-2 border-ink/10 p-2">
      <legend className="px-1 font-display font-semibold">{title}</legend>
      <label className="flex items-center gap-2 py-1 text-sm">
        <span>{t('trade.money')} <span className="opacity-70">({t('trade.max')}&nbsp;<Money amount={owner.money} />)</span></span>
        <input
          inputMode="numeric"
          className="h-10 w-24 rounded-lg border-2 border-mar/30 bg-white px-2 tabular-nums"
          value={side.money || ''}
          placeholder="0"
          onChange={(e) => {
            const v = Math.min(owner.money, Number(e.target.value.replace(/\D/g, '')) || 0)
            onChange({ ...side, money: v })
          }}
        />
      </label>
      {owner.jailFreeCards.length > 0 && (
        <label className="flex items-center gap-2 py-1 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={side.jailCards > 0}
            onChange={(e) => onChange({ ...side, jailCards: e.target.checked ? 1 : 0 })}
          />
          {t('trade.jailCards', { n: 1 })}
        </label>
      )}
      {tiles.length === 0 && <p className="py-1 text-sm opacity-60">{t('trade.noTiles')}</p>}
      <ul>
        {tiles.map((i) => {
          const tile = ownableTile(i)
          const locked = tile.kind === 'property' && groupHasBuildings(game, tile.group)
          const checked = side.tiles.includes(i)
          return (
            <li key={i}>
              <label className={`flex min-h-10 items-center gap-2 text-sm ${locked ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  disabled={locked}
                  checked={checked}
                  onChange={() =>
                    onChange({ ...side, tiles: checked ? side.tiles.filter((x) => x !== i) : [...side.tiles, i] })
                  }
                />
                <Swatch tile={i} />
                <span className="flex-1">{tileName(lang, i)}</span>
                {game.ownership[i].mortgaged && <span className="text-xs">{t('manage.mortgaged')}</span>}
                {locked && <span className="text-xs">{t('trade.hasBuildings')}</span>}
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

const emptySide = (): TradeSide => ({ money: 0, tiles: [], jailCards: 0 })

export function TradeModal() {
  const game = useGame((s) => s.game)!
  const dispatch = useGame((s) => s.dispatch)
  const setModal = useGame((s) => s.setModal)
  const t = useT()
  const me = game.players[game.current]
  const others = game.players.filter((p) => p.id !== me.id && !p.bankrupt)
  const [toId, setToId] = useState(others[0]?.id ?? '')
  const [give, setGive] = useState<TradeSide>(emptySide)
  const [get, setGet] = useState<TradeSide>(emptySide)
  const offer: TradeOffer = { fromId: me.id, toId, give, get }
  const close = () => setModal({ type: 'none' })

  return (
    <Sheet
      title={t('trade.title')}
      onClose={close}
      footer={
        <ActionButton
          big
          variant="primary"
          className="w-full"
          check={canProposeTrade(game, offer)}
          onClick={() => dispatch({ type: 'proposeTrade', offer })}
        >
          {t('trade.propose')}
        </ActionButton>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label={t('trade.with')}>
        {others.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={toId === p.id}
            onClick={() => {
              setToId(p.id)
              setGet(emptySide())
            }}
            className={`min-h-11 rounded-full border-2 px-3 font-semibold ${toId === p.id ? 'border-ink bg-white' : 'border-transparent bg-ink/5'}`}
          >
            <span className="mr-1 inline-block h-3 w-3 rounded-full" style={{ background: p.color }} />
            {p.name}{p.isBot ? ' 🤖' : ''}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Picker game={game} ownerId={me.id} side={give} onChange={setGive} title={t('trade.youOffer')} />
        {toId && (
          <Picker
            game={game}
            ownerId={toId}
            side={get}
            onChange={setGet}
            title={t('trade.youAsk', { name: getPlayer(game, toId).name })}
          />
        )}
      </div>
    </Sheet>
  )
}
