// Reducer puro: (estado, acción) => nuevo estado.
// Internamente trabaja sobre una copia profunda y la muta; desde fuera es puro.
import type { Action } from './actions'
import { BOARD, BOARD_SIZE, GO_SALARY, HOTEL, JAIL_FINE, JAIL_INDEX, MAX_JAIL_TURNS } from './board'
import { CARD_BY_ID } from './cards'
import {
  activePlayers, buildingCounts, currentPlayer, getPlayer, groupOf, nearestForward,
  netWorth, ownableTile, ownsFullGroup, rentFor, tilesOwnedBy, unmortgageCost,
} from './queries'
import { nextRandom } from './rng'
import type { GameEvent, GameState, LandOutcome, LogEntry, ResumePhase } from './state'
import { type DeckId, isOwnable } from './types'
import { minBid, validate } from './validate'

const MAX_LOG = 300

// ---------- utilidades internas (mutan el borrador) ----------

function log(s: GameState, key: string, extra: Omit<LogEntry, 'id' | 'key'> = {}) {
  s.logSeq++
  s.log.push({ id: s.logSeq, key, ...extra })
  if (s.log.length > MAX_LOG) s.log.splice(0, s.log.length - MAX_LOG)
}

function emit(s: GameState, e: GameEvent) {
  s.events.push(e)
}

function rollDie(s: GameState): number {
  const [r, seed] = nextRandom(s.rng)
  s.rng = seed
  return 1 + Math.floor(r * 6)
}

function credit(s: GameState, playerId: string, amount: number) {
  if (amount <= 0) return
  getPlayer(s, playerId).money += amount
  emit(s, { type: 'money', fromId: null, toId: playerId, amount })
}

/** Cobra a un jugador. Si no le llega, se crea una deuda que deberá saldar o declararse en bancarrota. */
function charge(s: GameState, debtorId: string, creditorId: string | null, amount: number) {
  if (amount <= 0) return
  const debtor = getPlayer(s, debtorId)
  if (debtor.bankrupt) return
  if (creditorId && getPlayer(s, creditorId).bankrupt) creditorId = null
  if (debtor.money >= amount && !s.debts.some((d) => d.debtorId === debtorId)) {
    debtor.money -= amount
    if (creditorId) getPlayer(s, creditorId).money += amount
    emit(s, { type: 'money', fromId: debtorId, toId: creditorId, amount })
  } else {
    s.debts.push({ debtorId, creditorId, amount })
    log(s, 'log.debt', { vars: { name: debtor.name, amount } })
  }
}

/** Fija la siguiente fase; si hay deudas pendientes, se pasa antes por la fase de deuda */
function finalize(s: GameState, next: ResumePhase) {
  if (s.phase === 'gameOver') return
  if (s.debts.length > 0) {
    s.resumePhase = next
    s.phase = 'debt'
  } else {
    s.phase = next
  }
}

function afterMovePhase(s: GameState): ResumePhase {
  const p = currentPlayer(s)
  if (p.bankrupt || p.inJail) return 'awaitEndTurn'
  return s.extraRoll ? 'awaitRoll' : 'awaitEndTurn'
}

function checkGroupComplete(s: GameState, playerId: string, tile: number) {
  const g = groupOf(tile)
  if (g && ownsFullGroup(s, playerId, g)) {
    emit(s, { type: 'groupComplete', playerId, group: g })
    log(s, 'log.groupComplete', { vars: { name: getPlayer(s, playerId).name }, texts: { group: `group.${g}` } })
  }
}

function sendToJail(s: GameState, playerId: string) {
  const p = getPlayer(s, playerId)
  const from = p.position
  p.position = JAIL_INDEX
  p.inJail = true
  p.jailTurns = 0
  if (currentPlayer(s).id === playerId) {
    s.extraRoll = false
    s.doublesCount = 0
  }
  emit(s, { type: 'move', playerId, from, to: JAIL_INDEX, direct: true })
  emit(s, { type: 'jail', playerId })
  log(s, 'log.goToJail', { vars: { name: p.name } })
}

