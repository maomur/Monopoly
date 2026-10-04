import { BOARD, GROUP_COLORS } from './engine/board'
import { translate } from './i18n'

export default function App() {
  return (
    <main className="min-h-full p-6">
      <h1 className="font-display text-4xl font-bold text-mar">{translate('es', 'app.title')}</h1>
      <p className="text-terracota">{translate('es', 'app.tagline')}</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BOARD.map((t) => (
          <li key={t.index} className="rounded-lg bg-white p-2 text-sm shadow">
            {t.kind === 'property' && (
              <span
                className="mr-2 inline-block h-3 w-3 rounded-sm"
                style={{ background: GROUP_COLORS[t.group].bg }}
              />
            )}
            {t.index}. {t.name}
          </li>
        ))}
      </ul>
    </main>
  )
}
