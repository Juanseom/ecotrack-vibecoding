# Prompt · Iteración 2 — Construcción de la interfaz

> Escrito por el agente principal el 2026-09-24. Entregado literalmente a un sub-agente generador de código (Claude Code, contexto limpio).

---

Estás trabajando en el repositorio `/Users/juanseom/UNIVERSIDAD/SWNT/ecotrack-vibecoding` (Next.js 16 + React 19 + Tailwind 4 + TypeScript). **Lee primero `docs/master-prompt.md`** (producto, vibe, reglas) y `AGENTS.md` (Next 16 tiene cambios respecto a lo que conoces: consulta `node_modules/next/dist/docs/` si dudas de una API). Revisa `src/app/page.tsx`, `src/app/layout.tsx` y `src/app/globals.css`: ya existen los tokens de color, las fuentes y la portada; constrúyelo encima, no lo reemplaces.

## Objetivo
Construir **toda la interfaz** del flujo principal, alimentada por un resultado de ejemplo fijo (fixture). Todavía **no** hay backend ni IA: el envío simula las 4 etapas con temporizadores y muestra el fixture. En la siguiente iteración se conectará la API real, así que respeta exactamente el contrato de tipos de abajo.

## 1. Contrato de datos — crea `src/lib/types.ts` exactamente con estos tipos
```ts
export type Category = "electricity" | "fuel" | "vehicle" | "heating_gas" | "waste";
export type StageId = "extract" | "validate" | "calculate" | "explain";
export type StageStatus = "pending" | "running" | "done" | "skipped" | "error";

export interface EmissionFactor {
  id: string;            // p. ej. "electricity_grid"
  label: string;         // "Red eléctrica (promedio global aprox.)"
  value: number;         // 0.45
  unit: string;          // "kg CO₂e/kWh"
  source: string;        // "Referencial · IEA (aprox.)"
}

export interface ReceiptLine {
  id: string;
  category: Category;
  label: string;                 // "Camionetas de reparto (diésel)"
  quote: string;                 // cita literal del texto del usuario
  interpreted: string;           // "5 camionetas × 8 h"
  steps: string[];               // ["8 h × 20 km/h = 160 km por camioneta", "160 km × 5 = 800 km"]
  activityAmount: number;        // 800
  activityUnit: string;          // "km"
  factor: EmissionFactor;
  kgCO2e: number;                // 200
  assumptions: string[];         // ["Velocidad urbana promedio de 20 km/h"]
}

export interface UnquantifiedItem { label: string; quote: string; reason: string; }

export interface ValidationIssue { severity: "info" | "warning"; message: string; lineId?: string; }

export interface Recommendation {
  title: string;
  detail: string;
  category: Category;
  impact: "alto" | "medio" | "bajo";
  effort: "fácil" | "media" | "difícil";
}

export interface AnalysisResult {
  id: string;
  createdAt: string;             // ISO
  input: string;
  mode: "ai" | "demo";
  model?: string;
  lines: ReceiptLine[];
  unquantified: UnquantifiedItem[];
  totalKg: number;
  byCategory: { category: Category; kg: number; share: number }[]; // share 0..1
  equivalences: { carKm: number; treeYears: number };
  validation: { status: "ok" | "warnings"; issues: ValidationIssue[]; clarifyingQuestion: string | null };
  analysis: { headline: string; summary: string };
  recommendations: Recommendation[];
}

export type StreamEvent =
  | { type: "stage"; stage: StageId; status: StageStatus; detail?: string }
  | { type: "result"; data: AnalysisResult }
  | { type: "error"; code: "empty_input" | "no_data" | "ai_error" | "bad_request" | "network" | "internal"; message: string };
```

## 2. Fixture — `src/lib/fixtures/sample-result.ts`
Un `AnalysisResult` coherente con el ejemplo del Master Prompt (§11): entrada *"Hoy usamos 5 camionetas de reparto durante 8 horas y gastamos 200 kWh de luz."*, dos líneas (electricidad 200 kWh × 0.45 = 90 kg; camionetas 800 km × 0.25 = 200 kg), total 290 kg, `byCategory` con shares correctos, equivalencias (290/0.17 ≈ 1706 km; 290/21 ≈ 13.8 árboles-año), una `ValidationIssue` de tipo info sobre el supuesto de velocidad, `clarifyingQuestion` preguntando si conocen los km reales, un análisis y 3 recomendaciones. `mode: "demo"`.