/** Avanza casilla a casilla; cobra la SALIDA si pasa por ella */
function moveForward(s: GameState, playerId: string, steps: number) {
  const p = getPlayer(s, playerId)
  const from = p.position
  const to = (from + steps) % BOARD_SIZE
  p.position = to
  emit(s, { type: 'move', playerId, from, to, direct: false })
  if (from + steps >= BOARD_SIZE) {
    credit(s, playerId, GO_SALARY)
    log(s, 'log.passGo', { vars: { name: p.name, amount: GO_SALARY } })
  }
}

/** Avanza hasta una casilla concreta (cartas), pasando por la SALIDA si hace falta */
function moveToTile(s: GameState, playerId: string, target: number) {
  const p = getPlayer(s, playerId)
  const steps = (target - p.position + BOARD_SIZE) % BOARD_SIZE
  moveForward(s, playerId, steps)
}

type LandingResult = 'buy' | 'none'

function resolveLanding(s: GameState, playerId: string, cardMultiplier?: number, depth = 0): LandingResult {
  const p = getPlayer(s, playerId)
  const t = BOARD[p.position]
  s.lastLanded = t.index
  const land = (outcome: LandOutcome, amount?: number, toId?: string | null) =>
    emit(s, { type: 'land', playerId, tile: t.index, outcome, amount, toId })

  if (isOwnable(t)) {
    const own = s.ownership[t.index]
    if (!own.owner) {
      land('free')
      log(s, 'log.landFree', { vars: { name: p.name, amount: t.price }, tiles: { tile: t.index } })
      return 'buy'
    }
    if (own.owner === playerId) {
      land('own')
      log(s, 'log.landOwn', { vars: { name: p.name }, tiles: { tile: t.index } })
      return 'none'
    }
    const owner = getPlayer(s, own.owner)
    if (own.mortgaged) {
      land('mortgaged', 0, owner.id)
      log(s, 'log.landMortgaged', { vars: { name: p.name }, tiles: { tile: t.index } })
      return 'none'
    }
    const diceTotal = s.dice ? s.dice[0] + s.dice[1] : 0
    const rent = rentFor(s, t.index, diceTotal, cardMultiplier)
    land('rent', rent, owner.id)
    log(s, 'log.rent', { vars: { name: p.name, amount: rent, owner: owner.name }, tiles: { tile: t.index } })
    charge(s, playerId, owner.id, rent)
    return 'none'
  }

  switch (t.kind) {
    case 'tax':
      land('tax', t.amount, null)
      log(s, 'log.tax', { vars: { name: p.name, amount: t.amount }, texts: { tile: t.nameKey } })
      charge(s, playerId, null, t.amount)
      return 'none'
    case 'card':
      land('card')
      return depth > 3 ? 'none' : drawCard(s, playerId, t.deck, depth)
    case 'goToJail':
      land('goToJail')
      sendToJail(s, playerId)
      return 'none'
    case 'parking':
      land('parking')
      log(s, 'log.parking', { vars: { name: p.name } })
      return 'none'
    case 'jail':
      land('visit')
      log(s, 'log.visitJail', { vars: { name: p.name } })
      return 'none'
    case 'go':
      land('go')
      return 'none'
  }
  return 'none'
}

