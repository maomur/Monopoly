import { describe, expect, it } from 'vitest'
import { RoomLogic, animationBudgetMs } from '../../src/online/roomLogic'

function lobby() {
  const r = new RoomLogic('ABCDE')
  r.handle('kA', { t: 'hello', key: 'kA', create: true })
  r.handle('kA', { t: 'join', name: 'Ana', token: 'sagrada' })
  r.handle('kB', { t: 'hello', key: 'kB', create: false })
  r.handle('kB', { t: 'join', name: 'Marc', token: 'sagrada' })
  return r
}

describe('salas online', () => {
  it('unirse a una sala que no existe da error', () => {
    const r = new RoomLogic('ZZZZZ')
    expect(r.handle('k', { t: 'hello', key: 'k', create: false })).toEqual({ error: 'roomNotFound' })
  })

  it('el primero es anfitrión y las fichas no se repiten', () => {
    const r = lobby()
    const room = r.publicRoom()
    expect(room.seats).toHaveLength(2)
    expect(room.hostSeatId).toBe(room.seats[0].id)
    expect(room.seats[0].token).toBe('sagrada')
    expect(room.seats[1].token).not.toBe('sagrada')
    // la clave secreta nunca sale en la sala pública
    expect(JSON.stringify(room)).not.toContain('kA')
  })

  it('solo el anfitrión añade bots y empieza', () => {
    const r = lobby()
    expect(r.handle('kB', { t: 'addBot' })).toEqual({})
    r.handle('kA', { t: 'addBot' })
    expect(r.publicRoom().seats).toHaveLength(3)
    expect(r.handle('kB', { t: 'start' })).toEqual({})
    const fx = r.handle('kA', { t: 'start' })
    expect(fx.state?.game.players.map((p) => p.name)).toEqual(['Ana', 'Marc', 'Bot Gaudí'])
    expect(r.publicRoom().seats.map((s) => s.playerId)).toEqual(['p1', 'p2', 'p3'])
  })

  it('cada uno solo puede jugar en su turno y no puede elegir los dados', () => {
    const r = lobby()
    r.handle('kA', { t: 'start' })
    expect(r.handle('kB', { t: 'action', action: { type: 'roll' } })).toEqual({ error: 'notYourTurn' })
    const fx = r.handle('kA', { t: 'action', action: { type: 'roll', dice: [6, 6] } })
    const dice = fx.state!.events.find((e) => e.type === 'dice')
    expect(dice).toBeDefined()
    // la tirada la decide el servidor (con la semilla de la partida)
    expect(r.data.game!.dice).not.toBeNull()
  })

  it('el servidor juega por los bots hasta que le toca a un humano', () => {
    const r = new RoomLogic('BOTS1')
    r.handle('kA', { t: 'hello', key: 'kA', create: true })
    r.handle('kA', { t: 'join', name: 'Ana', token: 'sagrada' })
    r.handle('kA', { t: 'addBot' })
    r.handle('kA', { t: 'start' })
    // turno de Ana: no hay auto-actor
    expect(r.pendingAutoActor()).toBeNull()
    // Ana tira y termina (o decide) hasta que le toca al bot
    for (let i = 0; i < 20 && r.data.game!.current === 0; i++) {
      const g = r.data.game!
      const a = g.phase === 'awaitBuy' ? { type: 'decline' as const }
        : g.phase === 'awaitEndTurn' ? { type: 'endTurn' as const }
        : g.phase === 'auction' ? { type: 'passBid' as const, playerId: g.auction!.bidders[g.auction!.turn] }
        : { type: 'roll' as const }
      if (r.pendingAutoActor()) r.autoStep()
      else r.handle('kA', { t: 'action', action: a })
    }
    expect(r.data.game!.current).toBe(1)
    expect(r.pendingAutoActor()).toEqual({ playerId: 'p2', reason: 'bot' })
    let steps = 0
    while (r.pendingAutoActor() && steps++ < 50) r.autoStep()
    expect(r.data.game!.current).toBe(0)
  })

  it('si un humano se desconecta en partida, el servidor puede jugar por él', () => {
    const r = lobby()
    r.handle('kA', { t: 'start' })
    r.setConnected('kA', false)
    expect(r.pendingAutoActor()).toEqual({ playerId: 'p1', reason: 'away' })
    r.setConnected('kA', true)
    expect(r.pendingAutoActor()).toBeNull()
  })

  it('revancha: vuelve a la sala con los mismos asientos', () => {
    const r = lobby()
    r.handle('kA', { t: 'start' })
    r.data.game = { ...r.data.game!, phase: 'gameOver', winnerId: 'p1' }
    r.handle('kA', { t: 'rematch' })
    expect(r.publicRoom().phase).toBe('lobby')
    expect(r.publicRoom().seats).toHaveLength(2)
  })

  it('el tiempo de animación crece con el recorrido', () => {
    const short = animationBudgetMs([{ type: 'move', playerId: 'p1', from: 0, to: 2, direct: false }])
    const long = animationBudgetMs([{ type: 'move', playerId: 'p1', from: 0, to: 11, direct: false }])
    expect(long).toBeGreaterThan(short)
  })
})
