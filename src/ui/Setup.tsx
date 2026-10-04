import { useState } from 'react'
import { PLAYER_COLORS, TOKENS, type PlayerSetup, type TokenId } from '../engine/state'
import { useGame, type QuickSetup } from '../store/gameStore'
import { LangToggle, SoundToggle } from './Header'
import { ActionButton } from './primitives'
import { TOKEN_LABEL_KEY, TokenIcon } from './Token'
import { useT } from './useT'

const DEFAULT_NAMES = ['Ana', 'Marc', 'Laia', 'Pol']

export function Setup() {
  const t = useT()
  const newGame = useGame((s) => s.newGame)
  const saved = useGame((s) => s.savedGame)
  const continueGame = useGame((s) => s.continueGame)
  const [count, setCount] = useState(2)
  const [players, setPlayers] = useState<PlayerSetup[]>(
    DEFAULT_NAMES.map((name, i) => ({ name, token: TOKENS[i], isBot: i > 0 })),
  )
  const [quick, setQuick] = useState<QuickSetup>({ type: 'none' })

  const update = (i: number, patch: Partial<PlayerSetup>) =>
    setPlayers((ps) => ps.map((p, k) => (k === i ? { ...p, ...patch } : p)))

  const chooseToken = (i: number, token: TokenId) =>
    setPlayers((ps) => {
      const other = ps.findIndex((p, k) => k !== i && k < count && p.token === token)
      return ps.map((p, k) => {
        if (k === i) return { ...p, token }
        if (k === other) return { ...p, token: ps[i].token } // intercambian ficha
        return p
      })
    })

  const quickOptions: { id: string; q: QuickSetup; label: string }[] = [
    { id: 'none', q: { type: 'none' }, label: t('setup.classic') },
    { id: 'r20', q: { type: 'rounds', limit: 20 }, label: t('setup.rounds', { n: 20 }) },
    { id: 'r40', q: { type: 'rounds', limit: 40 }, label: t('setup.rounds', { n: 40 }) },
    { id: 't30', q: { type: 'time', minutes: 30 }, label: t('setup.minutes', { n: 30 }) },
    { id: 't60', q: { type: 'time', minutes: 60 }, label: t('setup.minutes', { n: 60 }) },
  ]
  const qid = (q: QuickSetup) => (q.type === 'none' ? 'none' : q.type === 'rounds' ? `r${q.limit}` : `t${q.minutes}`)

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold text-mar">BCN Tycoon</h1>
          <p className="text-terracota">{t('app.tagline')}</p>
        </div>
        <LangToggle />
      </div>

      {saved && (
        <div className="mt-4 rounded-xl border-2 border-olivo/40 bg-white p-3">
          <p className="text-sm">{t('setup.savedGame', { names: saved.players.map((p) => p.name).join(', '), round: saved.round })}</p>
          <ActionButton big variant="primary" className="mt-2 w-full" onClick={continueGame}>
            {t('setup.continue')}
          </ActionButton>
        </div>
      )}

      <h2 className="mt-6 font-display text-xl font-semibold">{t('setup.players')}</h2>
      <div className="mt-2 flex gap-2" role="radiogroup" aria-label={t('setup.players')}>
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={count === n}
            onClick={() => setCount(n)}
            className={`min-h-12 flex-1 rounded-xl border-2 font-display text-xl font-bold ${count === n ? 'border-mar bg-mar text-white' : 'border-mar/30 bg-white'}`}
          >
            {n}
          </button>
        ))}
      </div>

      <ul className="mt-4 space-y-3">
        {players.slice(0, count).map((p, i) => (
          <li key={i} className="rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: PLAYER_COLORS[i] }} />
              <label className="sr-only" htmlFor={`name-${i}`}>{t('setup.name', { n: i + 1 })}</label>
              <input
                id={`name-${i}`}
                className="h-11 min-w-0 flex-1 rounded-lg border-2 border-ink/15 px-2"
                value={p.name}
                maxLength={14}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              <div className="flex overflow-hidden rounded-lg border-2 border-ink/15" role="radiogroup" aria-label={t('setup.type')}>
                {[false, true].map((bot) => (
                  <button
                    key={String(bot)}
                    type="button"
                    role="radio"
                    aria-checked={p.isBot === bot}
                    onClick={() => update(i, { isBot: bot })}
                    className={`min-h-10 px-2.5 text-sm font-semibold ${p.isBot === bot ? 'bg-ink text-white' : 'bg-white'}`}
                  >
                    {bot ? t('setup.bot') : t('setup.human')}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('setup.token')}>
              {TOKENS.map((tok) => (
                <button
                  key={tok}
                  type="button"
                  role="radio"
                  aria-checked={p.token === tok}
                  aria-label={t(TOKEN_LABEL_KEY[tok])}
                  title={t(TOKEN_LABEL_KEY[tok])}
                  onClick={() => chooseToken(i, tok)}
                  className={`grid h-11 w-11 place-items-center rounded-full border-2 ${p.token === tok ? 'border-ink text-white' : 'border-transparent bg-ink/5 text-ink'}`}
                  style={p.token === tok ? { background: PLAYER_COLORS[i] } : undefined}
                >
                  <TokenIcon token={tok} className="h-7 w-7" />
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mt-6 font-display text-xl font-semibold">{t('setup.mode')}</h2>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={t('setup.mode')}>
        {quickOptions.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={qid(quick) === o.id}
            onClick={() => setQuick(o.q)}
            className={`min-h-11 rounded-full border-2 px-3 font-semibold ${qid(quick) === o.id ? 'border-mar bg-mar text-white' : 'border-mar/30 bg-white'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-sm opacity-70">{quick.type === 'none' ? t('setup.classicInfo') : t('setup.quickInfo')}</p>

      <h2 className="mt-6 font-display text-xl font-semibold">{t('ui.sound')}</h2>
      <div className="mt-2"><SoundToggle /></div>

      <ActionButton
        big
        variant="primary"
        className="mt-6 w-full"
        check={players.slice(0, count).every((p) => p.isBot) ? { ok: false, reason: 'setup.needHuman' } : undefined}
        onClick={() => newGame(players.slice(0, count), quick)}
      >
        {t('setup.start')}
      </ActionButton>
    </main>
  )
}