function drawCard(s: GameState, playerId: string, deck: DeckId, depth: number): LandingResult {
  const p = getPlayer(s, playerId)
  const id = s.decks[deck].shift()
  if (!id) return 'none' // mazo vacío (todas las cartas retenidas): no pasa nada
  const card = CARD_BY_ID[id]
  s.lastCard = { cardId: id, playerId }
  emit(s, { type: 'card', cardId: id, playerId })
  log(s, 'log.card', { vars: { name: p.name }, texts: { deck: `deck.${deck}`, card: card.textKey } })

  if (card.effect.type === 'jailFree') p.jailFreeCards.push(deck)
  else s.decks[deck].push(id)

  const e = card.effect
  switch (e.type) {
    case 'money':
      if (e.amount > 0) credit(s, playerId, e.amount)
      else charge(s, playerId, null, -e.amount)
      return 'none'
    case 'eachPlayer':
      for (const other of activePlayers(s)) {
        if (other.id === playerId) continue
        if (e.amount < 0) charge(s, playerId, other.id, -e.amount)
        else charge(s, other.id, playerId, e.amount)
      }
      return 'none'
    case 'moveTo':
      moveToTile(s, playerId, e.target)
      return resolveLanding(s, playerId, undefined, depth + 1)
    case 'moveBack': {
      const from = p.position
      p.position = (from - e.steps + BOARD_SIZE) % BOARD_SIZE
      emit(s, { type: 'move', playerId, from, to: p.position, direct: false, backwards: true })
      return resolveLanding(s, playerId, undefined, depth + 1)
    }
    case 'nearest':
      moveToTile(s, playerId, nearestForward(p.position, e.kind))
      return resolveLanding(s, playerId, e.rentMultiplier, depth + 1)
    case 'goToJail':
      sendToJail(s, playerId)
      return 'none'
    case 'jailFree':
      return 'none'
    case 'repairs': {
      const { houses, hotels } = buildingCounts(s, playerId)
      const total = houses * e.perHouse + hotels * e.perHotel
      if (total > 0) charge(s, playerId, null, total)
      return 'none'
    }
  }
}

function endByNetWorth(s: GameState, reasonKey: string) {
  const ranking = activePlayers(s)
    .map((p) => ({ p, w: netWorth(s, p.id) }))
    .sort((a, b) => b.w - a.w)
  const winner = ranking[0].p
  log(s, reasonKey)
  declareWinner(s, winner.id)
}

function declareWinner(s: GameState, winnerId: string) {
  s.winnerId = winnerId
  s.phase = 'gameOver'
  s.auction = null
  s.trade = null
  s.debts = []
  emit(s, { type: 'gameOver', winnerId })
  log(s, 'log.gameOver', { vars: { name: getPlayer(s, winnerId).name } })
}

function advanceTurn(s: GameState) {
  s.doublesCount = 0
  s.extraRoll = false
  s.lastCard = null
  const n = s.players.length
  let next = s.current
  for (let i = 0; i < n; i++) {
    next = (next + 1) % n
    if (!s.players[next].bankrupt) break
  }
  if (next <= s.current) {
    s.round++
    if (s.quickMode.type === 'rounds' && s.round > s.quickMode.limit) {
      endByNetWorth(s, 'log.roundLimit')
      return
    }
  }
  s.current = next
  s.resumePhase = 'awaitRoll'
  s.phase = s.debts.length > 0 ? 'debt' : 'awaitRoll'
  log(s, 'log.turn', { vars: { name: currentPlayer(s).name } })
}

function eliminate(s: GameState, debtorId: string, creditorId: string | null) {
  const p = getPlayer(s, debtorId)
  const creditor = creditorId ? getPlayer(s, creditorId) : null
  // Los edificios vuelven a la banca a mitad de precio (el dinero va al acreedor)
  for (const i of tilesOwnedBy(s, debtorId)) {
    const t = ownableTile(i)
    const own = s.ownership[i]
    if (t.kind === 'property' && own.houses > 0) {
      p.money += Math.floor((own.houses * t.houseCost) / 2)
      own.houses = 0
    }
  }
  if (creditor && !creditor.bankrupt) {
    creditor.money += p.money
    if (p.money > 0) emit(s, { type: 'money', fromId: debtorId, toId: creditor.id, amount: p.money })
    for (const i of tilesOwnedBy(s, debtorId)) s.ownership[i].owner = creditor.id
    creditor.jailFreeCards.push(...p.jailFreeCards)
    log(s, 'log.bankruptTo', { vars: { name: p.name, creditor: creditor.name } })
  } else {
    for (const i of tilesOwnedBy(s, debtorId)) s.ownership[i] = { owner: null, houses: 0, mortgaged: false }
    for (const deck of p.jailFreeCards) {
      const card = Object.values(CARD_BY_ID).find(
        (c) => c.deck === deck && c.effect.type === 'jailFree',
      )
      if (card && !s.decks[deck].includes(card.id)) s.decks[deck].push(card.id)
    }
    log(s, 'log.bankruptBank', { vars: { name: p.name } })
  }
  p.jailFreeCards = []
  p.money = 0
  p.bankrupt = true
  p.inJail = false
  s.debts = s.debts
    .filter((d) => d.debtorId !== debtorId)
    .map((d) => (d.creditorId === debtorId ? { ...d, creditorId: null } : d))
  emit(s, { type: 'bankrupt', playerId: debtorId })
}

