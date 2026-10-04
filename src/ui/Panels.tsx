import { useState } from 'react'
import { GROUP_COLORS, GROUP_ORDER, GROUPS, HOTEL, TRANSPORT_INDICES, UTILITY_INDICES } from '../engine/board'
import { netWorth } from '../engine/queries'
import { useGame } from '../store/gameStore'
import { formatMoney, logText, tileName } from './format'
import { Money } from './primitives'
import { TokenIcon } from './Token'
import { useT } from './useT'

function PropertyChips({ playerId }: { playerId: string }) {
  const game = useGame((s) => s.game)!
  const lang = useGame((s) => s.lang)
  const setModal = useGame((s) => s.setModal)
  const t = useT()
  const sets: { key: string; color: string; tiles: number[]; total: number }[] = []
  for (const g of GROUP_ORDER) {
    const tiles = GROUPS[g].filter((i) => game.ownership[i].owner === playerId)
    if (tiles.length) sets.push({ key: g, color: GROUP_COLORS[g].bg, tiles, total: GROUPS[g].length })
  }
  const tr = TRANSPORT_INDICES.filter((i) => game.ownership[i].owner === playerId)
  if (tr.length) sets.push({ key: 'transport', color: '#4B5563', tiles: tr, total: 4 })
  const ut = UTILITY_INDICES.filter((i) => game.ownership[i].owner === playerId)
  if (ut.length) sets.push({ key: 'utility', color: '#94A3B8', tiles: ut, total: 2 })

  if (!sets.length) return <p className="text-xs opacity-60">{t('players.noProperties')}</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {sets.map((s) => (
        <div
          key={s.key}
          className={`flex gap-0.5 rounded-md p-0.5 ${s.tiles.length === s.total ? 'ring-2 ring-sol' : ''}`}
          title={s.tiles.length === s.total ? t('players.fullGroup') : undefined}
        >
          {s.tiles.map((i) => {
            const own = game.ownership[i]
            return (
              <button
                key={i}
                type="button"
                onClick={() => setModal({ type: 'tile', index: i })}
                aria-label={tileName(lang, i)}
                className={`relative h-7 w-5 rounded-sm border border-white/70 ${own.mortgaged ? 'opacity-40' : ''}`}
                style={{ background: s.color }}
              >
                {own.houses > 0 && (
                  <span className="absolute inset-x-0 bottom-0 text-[10px] font-bold leading-3 text-white">
                    {own.houses === HOTEL ? 'H' : own.houses}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function PlayersList() {
  const game = useGame((s) => s.game)!
  const t = useT()
  return (
    <ul className="space-y-2">
      {game.players.map((p, i) => {
        const active = i === game.current && game.phase !== 'gameOver'
        return (
          <li
            key={p.id}
            className={`rounded-xl border-2 bg-white p-2 ${active ? 'border-ink shadow' : 'border-transparent'} ${p.bankrupt ? 'opacity-50' : ''}`}
            aria-current={active ? 'true' : undefined}
          >
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white" style={{ background: p.color }}>
                <TokenIcon token={p.token} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {p.name} {p.isBot && <span aria-label="bot">🤖</span>}
                  {active && <span className="ml-1 rounded bg-sol px-1.5 text-xs">{t('players.turn')}</span>}
                </span>
                <span className="block text-xs opacity-70">
                  {p.bankrupt
                    ? t('players.bankrupt')
                    : [
                        p.inJail ? t('players.inJail') : null,
                        p.jailFreeCards.length ? t('players.jailCards', { n: p.jailFreeCards.length }) : null,
                        `${t('players.netWorth')} ${formatMoney(netWorth(game, p.id))}`,
                      ].filter(Boolean).join(' · ')}
                </span>
              </span>
              <Money amount={p.money} className="font-display text-lg font-bold" />
            </div>
            {!p.bankrupt && <div className="mt-1.5"><PropertyChips playerId={p.id} /></div>}
          </li>
        )
      })}
    </ul>
  )
}

function LogList() {
  const game = useGame((s) => s.game)!
  const lang = useGame((s) => s.lang)
  return (
    <ol className="space-y-1 text-sm" aria-live="polite">
      {[...game.log].reverse().map((e) => (
        <li key={e.id} className="rounded bg-white/70 px-2 py-1">{logText(lang, e)}</li>
      ))}
    </ol>
  )
}

export function Panels() {
  const [tab, setTab] = useState<'players' | 'log'>('players')
  const t = useT()
  const tabs = [
    { id: 'players' as const, label: t('tabs.players') },
    { id: 'log' as const, label: t('tabs.log') },
  ]
  return (
    <section>
      <div role="tablist" className="mb-2 flex gap-1 rounded-xl bg-ink/5 p-1">
        {tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            type="button"
            id={`tab-${x.id}`}
            aria-selected={tab === x.id}
            aria-controls={`panel-${x.id}`}
            onClick={() => setTab(x.id)}
            className={`min-h-10 flex-1 rounded-lg font-semibold ${tab === x.id ? 'bg-white shadow' : ''}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'players' ? <PlayersList /> : <LogList />}
      </div>
    </section>
  )
}
