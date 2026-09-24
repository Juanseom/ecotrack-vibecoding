# EcoTrack AI

**Cuéntanos tu día. Te devolvemos tu huella.**

EcoTrack AI es un MVP web para que los pequeños negocios estimen su huella de carbono escribiendo en lenguaje natural lo que consumieron:

> *"Hoy usamos 5 camionetas de reparto durante 8 horas y gastamos 200 kWh de luz."*

y reciban al instante un **recibo de carbono**: cuánto CO₂e emitieron (estimado), de dónde viene, cómo se calculó cada línea y qué pueden hacer.

- 🌐 **Demo en vivo:** https://ecotrack-vibecoding.vercel.app
- 📦 **Repositorio:** https://github.com/Juanseom/ecotrack-vibecoding
- 📓 **Bitácora de Vibe Coding:** [`docs/BITACORA.md`](docs/BITACORA.md) (resumen con capturas) · [`docs/vibe-log.md`](docs/vibe-log.md) (registro completo por iteración)

> **Nota sobre el modo de la demo:** el despliegue público funciona en **modo demo**. Un intérprete por reglas lee el texto y la interfaz lo indica ("Modo demo · interpretación simulada"). La integración con Claude está implementada y probada con dobles de prueba y con la API real en la ruta de error, pero **no** se ha ejecutado un análisis real exitoso porque no se configuró una API key (ver [`docs/ai-prompts.md`](docs/ai-prompts.md)). Para activarla basta con definir `ANTHROPIC_API_KEY`.

---

## Problema

Los dueños de pequeños negocios no tienen tiempo ni conocimientos para llenar formularios de huella de carbono ni para buscar factores de emisión. Hoy simplemente no lo miden.

## Solución

Un único campo de texto. El usuario describe su día con sus palabras y EcoTrack AI:

1. **Interpreta** el texto y lo convierte en consumos estructurados (IA o reglas).
2. **Valida** los datos: rangos sospechosos, datos no respaldados por el texto, ambigüedades. Si falta algo, hace **una** pregunta.
3. **Calcula** con un motor determinista: `cantidad × factor de emisión = kg CO₂e`.
4. **Explica** en lenguaje simple y propone 3 recomendaciones concretas.

> **Principio clave:** la IA interpreta y explica; el código calcula. Cada kg mostrado es trazable a un dato del usuario y a un factor declarado.

## Funcionalidades

- Entrada en lenguaje natural con ejemplos clicables y atajo Ctrl/⌘ + Enter.
- Pipeline visible en 4 etapas (Interpretar · Validar · Calcular · Explicar) transmitido en streaming.
- **Recibo de carbono**: por línea muestra la cita del usuario, la interpretación, los supuestos, el factor y la operación. Cada dato lleva una insignia de origen (`Tú lo dijiste` · `IA interpretó` / `Eco interpretó (reglas)` · `Supuesto` · `Factor referencial`).
- Consumos **no cuantificados**: se listan sin inventar cantidades (p. ej. "usamos las furgonetas" sin km).
- Desglose por categoría, equivalencias (km en auto, árboles-año), lectura de "Eco" y recomendaciones con impacto cualitativo (sin cifras de ahorro inventadas).
- Validación: descarta datos no respaldados, avisa de valores extremos, negativos o doble conteo.
- Historial local (últimos 10 análisis, sólo en el navegador).
- Sección "Cómo calculamos" con la tabla de factores referenciales y los supuestos.
- Manejo de errores: entrada vacía, texto sin datos, error de configuración de IA, error transitorio, sin conexión, con la opción "Probar en modo demo" cuando aplica.
- Responsive (probado a 375/390 px y 1440 px), foco visible, `aria-live`, `prefers-reduced-motion`.

Categorías soportadas: electricidad, diésel, gasolina, gas natural, GLP, camionetas de reparto, autos, motos, camiones y residuos.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Estilos | Tailwind CSS 4 · Fraunces, Geist, Geist Mono (`next/font`) |
| IA | Claude API (`@anthropic-ai/sdk`), modelo `claude-opus-5` por defecto, salidas estructuradas con Zod |
| Validación de datos | Zod 4 |
| Pruebas | Vitest (183 pruebas) · Playwright (capturas y pruebas de interfaz) |
| Despliegue | Vercel |
| Vibe Coding | Claude Code: agente principal + sub-agentes generadores guiados por prompts versionados |

## Arquitectura

```
Navegador (EcoTrackApp)
  └─ POST /api/analyze  ──►  Route Handler (Node.js, streaming NDJSON)
                               └─ runPipeline()
                                    1. interpreter.extract()     ← Claude (Prompt 1) | reglas (modo demo)
                                    2. ruleCheck() + review()    ← Claude (Prompt 2) | reglas
                                    3. calculate()               ← motor determinista + factores
                                    4. explain() ∥ recommend()   ← Claude (Prompts 3 y 4) | plantillas
  ◄── eventos {stage} … {result} | {error}
  └─ localStorage (historial)
```

Detalle y decisiones: [`docs/architecture.md`](docs/architecture.md).