function finishAuction(s: GameState) {
  const a = s.auction!
  emit(s, { type: 'auctionEnd', winnerId: a.highestBidder })
  if (a.highestBidder) {
    const w = getPlayer(s, a.highestBidder)
    w.money -= a.highestBid
    s.ownership[a.tile].owner = w.id
    emit(s, { type: 'money', fromId: w.id, toId: null, amount: a.highestBid })
    emit(s, { type: 'buy', playerId: w.id, tile: a.tile })
    log(s, 'log.auctionWin', { vars: { name: w.name, amount: a.highestBid }, tiles: { tile: a.tile } })
    checkGroupComplete(s, w.id, a.tile)
  } else {
    log(s, 'log.auctionNone', { tiles: { tile: a.tile } })
  }
  s.auction = null
  finalize(s, afterMovePhase(s))
}

/** Quita de la subasta a quien no puede pagar la puja mínima y comprueba si ha terminado */
function settleAuction(s: GameState) {
  const a = s.auction!
  const min = minBid(s)
  const currentId = a.bidders[a.turn]
  const keep = (id: string) => id === a.highestBidder || getPlayer(s, id).money >= min
  const kept = a.bidders.filter(keep)
  if (currentId && kept.includes(currentId)) {
    a.turn = kept.indexOf(currentId)
  } else {
    // el siguiente que quede después de la posición actual
    const before = a.bidders.slice(0, a.turn).filter(keep).length
    a.turn = kept.length ? before % kept.length : 0
  }
  a.bidders = kept
  if (a.bidders.length === 0) return finishAuction(s)
  if (a.bidders[a.turn] === a.highestBidder) return finishAuction(s)
}

// ---------- reducer ----------

