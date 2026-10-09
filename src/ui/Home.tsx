// Página principal: elegir la ciudad en la que se juega
import { BRAND, CITIES, type CityId, type CityInfo } from '../cities'
import { useGame } from '../store/gameStore'
import { LangToggle } from './Header'
import { useT } from './useT'

/** Silueta de cada ciudad (dibujo propio, trazos simples) */
function Skyline({ id }: { id: CityId }) {
  const common = { viewBox: '0 0 200 70', className: 'h-full w-full', 'aria-hidden': true, preserveAspectRatio: 'xMidYMax meet' as const }
  if (id === 'bcn') {
    return (
      <svg {...common}>
        <path d="M0 70 V60 H200 V70Z" fill="#fff" opacity=".18" />
        {/* Torres puntiagudas */}
        <g fill="#fff" opacity=".92">
          <path d="M78 60 L84 18 L90 60Z" />
          <path d="M91 60 L98 6 L105 60Z" />
          <path d="M106 60 L112 18 L118 60Z" />
          <rect x="74" y="54" width="48" height="6" rx="2" />
        </g>
        {/* Edificios del Eixample */}
        <g fill="#fff" opacity=".55">
          <rect x="20" y="40" width="22" height="20" rx="2" />
          <rect x="45" y="46" width="18" height="14" rx="2" />
          <rect x="130" y="44" width="20" height="16" rx="2" />
          <rect x="154" y="36" width="10" height="24" rx="2" />
          <rect x="168" y="48" width="18" height="12" rx="2" />
        </g>
        {/* Mar */}
        <path d="M0 64 Q10 61 20 64 T40 64 T60 64 T80 64 T100 64 T120 64 T140 64 T160 64 T180 64 T200 64" stroke="#fff" strokeWidth="1.5" fill="none" opacity=".5" />
      </svg>
    )
  }
  if (id === 'roma') {
    return (
      <svg {...common}>
        <path d="M0 70 V60 H200 V70Z" fill="#fff" opacity=".18" />
        {/* Cúpula */}
        <g fill="#fff" opacity=".55">
          <path d="M140 60 V40 Q140 22 158 22 Q176 22 176 40 V60Z" />
          <rect x="155" y="12" width="6" height="11" rx="2" />
          <rect x="20" y="44" width="24" height="16" rx="2" />
          <path d="M46 60 L52 34 L58 60Z" />
        </g>
        {/* Coliseo */}
        <g fill="#fff" opacity=".92">
          <path d="M66 60 V32 Q66 24 100 24 Q134 24 134 30 V60Z" />
          <path d="M120 24 L134 20 V30Z" />
        </g>
        <g fill="#C2512E" opacity=".9">
          {[72, 82, 92, 102, 112, 122].map((x) => (
            <path key={`a${x}`} d={`M${x} 40 v-6 a3 3 0 0 1 6 0 v6Z`} />
          ))}
          {[72, 82, 92, 102, 112, 122].map((x) => (
            <path key={`b${x}`} d={`M${x} 56 v-7 a3 3 0 0 1 6 0 v7Z`} />
          ))}
        </g>
      </svg>
    )
  }
  return (
    <svg {...common}>
      {/* Montañas y metrocable */}
      <path d="M0 70 L0 40 L35 16 L70 38 L105 10 L145 36 L175 20 L200 34 V70Z" fill="#fff" opacity=".35" />
      <path d="M10 22 L190 52" stroke="#fff" strokeWidth="1.4" opacity=".8" />
      <g fill="#fff" opacity=".9">
        <rect x="60" y="34" width="10" height="8" rx="2" />
        <rect x="130" y="46" width="10" height="8" rx="2" />
      </g>
      <g fill="#fff" opacity=".6">
        <rect x="20" y="50" width="12" height="20" />
        <rect x="36" y="46" width="14" height="24" />
        <rect x="150" y="48" width="12" height="22" />
        <rect x="166" y="54" width="18" height="16" />
      </g>
    </svg>
  )
}

function CityCard({ city, savedHere }: { city: CityInfo; savedHere: boolean }) {
  const t = useT()
  const choose = useGame((s) => s.chooseCity)
  const showToast = useGame((s) => s.showToast)
  const isNew = city.id === 'roma'
  return (
    <button
      type="button"
      onClick={() => (city.available ? choose(city.id) : showToast(t('home.soonToast', { city: city.name })))}
      className={`city-card relative block w-full overflow-hidden rounded-3xl text-left text-white shadow-lg transition active:scale-[.98] ${city.available ? '' : 'opacity-70 grayscale-[35%]'}`}
      style={{ background: `linear-gradient(140deg, ${city.colors.from}, ${city.colors.to})` }}
      aria-label={`${city.name}${city.available ? '' : ` · ${t('home.soon')}`}`}
    >
      <div className="relative z-10 p-4 pb-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-2xl" aria-hidden="true">{city.flag}</span>
          <span className="font-display text-3xl font-bold leading-none">{city.name}</span>
          {isNew && city.available && (
            <span className="ml-auto rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-ink" style={{ background: city.colors.accent }}>
              {t('home.new')}
            </span>
          )}
          {!city.available && (
            <span className="ml-auto whitespace-nowrap rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-ink">🔒 {t('home.soon')}</span>
          )}
        </div>
        <p className="mt-1 text-sm font-semibold" style={{ color: city.colors.accent }}>{t(`home.tag.${city.id}`)}</p>
        {savedHere && <p className="mt-1 text-xs font-semibold text-white/85">▶ {t('home.continue', { city: city.name })}</p>}
      </div>
      <div className="h-24 w-full px-2 land:h-16">
        <Skyline id={city.id} />
      </div>
    </button>
  )
}

export function Home() {
  const t = useT()
  const saved = useGame((s) => s.savedGame)
  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] land:max-w-4xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-bold uppercase tracking-[0.2em] text-terracota">{BRAND}</p>
          <h1 className="font-display text-4xl font-bold text-mar">{t('home.title')}</h1>
          <p className="mt-1 opacity-75">{t('home.subtitle')}</p>
        </div>
        <div className="shrink-0"><LangToggle /></div>
      </div>
      <div className="mt-6 grid gap-4 land:grid-cols-3">
        {CITIES.map((c) => (
          <CityCard key={c.id} city={c} savedHere={!!saved && (saved.city ?? 'bcn') === c.id} />
        ))}
      </div>
    </main>
  )
}
