# Prompt · Iteración 3 — Flujo principal (motor de cálculo + API + modo demo)

> Escrito por el agente principal el 2026-09-24. Entregado por referencia a un sub-agente generador de código (Claude Code, contexto limpio).

---

Estás trabajando en `/Users/juanseom/UNIVERSIDAD/SWNT/ecotrack-vibecoding` (Next.js 16, React 19, Tailwind 4, TypeScript, Vitest). **Lee primero `docs/master-prompt.md`** (sobre todo §5 factores, §6 flujo, §9 reglas) y `AGENTS.md` (Next 16 difiere de tu entrenamiento: para Route Handlers y streaming consulta `node_modules/next/dist/docs/`). Revisa `src/lib/types.ts` (contrato que la UI ya consume — **no lo cambies** salvo que sea imprescindible, y si lo haces explica por qué), `src/lib/client/run-analysis.ts` y `src/components/EcoTrackApp.tsx`.

## Objetivo
Que la app funcione de extremo a extremo con cualquier texto: `texto → interpretación → validación → cálculo → explicación → recibo`, en **modo demo** (sin IA todavía). La arquitectura debe dejar un "hueco" para que en la iteración 4 un intérprete con Claude reemplace al intérprete demo sin tocar la UI ni el motor de cálculo.

## 1. Esquema de extracción — `src/lib/schemas.ts` (Zod)
Es el formato que producirá la IA en la iteración 4, así que mantenlo simple (sin refinamientos exóticos: objetos, enums, strings, números, booleanos y `nullable`).
```ts
activity: enum ["electricity_grid","diesel","gasoline","natural_gas","lpg",
                "vehicle_delivery_van","vehicle_car","vehicle_motorcycle","vehicle_truck",
                "waste_landfill","other"]
ExtractedItem = {
  activity,
  label: string,                 // etiqueta corta en español: "Camionetas de reparto"
  quantity: number | null,       // cantidad principal tal como la dijo el usuario
  unit: enum ["kWh","MWh","L","gal","m3","kg","lb","t","km","mi","h"] | null,
  vehicle_count: number | null,  // sólo vehículos
  per_vehicle: boolean | null,   // true si la cantidad es por vehículo ("5 camionetas durante 8 horas" → true)
  source_quote: string,          // fragmento LITERAL del texto del usuario
  notes: string | null
}
Extraction = { items: ExtractedItem[], ignored: { quote: string, reason: string }[] }
```
Además un esquema `AnalyzeRequest = { text: string (trim, 1..1000), mode?: "auto" | "demo" }`.

## 2. Motor de cálculo — `src/lib/emissions/`
- `factors.ts`: la tabla de factores del Master Prompt §5 como `EmissionFactor` (id, label, value, unit, source "Referencial · …"), más constantes `URBAN_SPEED_KMH = 20`, `LPG_KG_PER_L = 0.51`, `CAR_KG_PER_KM = 0.17`, `TREE_KG_PER_YEAR = 21`.
- `calculate.ts`: función **pura** `calculate(items: ExtractedItem[]) → { lines: ReceiptLine[]; unquantified: UnquantifiedItem[]; totalKg; byCategory; equivalences }`.
  - Conversión de unidades: MWh→kWh, gal→L (3.785), lb→kg (0.4536), t→kg, mi→km (1.609), GLP en L→kg (0.51).
  - Vehículos: con `km` → km × vehicle_count si `per_vehicle` (o si es null y hay >1 vehículo, asume por vehículo y decláralo como supuesto); con `h` → h × 20 km/h (supuesto declarado); sin cantidad → `unquantified` con razón "Faltan horas o km"; nunca inventes distancia.
  - `other`, unidades incompatibles con la actividad, cantidades ≤ 0 o null → `unquantified` con razón clara en español.
  - Cada línea rellena `interpreted`, `steps` (texto legible de cada operación con formato `es-CO`), `assumptions`, `factor`, `kgCO2e` (redondeo a 0.1 sólo al mostrar; guarda precisión).
  - `byCategory` ordenado de mayor a menor, `share` 0..1; equivalencias `carKm = total / 0.17`, `treeYears = total / 21`.
- `calculate.test.ts`: pruebas para cada actividad, conversiones, horas→km, per_vehicle true/false/null, cantidad faltante, `other`, total y shares, y el caso del Master Prompt §11 (total 290 kg).

## 3. Validación determinista — `src/lib/validation/rules.ts`
`ruleCheck(items, text) → ValidationIssue[]`: rangos sospechosos para un pequeño negocio en un día/periodo (p. ej. electricidad > 20.000 kWh, > 24 h de uso por vehículo, > 200 vehículos, > 5.000 L de combustible, > 10.000 km por vehículo), `source_quote` que no aparece en el texto (comparación normalizada sin tildes/mayúsculas), y valores negativos. Mensajes en español, tono de Eco. Con pruebas.