## 3. Componentes (en `src/components/`, client components sólo donde haga falta)
1. **`Composer`** — la hoja de cuaderno de la portada pasa a ser un `<textarea>` real (con `<label>` accesible), placeholder con el ejemplo, contador de caracteres (máx. 1000), botón primario "Calcular mi huella" (moss), atajo Ctrl/⌘+Enter indicado visualmente, y 4 **chips de ejemplo** que rellenan el texto:
   - "Hoy usamos 5 camionetas de reparto durante 8 horas y gastamos 200 kWh de luz."
   - "Esta semana la panadería gastó 45 m³ de gas natural y 320 kWh de electricidad."
   - "Cargamos 60 litros de diésel en el camión y botamos unos 25 kg de basura."
   - "Dos motos hicieron 120 km cada una y el local consumió 80 kWh."
   Deshabilitado mientras se procesa. Si el texto está vacío, muestra un mensaje inline amable en vez de enviar.
2. **`PipelineProgress`** — 4 etapas horizontales (verticales en móvil): *Interpretar · Validar · Calcular · Explicar*, con subtítulo corto (p. ej. "La IA lee tu texto"), estados pending/running/done/skipped/error. La etapa activa usa el acento `signal` con una animación sutil (respetando `prefers-reduced-motion`). `aria-live="polite"`.
3. **`CarbonReceipt`** — la pieza central de identidad: un **recibo de papel** (fondo blanco cálido, `font-mono`, bordes superior e inferior dentados/perforados en CSS, separadores punteados). Encabezado "RECIBO DE CARBONO", fecha/hora, nº corto. Por cada línea: etiqueta, cita del usuario entre comillas, interpretación, pasos del cálculo, `cantidad × factor = kg CO₂e` alineado a la derecha, supuestos. **Insignias de origen del dato**: `Tú lo dijiste` (cita), `IA interpretó` (interpretación), `Supuesto` (assumptions), `Factor referencial` (factor). Total grande en Fraunces, sello "ESTIMACIÓN". Sección "No cuantificado" si hay `unquantified`.
4. **`Breakdown`** — barra horizontal apilada por categoría con leyenda y % (colores derivados de la paleta; cada categoría con color e ícono SVG simple), más las 2 equivalencias ("≈ 1.706 km en auto", "≈ 13,8 árboles absorbiendo durante un año"). Formato numérico `es-CO`.
5. **`AnalysisCard`** — headline en Fraunces + resumen. Encabezado discreto "Lectura de Eco".
6. **`ValidationNotice`** — issues (info/warning con `clay` para warning) y la pregunta de aclaración destacada, con un botón "Responder" que enfoca el composer y añade la pregunta como contexto (sólo foco + texto sugerido; no hay chat todavía).
7. **`Recommendations`** — 3 recomendaciones sobrias, numeradas, con impacto y dificultad como etiquetas. Nada de íconos genéricos de bombilla gigantes.
8. **`ModeBadge`** — "IA · Claude" o "Modo demo · interpretación simulada" (con tooltip/explicación).
9. **`History`** — "Tus días anteriores": lista compacta de análisis previos (fecha, primeras palabras, total kg), guardada en `localStorage` (clave `ecotrack:history`, máx. 10, try/catch). Clic para reabrir. Botón para borrar historial.
10. **`ErrorState`** — mensaje humano + botón "Intentar de nuevo" (se usará con los códigos de `StreamEvent.error`).

## 4. Página
`src/app/page.tsx` orquesta el estado (un client component `EcoTrackApp` está bien): idle → processing (progreso) → result | error. Para esta iteración, al enviar, simula las etapas con `setTimeout` (~600 ms c/u) y muestra el fixture. Deja **un único punto** (`runAnalysis(text, onEvent)` en `src/lib/client/run-analysis.ts`) que hoy simula y que en la siguiente iteración hará `fetch` a `/api/analyze` y leerá NDJSON — así el cambio será local.

Layout del resultado: en escritorio, dos columnas (recibo a la izquierda ~ 440 px como un ticket real; a la derecha lectura de Eco, desglose, validación, recomendaciones). En móvil, una columna. Al llegar el resultado, desplaza la vista suavemente hacia él. Estado vacío (antes del primer análisis): una breve sección "Cómo funciona" en 3 pasos, sobria, con el mismo estilo de cuaderno.

## 5. Calidad
- Todo el texto en español. Contraste AA. Foco visible. Funciona a 375 px sin scroll horizontal.
- Sin librerías de UI ni de íconos nuevas (SVG inline propios).
- `npm run build`, `npm run lint` y `npm test` sin errores.

## Al terminar
Responde con: archivos creados/modificados, decisiones de diseño que tomaste, salida resumida de build/lint/test, y cualquier problema encontrado (con el error literal) y cómo lo resolviste. No hagas commits.
