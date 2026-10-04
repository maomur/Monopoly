// Efectos de sonido sintetizados con Web Audio: sin archivos, pesan 0 KB.
// Cada sonido se construye con osciladores y ruido filtrado.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let muted = false

export function setMuted(m: boolean) {
  muted = m
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 4
    master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(comp)
    comp.connect(ctx.destination)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return ctx
}

// Los navegadores solo dejan sonar audio tras un gesto del usuario
if (typeof window !== 'undefined') {
  const unlock = () => {
    const c = audio()
    if (c && c.state === 'suspended') void c.resume()
  }
  window.addEventListener('pointerdown', unlock, { passive: true })
  window.addEventListener('keydown', unlock)
}

function ready(): AudioContext | null {
  if (muted) return null
  const c = audio()
  if (!c || c.state !== 'running' || !master) return null
  return c
}

/** Tono con envolvente y deslizamiento de frecuencia opcional */
function tone(
  c: AudioContext,
  { f, to, t = 0, dur, vol = 0.2, type = 'sine', attack = 0.005 }: {
    f: number; to?: number; t?: number; dur: number; vol?: number; type?: OscillatorType; attack?: number
  },
) {
  const start = c.currentTime + t
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, start)
  if (to) o.frequency.exponentialRampToValueAtTime(to, start + dur)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(vol, start + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.connect(g).connect(master!)
  o.start(start)
  o.stop(start + dur + 0.02)
}

/** Ruido filtrado (clics, golpes, papel, aire) */
function noise(
  c: AudioContext,
  { t = 0, dur, vol = 0.2, filter = 'bandpass', f = 1500, to, q = 1 }: {
    t?: number; dur: number; vol?: number; filter?: BiquadFilterType; f?: number; to?: number; q?: number
  },
) {
  const start = c.currentTime + t
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const bq = c.createBiquadFilter()
  bq.type = filter
  bq.frequency.setValueAtTime(f, start)
  if (to) bq.frequency.exponentialRampToValueAtTime(to, start + dur)
  bq.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(vol, start)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  src.connect(bq).connect(g).connect(master!)
  src.start(start, Math.random() * 0.5)
  src.stop(start + dur + 0.02)
}

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12) // MIDI → Hz

let stepCount = 0

