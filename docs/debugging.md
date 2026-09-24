# Debugging con IA — EcoTrack AI

> Sólo se registran problemas **reales** que ocurrieron durante el desarrollo, con el mensaje de error literal. Ninguno fue provocado a propósito.

## Incidente #1 — Conflicto de dependencias al instalar Vitest (menor)

| Paso | Detalle |
|---|---|
| Problema | No se podía instalar el framework de pruebas. |
| Contexto | Iteración 1. El sub-agente generador acababa de crear el proyecto con `create-next-app` (Next 16) y ejecutó `npm install -D vitest` para cumplir la tarea 7 del prompt. |
| Error | `npm error code ERESOLVE` · `While resolving: vitest@5.0.1` · `Found: @types/node@20.19.43` · `Could not resolve dependency: peerOptional @types/node@"^22.0.0 \|\| >=24.0.0" from vitest@5.0.1` |
| Análisis (IA) | La plantilla de Next fija `@types/node@^20`, pero Vitest 5 (y Vite 8) declaran como *peer* opcional `@types/node` ≥ 22. npm 11 trata el conflicto como error. |
| Prompt utilizado | El error surgió dentro de la ejecución del prompt de iteración 1 (`docs/prompts/iter-01-estructura.md`), que exige `npm test` en verde; el agente generador lo diagnosticó por sí mismo, sin intervención manual. |
| Respuesta de la IA | Descartó `--legacy-peer-deps` (ocultaría el conflicto) y propuso alinear los tipos de Node con la versión que piden las herramientas. |
| Implementación | `@types/node` → `^24` en `package.json`, reinstalación. |
| Prueba | `npm test` → `Test Files 1 passed (1) · Tests 1 passed (1)`; `npm run build` y `npm run lint` sin errores (re-ejecutados por el agente principal). |
| Resultado | Resuelto sin escribir código a mano. |

---

## Incidente #2 — Un consumo negativo se calculaba como positivo, sin aviso (principal)

| Paso | Detalle |
|---|---|
| **Problema** | El dato del usuario se alteraba en silencio: escribir *"-50 kWh"* producía un recibo de **+50 kWh = 22,5 kg CO₂e**, sin advertencia, y la cita "Tú lo dijiste" omitía el signo. Viola la regla central del producto: nunca cambiar ni inventar datos. |
| **Contexto** | Iteración 5 (QA). Caso T08a de la matriz de pruebas, ejecutado en modo demo contra `next start` en `127.0.0.1:3200`. Nadie lo había notado: los 125 tests unitarios pasaban. |
| **Error (salida real)** | `T08a · Valor negativo · "Consumimos -50 kWh de electricidad." · Esperado: sin kg negativos; aviso (warning) o unquantified · Real: 1 línea: Electricidad de la red: 50 kWh → 22,5 kg · issues 0W/0I · ❌ Falla`. Evento crudo: `{"quote":"50 kWh de electricidad","activityAmount":50,"kgCO2e":22.5}`, `validation.issues: []`. |
| **Análisis** | El agente principal clasificó F1 como crítico (integridad de datos) y lo separó de los defectos cosméticos. Sospecha inicial: el parser. Pero el requisito era más amplio: ¿qué pasa si **Claude** devuelve un negativo? Por eso el prompt pidió revisar también el motor y las reglas "contra negativos venidos de cualquier intérprete". |
| **Prompt utilizado** | [`docs/prompts/iter-06-debugging.md`](prompts/iter-06-debugging.md), fase 1 (diagnóstico sin tocar código, con reproducción y causa raíz en archivo:línea) y fase 2 (corrección + prueba de regresión que falle antes y pase después). |
| **Respuesta de la IA (diagnóstico)** | Documento completo: [`docs/evidence/debug-diagnostico-iter06.md`](evidence/debug-diagnostico-iter06.md). Causa raíz 1: en `demo.ts:43` la expresión `NUMBER` no admite signo y el límite `(?<![\p{L}\d])` (`demo.ts:17`) acepta empezar justo después del guion → el match es `50 kWh`; el dato llega **ya positivo** al motor, así que ninguna defensa posterior puede detectarlo. Causa raíz 2 (**un segundo defecto que nadie había reportado**): `calculate.ts:219-222` convertía un `vehicle_count` ≤ 0 en `null` y calculaba la línea **como un solo vehículo** (`-5 camionetas, 40 km → 10 kg`). Causa 3: el prompt de extracción de Claude no decía qué hacer con signos negativos (un modelo podría "corregirlos"). La IA reprodujo el fallo con un test que falló: `AssertionError: expected 50 to be -50`. |
| **Implementación** | Hecha por la IA, sin código manual: (a) el parser demo conserva `-`/`−` pegado al número en cantidad, número de vehículos y cita (sin confundir rangos "8-10 horas" ni guiones con espacio); (b) el motor envía a "No cuantificado" cualquier cantidad negativa con la razón *"Escribiste -50 kWh: un consumo no puede ser negativo, así que no lo calculamos. Revisa la cifra."* y cualquier `vehicle_count` ≤ 0; (c) pregunta de aclaración *"¿Cuánta electricidad usaron en realidad?…"*; (d) prompt de extracción v1.1: *"Si el texto trae una cantidad con signo negativo, cópiala con su signo… no la corrijas… el sistema la marcará para revisión."* |
| **Prueba** | Pruebas de regresión escritas antes de la corrección: contra el código sin corregir **26 fallaban** (todas las regresiones de la iteración); tras la corrección **180/180 pasan**. Matriz: T08a pasa (0 líneas, "No cuantificado", 1 warning, pregunta). Re-verificado por el agente principal: `npm run build`, `lint` y `test` en verde. |
| **Resultado** | Resuelto. Captura "después": `docs/evidence/screenshots/06-f1-negativo.png` (antes: `docs/evidence/test-matrix-results.json` de la iteración 5, commit `55e4fe4`). |

