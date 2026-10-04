# BCN Tycoon

Juego de mesa de compraventa de barrios de Barcelona para 2–4 jugadores en el mismo dispositivo (hot-seat), con bots opcionales.

## Ejecutar en local

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev        # http://localhost:5173 (añade --host para abrirlo desde el móvil en la misma wifi)
npm test           # tests del motor de reglas (Vitest)
npm run build      # compila a dist/
npm run preview    # sirve dist/ para probar la versión de producción
```

## Desplegar en Vercel

Opción A, desde la web:
1. Sube el proyecto a un repositorio de GitHub.
2. En vercel.com → **Add New… → Project** → importa el repositorio.
3. Vercel detecta Vite solo (build `npm run build`, salida `dist`). Pulsa **Deploy**.

Opción B, desde la terminal:
```bash
npx vercel          # primera vez: enlaza el proyecto y crea un despliegue de prueba
npx vercel --prod   # despliegue a producción
```

No necesita variables de entorno ni backend: la partida se guarda en el `localStorage` del navegador.

## Estructura

```
src/engine/   Motor de reglas puro (sin React), testeable
  board.ts      ← Tablero editable: precios, alquileres, casas, hipotecas
  cards.ts      ← Mazos Sorpresa BCN y Festa Major (efectos)
  reducer.ts    (estado, acción) → nuevo estado
  validate.ts   Qué se puede hacer y por qué no (motivos para los tooltips)
  bot.ts        IA de los bots
src/i18n/     Todos los textos: es.ts (por defecto) y ca.ts
src/store/    Zustand: partida, animaciones, bots, guardado
src/ui/       Componentes de interfaz
tests/engine/ Tests de movimiento, alquileres, cárcel, construcción, bancarrota, cartas, subasta, intercambios y partidas completas bot contra bot
```

## Reglas implementadas

- Dos dados; dobles repiten, 3 dobles seguidos → atasco en la Ronda de Dalt (cárcel).
- Salir de la Ronda: pagar 50 €, sacar dobles (3 intentos; al tercer fallo pagas 50 € y sales) o carta.
- Propiedad libre: comprar o subasta entre todos (puja mínima 10 €).
- Grupo completo sin casas: alquiler doble. Construcción y venta uniformes; hotel tras 4 casas.
- Hipoteca a mitad de precio; deshipotecar cuesta +10 %.
- Intercambios de propiedades, dinero y cartas de salir (no se pueden intercambiar propiedades de grupos con edificios).
- Deudas: si no te llega, vendes/hipotecas o quiebras; tus bienes pasan al acreedor (o a la banca).
- Partida rápida por vueltas o por tiempo: gana el mayor patrimonio.
