import { useState } from 'react'
import { PLAYER_COLORS, TOKENS, type PlayerSetup, type TokenId } from '../engine/state'
import { useGame, type QuickSetup } from '../store/gameStore'
import { LangToggle, SoundToggle } from './Header'
import { InstallApp } from './modals/Modals'
import { onlineAvailable, roomFromUrl } from '../online/config'
import { lastRoom } from '../online/identity'
import { normalizeCode } from '../online/protocol'
import { ActionButton } from './primitives'
import { BotLevelPicker } from './BotLevel'
import { TOKEN_LABEL_KEY, TokenIcon } from './Token'
import { useT } from './useT'

const DEFAULT_NAMES = ['Ana', 'Marc', 'Laia', 'Pol']

/** Jugar online: crear sala o unirse con un código */
function OnlineCard({ name, token }: { name: string; token: TokenId }) {
  const t = useT()
  const create = useGame((s) => s.onlineCreate)
  const join = useGame((s) => s.onlineJoin)
  const fromUrl = roomFromUrl()
  const [code, setCode] = useState(fromUrl ? normalizeCode(fromUrl) : '')
  const [myName, setMyName] = useState(name)
  const previous = lastRoom()
  return (
    <section className={`mt-4 rounded-2xl bg-white p-4 shadow-sm ${fromUrl ? 'ring-2 ring-mar' : ''}`}>
      <h2 className="font-display text-xl font-semibold">🌐 {t('online.title')}</h2>
      <p className="mt-1 text-sm opacity-75">{t('online.intro')}</p>
      <label htmlFor="online-name" className="mt-3 block text-sm font-semibold">{t('online.yourName')}</label>
      <input
        id="online-name"
        className="mt-1 h-11 w-full rounded-lg border-2 border-ink/15 px-2"
        value={myName}
        maxLength={14}
        onChange={(e) => setMyName(e.target.value)}
      />
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (code.length >= 4) join(code, myName, token)
        }}
      >
        <label htmlFor="online-code" className="sr-only">{t('online.codeLabel')}</label>
        <input
          id="online-code"
          className="h-12 min-w-0 flex-1 rounded-lg border-2 border-mar/30 px-3 font-display text-xl uppercase tracking-[0.15em]"
          placeholder={t('online.codePlaceholder')}
          value={code}
          autoCapitalize="characters"
          onChange={(e) => setCode(normalizeCode(e.target.value))}
        />
        <button type="submit" className="h-12 rounded-xl bg-mar px-4 font-display font-semibold text-white disabled:opacity-40" disabled={code.length < 4}>
          {t('online.join')}
        </button>
      </form>
      <ActionButton big variant="primary" className="mt-3 w-full" onClick={() => create(myName, token)}>
        {t('online.create')}
      </ActionButton>
      {previous && !fromUrl && (
        <ActionButton variant="ghost" className="mt-2 w-full" onClick={() => join(previous, myName, token)}>
          {t('online.rejoin', { code: previous })}
        </ActionButton>
      )}
    </section>
  )
}

export function Setup() {
  const city = useGame((s) => s.city) ?? 'bcn'
  const chooseCity = useGame((s) => s.chooseCity)
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
    <main className="mx-auto max-w-lg px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <button type="button" onClick={() => chooseCity(null)} className="mb-2 inline-flex min-h-10 items-center gap-1 rounded-full bg-white px-3 text-sm font-semibold text-mar-deep shadow-sm ring-1 ring-ink/10">
        ← {t('home.back')}
      </button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold text-mar">{t('app.title')}</h1>
          <p className="text-terracota">{t('app.tagline')}</p>
        </div>
        <LangToggle />
      </div>

      {onlineAvailable() && <OnlineCard name={players[0].name} token={players[0].token} />}

      {onlineAvailable() && <h2 className="mt-8 font-display text-xl font-semibold">📱 {t('online.localTitle')}</h2>}

      {saved && (saved.city ?? 'bcn') === city && (
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
            {p.isBot && (
              <div className="mt-2">
                <BotLevelPicker value={p.botLevel ?? 'intermediate'} onChange={(l) => update(i, { botLevel: l })} />
              </div>
            )}
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
      <div className="mt-4 grid"><InstallApp /></div>

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