## 4. Intérprete intercambiable — `src/lib/interpreters/`
```ts
interface Interpreter {
  mode: "ai" | "demo";
  model?: string;
  extract(text: string): Promise<Extraction>;
  review(text: string, extraction: Extraction): Promise<{ issues: ValidationIssue[]; clarifyingQuestion: string | null }>;
  explain(ctx: ExplainContext): Promise<AnalysisResult["analysis"]>;
  recommend(ctx: ExplainContext): Promise<Recommendation[]>;
}
```
(`ExplainContext` = texto, líneas, no cuantificados, total, byCategory, issues.)
- `demo.ts`: **intérprete por reglas** en español (expresiones regulares + diccionario de sinónimos: "luz/electricidad/energía", "camionetas/furgonetas/vans", "motos", "carros/autos", "camión", "diésel/ACPM", "gasolina", "gas natural", "gas propano/GLP/pipeta", "basura/residuos/desechos"), números en cifras y en palabras básicas ("dos", "cinco", "diez"), unidades con y sin espacio ("200kWh", "45 m³", "60 litros"). Debe interpretar bien los 4 chips de ejemplo de la UI y el caso del enunciado. `review` devuelve preguntas simples basadas en lo que falta; `explain` y `recommend` usan plantillas según la categoría dominante (recomendaciones reales y concretas por categoría, impacto cualitativo, sin cifras de ahorro). Con pruebas para los 5 textos de ejemplo y para un texto sin datos ("hola, ¿cómo estás?").
- `index.ts`: `getInterpreter(mode)` → por ahora siempre demo. Deja un comentario `// Iteración 4: intérprete Claude` donde irá la selección por `ANTHROPIC_API_KEY`.

## 5. Orquestación — `src/lib/pipeline.ts`
`async function* runPipeline(text, interpreter): AsyncGenerator<StreamEvent>`:
1. `stage extract running` → `interpreter.extract` → `done` (detail: "Encontré N consumos").
2. `stage validate running` → `ruleCheck` + `interpreter.review` (combina issues) → `done`.
3. `stage calculate running` → `calculate` → `done`.
4. `stage explain running` → `explain` y `recommend` **en paralelo** (`Promise.all`) → `done`.
5. `result` con el `AnalysisResult` completo (`id` con `crypto.randomUUID()`, `createdAt`, `mode`, `model`).
- Si la extracción no encuentra ningún ítem (ni cuantificable ni no cuantificable) → `error` `no_data` con mensaje amable y sugerencia de qué escribir.
- Cualquier excepción → la etapa en curso pasa a `error` y se emite `error` `internal` (o `ai_error` si viene del intérprete) con mensaje humano. Nunca expongas trazas al cliente; registra en `console.error` en el servidor.

## 6. API — `src/app/api/analyze/route.ts`
`POST` con cuerpo `AnalyzeRequest`. Cuerpo inválido/vacío → HTTP 400 con un `StreamEvent` de error (`empty_input` o `bad_request`). Si es válido → HTTP 200 con `Content-Type: application/x-ndjson; charset=utf-8`, `Cache-Control: no-store`, y un `ReadableStream` que escribe cada evento de `runPipeline` como una línea JSON. Runtime Node.js. Sin caché.

## 7. Cliente — `src/lib/client/run-analysis.ts`
Reemplaza la simulación: `fetch('/api/analyze', { method: 'POST', body: JSON.stringify({ text, mode }), signal })`, lee el cuerpo con `getReader()` + `TextDecoder`, separa por `\n` (con búfer para líneas partidas) y llama `onEvent` por cada evento. Fallo de red (`TypeError` de fetch) → `onEvent({type:'error', code:'network', message: 'No pudimos conectar…'})`. Respuesta no-OK con cuerpo JSON → reenvía ese evento. Cancelación con `AbortSignal` silenciosa. Actualiza sus pruebas (mockeando `fetch`).

## 8. UI
- Quita del `ModeBadge` la frase sobre "resultado de ejemplo" y explica el modo demo real: "Sin clave de IA configurada: un intérprete por reglas lee tu texto. Los cálculos son los mismos."
- `ErrorState`: para `ai_error`/`network` ofrece además "Probar en modo demo" (reenvía con `mode: "demo"`).
- El fixture queda sólo para pruebas/historias; la UI ya no lo importa.

## Criterios de aceptación
- `npm run build`, `npm run lint`, `npm test` sin errores.
- Con `npm run dev`, cada chip de ejemplo produce un recibo coherente con su texto (no con el fixture). Compruébalo llamando a la API con `curl -N -X POST localhost:3000/api/analyze -H 'content-type: application/json' -d '{"text":"..."}'` para los 5 textos y pega la última línea (`result`) resumida (líneas y total) de cada uno en tu respuesta.
- Texto vacío → 400 `empty_input`; "hola, ¿cómo estás?" → `no_data`.

## Al terminar
Responde con: archivos creados/modificados, resultados de `curl` de los casos anteriores, salida resumida de build/lint/test, y cualquier problema que encontraste (con el error literal) y cómo lo resolviste. No hagas commits.