export function applyAction(state: GameState, action: Action): GameState {
  if (!validate(state, action).ok) return state
  const s: GameState = structuredClone(state)
  s.events = []
  s.actionSeq++

  switch (action.type) {
    case 'roll': {
      const p = currentPlayer(s)
      const dice: [number, number] = action.dice ?? [rollDie(s), rollDie(s)]
      s.dice = dice
      s.lastCard = null
      s.lastLanded = null
      const total = dice[0] + dice[1]
      const isDouble = dice[0] === dice[1]
      emit(s, { type: 'dice', dice, playerId: p.id })
      log(s, isDouble ? 'log.rollDouble' : 'log.roll', { vars: { name: p.name, d1: dice[0], d2: dice[1], total } })

      if (p.inJail) {
        s.extraRoll = false
        if (isDouble) {
          p.inJail = false
          p.jailTurns = 0
          log(s, 'log.jailOutDoubles', { vars: { name: p.name } })
        } else {
          p.jailTurns++
          if (p.jailTurns < MAX_JAIL_TURNS) {
            log(s, 'log.jailStay', { vars: { name: p.name, tries: MAX_JAIL_TURNS - p.jailTurns } })
            finalize(s, 'awaitEndTurn')
            break
          }
          p.inJail = false
          p.jailTurns = 0
          log(s, 'log.jailForcedPay', { vars: { name: p.name, amount: JAIL_FINE } })
          charge(s, p.id, null, JAIL_FINE)
        }
      } else if (isDouble) {
        s.doublesCount++
        if (s.doublesCount >= 3) {
          log(s, 'log.threeDoubles', { vars: { name: p.name } })
          sendToJail(s, p.id)
          finalize(s, 'awaitEndTurn')
          break
        }
        s.extraRoll = true
      } else {
        s.extraRoll = false
      }

      moveForward(s, p.id, total)
      const result = resolveLanding(s, p.id)
      finalize(s, result === 'buy' ? 'awaitBuy' : afterMovePhase(s))
      break
    }

    case 'payJail': {
      const p = currentPlayer(s)
      p.money -= JAIL_FINE
      p.inJail = false
      p.jailTurns = 0
      emit(s, { type: 'money', fromId: p.id, toId: null, amount: JAIL_FINE })
      log(s, 'log.jailPaid', { vars: { name: p.name, amount: JAIL_FINE } })
      break
    }

    case 'useJailCard': {
      const p = currentPlayer(s)
      const deck = p.jailFreeCards.shift()!
      const card = Object.values(CARD_BY_ID).find((c) => c.deck === deck && c.effect.type === 'jailFree')!
      s.decks[deck].push(card.id)
      p.inJail = false
      p.jailTurns = 0
      log(s, 'log.jailCard', { vars: { name: p.name } })
      break
    }

    case 'buy': {
      const p = currentPlayer(s)
      const t = ownableTile(p.position)
      p.money -= t.price
      s.ownership[t.index].owner = p.id
      emit(s, { type: 'money', fromId: p.id, toId: null, amount: t.price })
      emit(s, { type: 'buy', playerId: p.id, tile: t.index })
      log(s, 'log.buy', { vars: { name: p.name, amount: t.price }, tiles: { tile: t.index } })
      checkGroupComplete(s, p.id, t.index)
      finalize(s, afterMovePhase(s))
      break
    }

    case 'decline': {
      const p = currentPlayer(s)
      const n = s.players.length
      const bidders: string[] = []
      for (let i = 0; i < n; i++) {
        const q = s.players[(s.current + i) % n]
        if (!q.bankrupt) bidders.push(q.id)
      }
      s.auction = { tile: p.position, highestBid: 0, highestBidder: null, bidders, turn: 0 }
      s.phase = 'auction'
      log(s, 'log.auctionStart', { vars: { name: p.name }, tiles: { tile: p.position } })
      settleAuction(s)
      break
    }

    case 'bid': {
      const a = s.auction!
      a.highestBid = action.amount
      a.highestBidder = action.playerId
      a.turn = (a.turn + 1) % a.bidders.length
      emit(s, { type: 'bid', playerId: action.playerId, amount: action.amount })
      log(s, 'log.bid', { vars: { name: getPlayer(s, action.playerId).name, amount: action.amount } })
      settleAuction(s)
      break
    }

    case 'passBid': {
      const a = s.auction!
      a.bidders.splice(a.turn, 1)
      log(s, 'log.passBid', { vars: { name: getPlayer(s, action.playerId).name } })
      settleAuction(s)
      break
    }

    case 'build': {
      const t = ownableTile(action.tile)
      if (t.kind !== 'property') break
      const own = s.ownership[t.index]
      const p = getPlayer(s, own.owner!)
      p.money -= t.houseCost
      own.houses++
      emit(s, { type: 'money', fromId: p.id, toId: null, amount: t.houseCost })
      emit(s, { type: 'build', tile: t.index, houses: own.houses })
      log(s, own.houses === HOTEL ? 'log.buildHotel' : 'log.build', {
        vars: { name: p.name, amount: t.houseCost }, tiles: { tile: t.index },
      })
      break
    }

    case 'sell': {
      const t = ownableTile(action.tile)
      if (t.kind !== 'property') break
      const own = s.ownership[t.index]
      const p = getPlayer(s, own.owner!)
      const refund = Math.floor(t.houseCost / 2)
      own.houses--
      credit(s, p.id, refund)
      emit(s, { type: 'build', tile: t.index, houses: own.houses })
      log(s, 'log.sell', { vars: { name: p.name, amount: refund }, tiles: { tile: t.index } })
      break
    }

    case 'mortgage': {
      const t = ownableTile(action.tile)
      const own = s.ownership[t.index]
      own.mortgaged = true
      emit(s, { type: 'mortgage', tile: t.index, mortgaged: true })
      credit(s, own.owner!, t.mortgage)
      log(s, 'log.mortgage', { vars: { name: getPlayer(s, own.owner!).name, amount: t.mortgage }, tiles: { tile: t.index } })
      break
    }

    case 'unmortgage': {
      const own = s.ownership[action.tile]
      const p = getPlayer(s, own.owner!)
      const cost = unmortgageCost(action.tile)
      p.money -= cost
      own.mortgaged = false
      emit(s, { type: 'mortgage', tile: action.tile, mortgaged: false })
      emit(s, { type: 'money', fromId: p.id, toId: null, amount: cost })
      log(s, 'log.unmortgage', { vars: { name: p.name, amount: cost }, tiles: { tile: action.tile } })
      break
    }

    case 'payDebt': {
      const d = s.debts.shift()!
      const debtor = getPlayer(s, d.debtorId)
      debtor.money -= d.amount
      const creditor = d.creditorId ? getPlayer(s, d.creditorId) : null
      if (creditor) creditor.money += d.amount
      emit(s, { type: 'money', fromId: d.debtorId, toId: d.creditorId, amount: d.amount })
      log(s, creditor ? 'log.payDebt' : 'log.payDebtBank', {
        vars: { name: debtor.name, amount: d.amount, creditor: creditor?.name ?? '' },
      })
      if (s.debts.length === 0) s.phase = s.resumePhase
      break
    }

    case 'bankrupt': {
      const d = s.debts[0]
      const wasCurrent = currentPlayer(s).id === d.debtorId
      eliminate(s, d.debtorId, d.creditorId)
      const alive = activePlayers(s)
      if (alive.length === 1) {
        declareWinner(s, alive[0].id)
        break
      }
      if (wasCurrent) advanceTurn(s)
      else if (s.debts.length === 0) s.phase = s.resumePhase
      break
    }

    case 'proposeTrade': {
      s.trade = structuredClone(action.offer)
      s.tradeCooldown[`${action.offer.fromId}>${action.offer.toId}`] = s.round
      s.resumePhase = s.phase as ResumePhase
      s.phase = 'trade'
      log(s, 'log.tradeProposed', {
        vars: { name: getPlayer(s, action.offer.fromId).name, other: getPlayer(s, action.offer.toId).name },
      })
      break
    }

    case 'acceptTrade': {
      const t = s.trade!
      const from = getPlayer(s, t.fromId)
      const to = getPlayer(s, t.toId)
      from.money += t.get.money - t.give.money
      to.money += t.give.money - t.get.money
      if (t.give.money) emit(s, { type: 'money', fromId: from.id, toId: to.id, amount: t.give.money })
      if (t.get.money) emit(s, { type: 'money', fromId: to.id, toId: from.id, amount: t.get.money })
      for (const i of t.give.tiles) s.ownership[i].owner = to.id
      for (const i of t.get.tiles) s.ownership[i].owner = from.id
      to.jailFreeCards.push(...from.jailFreeCards.splice(0, t.give.jailCards))
      from.jailFreeCards.push(...to.jailFreeCards.splice(0, t.get.jailCards))
      emit(s, { type: 'trade', accepted: true })
      log(s, 'log.tradeAccepted', { vars: { name: to.name, other: from.name } })
      for (const i of t.give.tiles) checkGroupComplete(s, to.id, i)
      for (const i of t.get.tiles) checkGroupComplete(s, from.id, i)
      s.trade = null
      s.phase = s.resumePhase
      break
    }

    case 'rejectTrade': {
      const t = s.trade!
      emit(s, { type: 'trade', accepted: false })
      log(s, 'log.tradeRejected', { vars: { name: getPlayer(s, t.toId).name } })
      s.trade = null
      s.phase = s.resumePhase
      break
    }

    case 'endTurn':
      advanceTurn(s)
      break

    case 'timeUp':
      endByNetWorth(s, 'log.timeUp')
      break
  }

  return s
}
