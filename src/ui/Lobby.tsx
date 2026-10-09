// Sala de espera online: código para invitar, asientos y botón de empezar (anfitrión).
import { useEffect, useRef, useState } from 'react'
import { TOKENS, PLAYER_COLORS, type TokenId } from '../engine/state'
import type { QuickSetup } from '../online/protocol'
import { useGame } from '../store/gameStore'
import { ActionButton } from './primitives'
import { BotBadge, BotLevelPicker } from './BotLevel'
import type { BotLevel } from '../engine/state'
import { TOKEN_LABEL_KEY, TokenIcon } from './Token'
import { useT } from './useT'

function inviteLink(code: string) {
  return `${window.location.origin}/?sala=${code}`
}

export function Lobby() {
  const t = useT()
  const online = useGame((s) => s.online)!
  const send = useGame((s) => s.onlineSend)
  const leave = useGame((s) => s.onlineLeave)
  const showToast = useGame((s) => s.showToast)
  const room = online.room
  const me = room?.seats.find((s) => s.id === online.you) ?? null
  const isHost = !!me && room?.hostSeatId === me.id
  const [name, setName] = useState(me?.name ?? '')
  const [botLevel, setBotLevel] = useState<BotLevel>('intermediate')
  const typing = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (me && !name) setName(me.name)
  }, [me, name])

  const updateName = (v: string) => {
    setName(v)
    if (typing.current) clearTimeout(typing.current)
    typing.current = setTimeout(() => me && send({ t: 'update', name: v, token: me.token }), 400)
  }

  const share = async () => {
    const url = inviteLink(online.code)
    const text = t('online.shareText', { code: online.code })
    try {
      if (navigator.share) {
        await navigator.share({ title: 'BCN Tycoon', text, url })
        return
      }
    } catch {
      return // cancelado
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      showToast(t('online.copied'))
    } catch {
      showToast(url)
    }
  }

  // Errores y estados de conexión
  if (online.error === 'roomNotFound' || online.error === 'gameStarted' || online.error === 'roomFull') {
    return (
      <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-4">
        <div className="w-full space-y-4 rounded-2xl bg-white p-5 text-center shadow">
          <p className="font-display text-2xl font-bold">{online.code}</p>
          <p>{t(`online.error.${online.error}`)}</p>
          <ActionButton big variant="primary" className="w-full" onClick={leave}>{t('online.back')}</ActionButton>
        </div>
      </main>
    )
  }

  const quickOptions: { id: string; q: QuickSetup; label: string }[] = [
    { id: 'none', q: { type: 'none' }, label: t('setup.classic') },
    { id: 'r20', q: { type: 'rounds', limit: 20 }, label: t('setup.rounds', { n: 20 }) },
    { id: 'r40', q: { type: 'rounds', limit: 40 }, label: t('setup.rounds', { n: 40 }) },
    { id: 't30', q: { type: 'time', minutes: 30 }, label: t('setup.minutes', { n: 30 }) },
    { id: 't60', q: { type: 'time', minutes: 60 }, label: t('setup.minutes', { n: 60 }) },
  ]
  const qid = (q: QuickSetup) => (q.type === 'none' ? 'none' : q.type === 'rounds' ? `r${q.limit}` : `t${q.minutes}`)
  const host = room?.seats.find((s) => s.id === room.hostSeatId)

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold text-mar">{t('online.lobby')}</h1>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${online.status === 'open' ? 'bg-olivo text-white' : 'bg-terracota text-white'}`}>
          {online.status === 'open' ? t('online.connected') : t('online.connecting')}
        </span>
      </div>

      {/* Código para invitar */}
      <section className="mt-4 rounded-2xl bg-mar p-4 text-center text-white shadow">
        <p className="text-sm opacity-85">{t('online.codeLabel')}</p>
        <p className="font-display text-5xl font-bold tracking-[0.18em]">{online.code}</p>
        <ActionButton big className="mt-3 w-full" onClick={share}>📨 {t('online.invite')}</ActionButton>
      </section>

      {/* Asientos */}
      <h2 className="mt-6 font-display text-xl font-semibold">{t('online.players', { n: room?.seats.length ?? 0 })}</h2>
      <ul className="mt-2 space-y-2">
        {room?.seats.map((s, i) => (
          <li key={s.id} className={`flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm ${s.id === me?.id ? 'ring-2 ring-ink' : ''}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white" style={{ background: PLAYER_COLORS[i] }}>
              <TokenIcon token={s.token} className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">
              {s.name}
              {s.id === me?.id && <span className="ml-1 text-sm font-normal opacity-70">({t('online.you')})</span>}
              {s.id === room.hostSeatId && <span className="ml-1" title={t('online.host')}>👑</span>}
              {s.isBot && <BotBadge level={s.botLevel} />}
            </span>
            {!s.isBot && (
              <span
                className={`h-2.5 w-2.5 rounded-full ${s.connected ? 'bg-olivo' : 'bg-ink/25'}`}
                title={s.connected ? t('online.connected') : t('online.away')}
              />
            )}
            {isHost && s.id !== me?.id && (
              <button
                type="button"
                onClick={() => send({ t: 'removeSeat', seatId: s.id })}
                className="grid h-9 w-9 place-items-center rounded-full text-xl hover:bg-ink/10"
                aria-label={t('online.remove', { name: s.name })}
              >
                ×
              </button>
            )}
          </li>
        ))}
        {room && room.seats.length < 4 && isHost && (
          <li>
            <div className="rounded-xl bg-white p-2 shadow-sm">
              <BotLevelPicker value={botLevel} onChange={setBotLevel} />
              <ActionButton className="mt-2 w-full" onClick={() => send({ t: 'addBot', level: botLevel })}>🤖 {t('online.addBot')}</ActionButton>
            </div>
          </li>
        )}
      </ul>

      {/* Mi nombre y ficha */}
      {me && (
        <section className="mt-6 rounded-xl bg-white p-3 shadow-sm">
          <label htmlFor="my-name" className="text-sm font-semibold">{t('online.yourName')}</label>
          <input
            id="my-name"
            className="mt-1 h-11 w-full rounded-lg border-2 border-ink/15 px-2"
            value={name}
            maxLength={14}
            onChange={(e) => updateName(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('setup.token')}>
            {TOKENS.map((tok: TokenId) => {
              const taken = room?.seats.some((s) => s.id !== me.id && s.token === tok)
              return (
                <button
                  key={tok}
                  type="button"
                  role="radio"
                  aria-checked={me.token === tok}
                  aria-label={t(TOKEN_LABEL_KEY[tok])}
                  disabled={taken}
                  onClick={() => send({ t: 'update', name: name || me.name, token: tok })}
                  className={`grid h-11 w-11 place-items-center rounded-full border-2 ${me.token === tok ? 'border-ink bg-mar text-white' : 'border-transparent bg-ink/5'} ${taken ? 'opacity-30' : ''}`}
                >
                  <TokenIcon token={tok} className="h-7 w-7" />
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Modo y empezar */}
      {isHost ? (
        <>
          <h2 className="mt-6 font-display text-xl font-semibold">{t('setup.mode')}</h2>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={t('setup.mode')}>
            {quickOptions.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={room ? qid(room.quick) === o.id : false}
                onClick={() => send({ t: 'setQuick', quick: o.q })}
                className={`min-h-11 rounded-full border-2 px-3 font-semibold ${room && qid(room.quick) === o.id ? 'border-mar bg-mar text-white' : 'border-mar/30 bg-white'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <ActionButton
            big
            variant="primary"
            className="mt-6 w-full"
            check={(room?.seats.length ?? 0) < 2 ? { ok: false, reason: 'online.error.needTwo' } : undefined}
            onClick={() => send({ t: 'start' })}
          >
            {t('online.start')}
          </ActionButton>
        </>
      ) : (
        <p className="mt-6 rounded-xl bg-white p-4 text-center">
          {room?.phase === 'playing' ? t('online.loading') : t('online.waitingHost', { name: host?.name ?? '' })}
        </p>
      )}

      <ActionButton variant="ghost" className="mt-4 w-full" onClick={leave}>{t('online.leave')}</ActionButton>
    </main>
  )
}