```
src/
├── app/                  page.tsx, layout.tsx, globals.css, api/analyze/route.ts
├── components/           EcoTrackApp, Composer, PipelineProgress, ResultSummary, CarbonReceipt,
│                         Breakdown, ValidationNotice, Recommendations, History, Methodology, …
└── lib/
    ├── emissions/        factors.ts (tabla de factores), calculate.ts (motor puro)
    ├── interpreters/     types.ts (interfaz), claude.ts (4 llamadas a Claude), demo.ts (reglas)
    ├── ai/               prompts.ts (prompts de producto), schemas.ts, client.ts
    ├── validation/       rules.ts (reglas deterministas)
    ├── client/           run-analysis.ts (lector NDJSON), pipeline-state.ts, history.ts, …
    ├── pipeline.ts       orquestación de etapas
    └── schemas.ts, types.ts
```

## Integración de IA

Cuatro prompts de sistema, cada uno con una única tarea y una salida validada por esquema:

| # | Prompt | Qué hace |
|---|---|---|
| 1 | Extracción | Texto libre → `{ items[], ignored[] }` con cita literal, cantidad, unidad, nº de vehículos. Entiende "luz", "ACPM", "pipeta", "1.500,5", "cinco". |
| 2 | Validación | Audita la extracción contra el texto: detecta datos inventados (y los **descarta**), unidades dudosas, doble conteo; formula una pregunta. |
| 3 | Análisis | Explica el resultado en 2–4 frases con la voz de "Eco", usando sólo cifras ya calculadas. |
| 4 | Recomendaciones | 3 acciones concretas ligadas a los consumos, con impacto cualitativo. Prohibido inventar ahorros. |

Texto completo, estrategia y estado de verificación: [`docs/ai-prompts.md`](docs/ai-prompts.md).

## Cómo ejecutar

Requisitos: Node.js 20+ y npm.

```bash
git clone https://github.com/Juanseom/ecotrack-vibecoding.git
cd ecotrack-vibecoding
npm install
cp .env.example .env.local   # opcional: añade ANTHROPIC_API_KEY para usar Claude
npm run dev                  # http://localhost:3000
```

| Variable | Obligatoria | Descripción |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Sin ella la app funciona en modo demo (intérprete por reglas). |
| `ANTHROPIC_MODEL` | No | Por defecto `claude-opus-5`. |
| `ANTHROPIC_EFFORT` | No | `low` (defecto), `medium` o `high`. |

Otros comandos:

```bash
npm test          # 183 pruebas unitarias y de ruta (Vitest)
npm run lint
npm run build && npm start
node scripts/test-matrix.mjs --base http://127.0.0.1:3000   # matriz de pruebas contra un servidor
```

## Cómo usar

1. Escribe lo que consumió tu negocio (o toca un ejemplo): *"Esta semana la panadería gastó 45 m³ de gas natural y 320 kWh de electricidad."*
2. Pulsa **Calcular mi huella** y observa las 4 etapas.
3. Lee tu total y la frase de Eco; abre el recibo para ver cada cálculo.
4. Si Eco hace una pregunta, pulsa **Responder** y agrega el dato que faltaba.

## Calidad y pruebas

- 183 pruebas automatizadas (motor de cálculo, intérpretes, validación, pipeline, ruta, cliente NDJSON, estados de UI).
- Matriz de 19 casos (válido, incompleto, ambiguo, electricidad, transporte, múltiple, sin datos, negativos, extremos, números en palabras, formato latino, error de API, sin conexión, vacío, demasiado largo, cuerpo inválido, inyección, modo demo forzado): **19/19 en local**, **17/17 aplicables en producción**. Ver [`docs/testing.md`](docs/testing.md).

## Limitaciones

- Factores de emisión **referenciales y simplificados** (promedios aproximados tipo DEFRA/IEA); el factor eléctrico no es específico de cada país.
- Estimación, no medición ni auditoría. Sólo actividades directas comunes (sin alcance 3).
- La demo pública usa el intérprete por reglas; la IA real requiere configurar una API key.
- Historial sólo local, sin cuentas.

## Documentación del proceso

| Documento | Contenido |
|---|---|
| [`docs/BITACORA.md`](docs/BITACORA.md) | **Entregable**: resumen con prompts principales, capturas y explicación de la IA (también en PDF: [`docs/bitacora-ecotrack-ai.pdf`](docs/bitacora-ecotrack-ai.pdf)) |
| [`docs/01-analisis-taller.md`](docs/01-analisis-taller.md) | Análisis del taller y rúbrica en criterios verificables |
| [`docs/master-prompt.md`](docs/master-prompt.md) | Master Prompt (visión técnica y estética) |
| [`docs/prompts/`](docs/prompts/) | Los 7 prompts de iteración, tal como se ejecutaron |
| [`docs/vibe-log.md`](docs/vibe-log.md) | Bitácora completa por iteración |
| [`docs/architecture.md`](docs/architecture.md) | Arquitectura y decisiones |
| [`docs/ai-prompts.md`](docs/ai-prompts.md) | Prompts de IA del producto |
| [`docs/debugging.md`](docs/debugging.md) | Incidentes reales y cómo los resolvió la IA |
| [`docs/testing.md`](docs/testing.md) | Estrategia y resultados de pruebas |
| [`docs/demo-script.md`](docs/demo-script.md) | Guion del video (2 min) |
| [`docs/presentation.md`](docs/presentation.md) | Estructura de la presentación |
| [`docs/rubric-audit.md`](docs/rubric-audit.md) | Auditoría requisito → evidencia |
| [`docs/evidence/`](docs/evidence/) | Capturas reales y resultados crudos de pruebas |
