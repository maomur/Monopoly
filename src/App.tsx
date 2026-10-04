import { useEffect, useRef } from 'react'
import { useGame } from './store/gameStore'
import { ActionBar } from './ui/ActionBar'
import { Board } from './ui/Board'
import { Header } from './ui/Header'
import { ManageModal } from './ui/modals/ManageModal'
import {
  CardModal, ConfirmBankruptModal, GameOverModal, HelpModal, MenuModal, TileModal,
} from './ui/modals/Modals'
import { TradeModal } from './ui/modals/TradeModal'
import { Panels } from './ui/Panels'
import { Setup } from './ui/Setup'
import { useT } from './ui/useT'

function Toast() {
  const toast = useGame((s) => s.toast)
  if (!toast) return null
  return (
    <div
      key={toast.id}
      role="status"
      className="toast-in fixed inset-x-3 top-16 z-[60] mx-auto max-w-md rounded-xl bg-ink px-4 py-3 text-center text-white shadow-xl"
    >
      {toast.text}
    </div>
  )
}

function Celebrate() {
  const celebrate = useGame((s) => s.celebrate)
  const t = useT()
  if (!celebrate || Date.now() - celebrate > 2500) return null
  return (
    <div key={celebrate} className="toast-in pointer-events-none fixed inset-x-0 top-1/3 z-[55] text-center" aria-live="polite">
      <span className="rounded-2xl bg-sol px-5 py-3 font-display text-2xl font-bold shadow-xl">🎉 {t('ui.groupComplete')}</span>
    </div>
  )
}

function Modals() {
  const modal = useGame((s) => s.modal)
  const game = useGame((s) => s.game)!
  const shownCard = useGame((s) => s.shownCard)
  const busy = useGame((s) => s.busy)
  return (
    <>
      {modal.type === 'manage' && <ManageModal />}
      {modal.type === 'trade' && <TradeModal />}
      {modal.type === 'help' && <HelpModal />}
      {modal.type === 'menu' && <MenuModal />}
      {modal.type === 'tile' && <TileModal index={modal.index} />}
      {modal.type === 'confirmBankrupt' && <ConfirmBankruptModal />}
      {shownCard && <CardModal />}
      {game.phase === 'gameOver' && !busy && <GameOverModal />}
    </>
  )
}

function GameScreen() {
  // La barra de acciones es fija en móvil y su altura varía: reservamos ese hueco al final de la página
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = bar.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--bar-h', `${el.offsetHeight}px`)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div className="min-h-dvh pb-[calc(var(--bar-h,11rem)+1rem)] lg:pb-4 land:h-dvh land:min-h-0 land:overflow-hidden land:pb-0">
      <Header className="land:hidden" />
      <main className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-4 lg:px-4 land:flex land:h-full land:max-w-none land:gap-0 land:px-0">
        {/* Horizontal: el tablero ocupa toda la altura a la izquierda */}
        <div className="lg:sticky lg:top-16 lg:self-start land:static land:h-full land:shrink-0 land:pl-[env(safe-area-inset-left)]">
          <div className="mx-auto w-full max-w-[min(100%,calc(100dvh-5rem))] land:h-full land:w-auto land:max-w-none land:aspect-square">
            <Board />
          </div>
        </div>
        <div className="px-3 pt-3 lg:px-0 lg:pt-0 land:flex land:h-full land:min-w-0 land:flex-1 land:flex-col land:overflow-y-auto land:overscroll-contain land:px-0 land:pt-0 land:pr-[env(safe-area-inset-right)]">
          <Header className="hidden land:flex" compact />
          <div ref={bar} className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/10 bg-arena/97 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(0,0,0,0.08)] backdrop-blur lg:static lg:mb-4 lg:rounded-2xl lg:border lg:bg-white lg:shadow-sm land:static land:mx-2 land:mb-2 land:rounded-xl land:border land:bg-white land:p-2 land:shadow-sm">
            <div className="mx-auto max-w-lg">
              <ActionBar />
            </div>
          </div>
          <div className="land:px-2 land:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <Panels />
          </div>
        </div>
      </main>
      <Modals />
    </div>
  )
}

export default function App() {
  const game = useGame((s) => s.game)
  const lang = useGame((s) => s.lang)
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  return (
    <>
      {game ? <GameScreen /> : <Setup />}
      <Toast />
      <Celebrate />
    </>
  )
}