## Incidente #3 — La interfaz contradecía el desenlace real (UI-1, UI-2, UI-3)

| Paso | Detalle |
|---|---|
| Problema | (UI-1) Con "sin datos" el pipeline decía *"Listo. Aquí tienes tu recibo."* sobre un error. (UI-2) Con clave inválida: *"Suele ser algo pasajero. Inténtalo de nuevo"* + detalle *"La clave de la IA no es válida"*. (UI-3) Sin red se ofrecía "Probar en modo demo", que también necesita red. |
| Contexto | Iteración 5, capturas `05-t07-sin-datos.png`, `05-t09-error-ia.png`, `05-t10-sin-conexion.png`. |
| Análisis de la IA | `PipelineProgress.tsx:37,49-53` deducía "Listo" sólo de las etapas, sin conocer el desenlace. `translateError` ya distinguía errores de configuración y transitorios, pero la información se perdía en `pipeline.ts:115`. `ErrorState.tsx:40` incluía `network` en el respaldo demo. |
| Prompt | [`docs/prompts/iter-06-debugging.md`](prompts/iter-06-debugging.md) (UI-1, UI-2, UI-3). |
| Implementación (IA) | Reductor puro `src/lib/client/pipeline-state.ts` que conoce el desenlace; campo opcional `retryable` en el evento de error (contrato compatible); `src/lib/client/error-presentation.ts` decide acciones: configuración → "Probar en modo demo" sin "reintentar"; red → sólo "Intentar de nuevo". |
| Prueba | Tests nuevos `pipeline-state.test.ts`, `error-presentation.test.ts`; T10 ahora muestra sólo "Intentar de nuevo". Capturas `06-ui1-sin-datos.png`, `06-ui2-clave-invalida.png`, `06-ui3-sin-conexion.png`. |
| Resultado | Resuelto. |

## Incidente #4 — Se atribuía a la IA el trabajo del parser por reglas (H1, honestidad)

| Paso | Detalle |
|---|---|
| Problema | En modo demo el recibo decía "IA interpretó" y el pipeline "La IA lee tu texto". |
| Contexto | Lo detectó el agente principal revisando la captura `03-flujo-demo-no-cuantificable.png` (iteración 3). |
| Implementación (IA) | El primer evento del stream lleva `mode` (campo opcional); `src/lib/data-origin.ts` decide la etiqueta: demo → "Eco interpretó (reglas)" / "Eco lee tu texto (reglas)"; IA → "IA interpretó". |
| Prueba | `data-origin.test.ts`; captura `06-h1-recibo-demo.png`. |
| Resultado | Resuelto. Pendiente menor: `HowItWorks` dice "La IA entiende tu texto" antes de conocer el modo (→ iteración 7). |

## Otros ajustes menores de la iteración 6
- F2: `{}` / `{"text":5}` → `bad_request` (antes `empty_input`). Un test existente codificaba el error; la IA cambió su expectativa con un comentario en vez de borrarlo.
- UI-4: preguntas del demo con concordancia de género ("¿Cuánta electricidad…", "¿Cuánto gas propano (GLP)…").
- UI-5: el aviso de "número sin unidad" sólo aparece si la cláusula contiene un verbo de consumo.