export const sfx = {
  /** Cada casilla: golpecito de madera, alternando tono */
  step() {
    const c = ready(); if (!c) return
    stepCount++
    const base = stepCount % 2 ? 560 : 470
    tone(c, { f: base, to: base * 0.7, dur: 0.07, vol: 0.16, type: 'triangle' })
    noise(c, { dur: 0.025, vol: 0.06, f: 2600, q: 2 })
  },

  /** Dados: traqueteo en el cubilete y dos golpes al caer */
  dice() {
    const c = ready(); if (!c) return
    for (let i = 0; i < 9; i++) {
      const t = i * 0.075 + Math.random() * 0.03
      noise(c, { t, dur: 0.035, vol: 0.12 + Math.random() * 0.06, f: 2400 + Math.random() * 1800, q: 4 })
      tone(c, { t, f: 900 + Math.random() * 500, dur: 0.03, vol: 0.04, type: 'square' })
    }
    for (const t of [0.78, 0.9]) {
      noise(c, { t, dur: 0.06, vol: 0.22, f: 1800, q: 1.5 })
      tone(c, { t, f: 260, to: 150, dur: 0.08, vol: 0.18, type: 'triangle' })
    }
  },

  /** La ficha se posa en la casilla */
  land() {
    const c = ready(); if (!c) return
    tone(c, { f: 170, to: 70, dur: 0.16, vol: 0.32 })
    noise(c, { dur: 0.09, vol: 0.12, filter: 'lowpass', f: 500 })
    tone(c, { t: 0.05, f: 1320, dur: 0.18, vol: 0.05, type: 'sine' })
  },

  /** Se abre una ventana: soplido ascendente */
  whoosh() {
    const c = ready(); if (!c) return
    noise(c, { dur: 0.28, vol: 0.09, f: 350, to: 2600, q: 0.8 })
  },

  /** Cobras: monedas que suben */
  coinIn() {
    const c = ready(); if (!c) return
    ;[88, 93, 96, 100].forEach((n, i) => {
      tone(c, { t: i * 0.065, f: NOTE(n), dur: 0.16, vol: 0.11, type: 'triangle' })
      tone(c, { t: i * 0.065, f: NOTE(n + 12), dur: 0.08, vol: 0.03, type: 'sine' })
    })
  },

  /** Pagas: monedas que caen, más grave */
  coinOut() {
    const c = ready(); if (!c) return
    ;[84, 79, 75, 72].forEach((n, i) => {
      tone(c, { t: i * 0.07, f: NOTE(n), dur: 0.14, vol: 0.1, type: 'triangle' })
    })
    noise(c, { t: 0.28, dur: 0.08, vol: 0.05, f: 4000, q: 3 })
  },

  /** Compra: caja registradora */
  buy() {
    const c = ready(); if (!c) return
    noise(c, { dur: 0.12, vol: 0.12, f: 3000, to: 1500, q: 2 })
    tone(c, { t: 0.1, f: NOTE(96), dur: 0.7, vol: 0.12 })
    tone(c, { t: 0.1, f: NOTE(100), dur: 0.7, vol: 0.09 })
    tone(c, { t: 0.1, f: NOTE(103), dur: 0.6, vol: 0.06 })
  },

  /** Carta: papel que se gira y campanita */
  card() {
    const c = ready(); if (!c) return
    noise(c, { dur: 0.05, vol: 0.12, filter: 'highpass', f: 3000 })
    noise(c, { t: 0.07, dur: 0.05, vol: 0.1, filter: 'highpass', f: 3500 })
    tone(c, { t: 0.15, f: NOTE(81), dur: 0.35, vol: 0.08 })
    tone(c, { t: 0.22, f: NOTE(88), dur: 0.4, vol: 0.07 })
  },

  /** A la Ronda: sirena que baja y portazo metálico */
  jail() {
    const c = ready(); if (!c) return
    tone(c, { f: 740, to: 520, dur: 0.28, vol: 0.12, type: 'sawtooth' })
    tone(c, { t: 0.3, f: 620, to: 400, dur: 0.32, vol: 0.12, type: 'sawtooth' })
    tone(c, { t: 0.66, f: 110, to: 70, dur: 0.25, vol: 0.25, type: 'square' })
    noise(c, { t: 0.66, dur: 0.3, vol: 0.18, f: 2800, q: 6 })
  },

  /** Construir: martillazos (hotel: uno más y campana) */
  build(hotel = false) {
    const c = ready(); if (!c) return
    const n = hotel ? 3 : 2
    for (let i = 0; i < n; i++) {
      noise(c, { t: i * 0.13, dur: 0.05, vol: 0.18, f: 1300, q: 3 })
      tone(c, { t: i * 0.13, f: 240, to: 120, dur: 0.07, vol: 0.18, type: 'triangle' })
    }
    if (hotel) tone(c, { t: 0.42, f: NOTE(91), dur: 0.6, vol: 0.09 })
  },

  /** Hipotecar: sello; deshipotecar: golpe ascendente */
  mortgage(on: boolean) {
    const c = ready(); if (!c) return
    if (on) {
      tone(c, { f: 140, to: 60, dur: 0.2, vol: 0.3 })
      noise(c, { dur: 0.1, vol: 0.12, filter: 'lowpass', f: 900 })
    } else {
      tone(c, { f: 300, to: 600, dur: 0.15, vol: 0.12, type: 'triangle' })
    }
  },

  /** Puja: toque de mazo */
  bid() {
    const c = ready(); if (!c) return
    tone(c, { f: 950, to: 600, dur: 0.06, vol: 0.18, type: 'triangle' })
    noise(c, { dur: 0.03, vol: 0.1, f: 2000, q: 3 })
  },

  /** Fin de subasta: dos golpes de mazo */
  gavel(sold: boolean) {
    const c = ready(); if (!c) return
    const hits = sold ? [0, 0.18] : [0]
    for (const t of hits) {
      tone(c, { t, f: 700, to: 380, dur: 0.1, vol: 0.28, type: 'triangle' })
      noise(c, { t, dur: 0.05, vol: 0.16, f: 1600, q: 2 })
    }
  },

  /** Trato cerrado: dos notas que suben y acorde */
  deal() {
    const c = ready(); if (!c) return
    tone(c, { f: NOTE(76), dur: 0.15, vol: 0.13, type: 'triangle' })
    tone(c, { t: 0.13, f: NOTE(80), dur: 0.15, vol: 0.13, type: 'triangle' })
    ;[83, 88, 92].forEach((n) => tone(c, { t: 0.27, f: NOTE(n), dur: 0.5, vol: 0.07 }))
  },

  /** Trato rechazado: dos notas que bajan */
  noDeal() {
    const c = ready(); if (!c) return
    tone(c, { f: NOTE(67), dur: 0.16, vol: 0.12, type: 'triangle' })
    tone(c, { t: 0.15, f: NOTE(63), dur: 0.28, vol: 0.12, type: 'triangle' })
  },

  /** Grupo completo: arpegio de fiesta */
  fanfare() {
    const c = ready(); if (!c) return
    ;[72, 76, 79, 84].forEach((n, i) => {
      tone(c, { t: i * 0.09, f: NOTE(n), dur: 0.22, vol: 0.13, type: 'triangle' })
      tone(c, { t: i * 0.09, f: NOTE(n - 12), dur: 0.2, vol: 0.05, type: 'square' })
    })
    ;[84, 88, 91].forEach((n) => tone(c, { t: 0.38, f: NOTE(n), dur: 0.7, vol: 0.07 }))
  },

  /** Bancarrota: trombón triste */
  bankrupt() {
    const c = ready(); if (!c) return
    const notes = [67, 66, 65]
    notes.forEach((n, i) => tone(c, { t: i * 0.38, f: NOTE(n), dur: 0.34, vol: 0.14, type: 'sawtooth', attack: 0.03 }))
    tone(c, { t: 1.14, f: NOTE(64), to: NOTE(59), dur: 1.1, vol: 0.14, type: 'sawtooth', attack: 0.03 })
  },

  /** Victoria */
  victory() {
    const c = ready(); if (!c) return
    const seq: [number, number, number][] = [[72, 0, 0.14], [72, 0.15, 0.14], [72, 0.3, 0.14], [76, 0.45, 0.4], [74, 0.9, 0.14], [76, 1.05, 0.14], [79, 1.2, 0.8]]
    for (const [n, t, d] of seq) {
      tone(c, { t, f: NOTE(n), dur: d, vol: 0.14, type: 'triangle' })
      tone(c, { t, f: NOTE(n - 12), dur: d, vol: 0.05, type: 'square' })
    }
    ;[79, 84, 88].forEach((n) => tone(c, { t: 1.2, f: NOTE(n), dur: 1.2, vol: 0.06 }))
  },

  /** Botón no disponible */
  deny() {
    const c = ready(); if (!c) return
    tone(c, { f: 150, dur: 0.1, vol: 0.08, type: 'square' })
  },

  /** Prueba al activar el sonido */
  test() {
    sfx.coinIn()
  },
}
