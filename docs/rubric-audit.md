# Auditoría final: requisito → evidencia

> Iteración 8 · 2026-09-24. Cada fila se comprobó abriendo la evidencia citada. Estados: ✅ cumplido · ⚠️ cumplido con salvedad · ❌ no cumplido.

## Instrucciones del taller

| Requisito | Evidencia | Ubicación | Estado |
|---|---|---|---|
| I1. Definir personalidad y flujo ("el Vibe") | Personalidad de "Eco", paleta, tipografías, componentes, comportamiento; flujo de 4 etapas | `docs/master-prompt.md` §6–§7 | ✅ |
| I2. Master Prompt con visión técnica y estética | Master Prompt v1.0 (12 secciones) | `docs/master-prompt.md` | ✅ |
| I3. Herramienta de generación de código con IA para frontend y lógica | 7 prompts ejecutados por sub-agentes de Claude Code; 0 líneas de producto escritas a mano | `docs/prompts/`, `docs/vibe-log.md` entradas 1–7 | ✅ |
| I4. Al menos una funcionalidad impulsada por una API de IA (real o simulada) | `ClaudeInterpreter` con 4 prompts (real, implementado) + intérprete por reglas (simulado, activo en la demo) | `src/lib/interpreters/claude.ts`, `src/lib/ai/prompts.ts`, `docs/ai-prompts.md` | ⚠️ Implementada y probada con dobles de prueba y con la API real en la ruta de error (401); **sin análisis reales exitosos** porque no se configuró una API key. La demo usa la versión simulada, que el taller admite, y lo declara en la UI. |
| I5. Refinar la interfaz pidiendo cambios en lenguaje natural | Prompt de la iteración 7 en lenguaje natural + capturas antes/después | `docs/prompts/iter-07-refinamiento-visual.md`, `docs/evidence/screenshots/07-*` | ✅ |
| I6. Al menos un error real resuelto con IA sin escribir código manualmente | 4 incidentes reales; principal: negativo calculado como positivo (diagnóstico de la IA antes de corregir + 26 pruebas de regresión) | `docs/debugging.md`, `docs/evidence/debug-diagnostico-iter06.md` | ✅ |
| I7. Explicar cómo el Vibe Coding aceleró el desarrollo | Métricas medidas + comparación cualitativa (declarada como tal) | `docs/presentation.md` diapositiva 12, `docs/BITACORA.md` §7 | ✅ |
| I8. Interfaz tipo chat o formulario inteligente | Campo de texto libre con ejemplos, pipeline y pregunta de aclaración | App en vivo | ✅ |

## Entregables

| Entregable | Evidencia | Ubicación | Estado |
|---|---|---|---|
| E1. Repositorio o proyecto vivo | Repositorio público y despliegue verificado (HTTP 200, matriz 17/17 aplicables en producción) | https://github.com/Juanseom/ecotrack-vibecoding · https://ecotrack-vibecoding.vercel.app | ✅ |
| E2. Bitácora: prompts principales | Master Prompt, 7 prompts de iteración, 4 prompts de producto | `docs/BITACORA.md` §2, `docs/prompts/`, `docs/ai-prompts.md` | ✅ |
| E3. Bitácora: capturas del proceso de iteración | 30 capturas reales (Playwright) de las iteraciones 1–8 | `docs/evidence/screenshots/`, incluidas en `docs/BITACORA.md` §3 | ✅ |
| E4. Bitácora: explicación de la funcionalidad de IA | Flujo, prompts, decisiones de diseño, estado de verificación | `docs/BITACORA.md` §4, `docs/ai-prompts.md` | ✅ |
| Bitácora en PDF/Markdown | Markdown + PDF de 11 páginas | `docs/BITACORA.md`, `docs/bitacora-ecotrack-ai.pdf` | ✅ |
| E5. Video demo ≤ 2 min (opcional) | Guion completo por tramos de tiempo | `docs/demo-script.md` | ⚠️ Guion listo; **el video no está grabado** (lo graba el estudiante). |

## Rúbrica (criterios verificables de `docs/01-analisis-taller.md`)

| Criterio | Evidencia | Estado |
|---|---|---|
| A1. Funciona de extremo a extremo en local | Matriz 19/19 | ✅ |
| A2. Funciona en la URL desplegada | `docs/evidence/produccion/test-matrix-results.md` (17/17 aplicables), capturas `08-produccion-*` | ✅ |
| A3. Sin errores críticos (build, lint, typecheck) | `npm run build` ✓, `npm run lint` sin avisos, 183/183 pruebas | ✅ |
| A4. Estética con identidad propia, responsive, estados | Capturas 07/08; sin scroll horizontal a 375 px; estados de carga, error, vacío y total 0 | ✅ |
| A5. Prompts precisos guardados y ejecutados | `docs/prompts/` (7) | ✅ |
| A6. Iteración de UI en lenguaje natural con antes/después | `07-antes-*` → `07-despues-*` | ✅ |
| B1. IA real vía API integrada | Código + 27 pruebas simuladas + 401 real | ⚠️ Sin llamada real exitosa (no hay API key) |
| B2. Lenguaje natural → datos estructurados | Prompt 1 + esquema Zod; intérprete demo verificado con 19 casos | ✅ |
| B3. La IA no calcula | Ningún prompt pide kg; `calculate()` puro | ✅ |
| B4. 4 prompts (extracción, validación, análisis, recomendaciones) | `src/lib/ai/prompts.ts` v1.1 | ✅ |
| B5. Distinción de origen de los datos | Insignias `Tú lo dijiste` / `IA interpretó` · `Eco interpretó (reglas)` / `Supuesto` / `Factor referencial` | ✅ |
| B6. Manejo de errores de IA | T09 (401 real), `refusal`/formato/conexión en pruebas, `retryable` | ✅ |
| B7. Demostrable con los ejemplos del enunciado | T01 = 290 kg en local y en producción | ✅ |
| C1. Estrategia de prompts explicada | `docs/BITACORA.md` §1, `docs/ai-prompts.md` | ✅ |
| C2. Bitácora escrita durante el proceso | `docs/vibe-log.md`, con una entrada por commit de iteración (horas del `git log`) | ✅ |
| C3. Debugging real documentado con el formato pedido | `docs/debugging.md` #2 | ✅ |
| C4. Decisiones técnicas justificadas | `docs/architecture.md` | ✅ |
| C5. Limitaciones honestas | README, `docs/ai-prompts.md`, esta auditoría | ✅ |
| C6. Aceleración por Vibe Coding | `docs/presentation.md` diapositiva 12 | ✅ |
| C7. Matriz de pruebas con resultados reales | `docs/testing.md`, `docs/evidence/test-matrix-results.*` | ✅ |

## Criterio de finalización del proyecto

| Ítem | Estado |
|---|---|
| MVP funcional | ✅ |
| Interfaz refinada | ✅ |
| Funcionalidad de IA | ⚠️ Implementada; en producción corre la versión simulada (sin API key) |
| Prompts principales | ✅ |
| Master Prompt | ✅ |
| Arquitectura | ✅ |
| Testing | ✅ |
| Debugging real documentado | ✅ |
| Bitácora | ✅ |
| Evidencias | ✅ |
| README | ✅ |
| Repositorio | ✅ |
| Deployment / proyecto vivo | ✅ |
| URL comprobada | ✅ |
| Guion del video | ✅ (video sin grabar) |
| Estructura de presentación | ✅ |
| Revisión contra la rúbrica | ✅ (este documento) |
| Revisión final del producto | ✅ |

## Acciones pendientes que sólo puede hacer el estudiante
1. **(Recomendado)** Añadir `ANTHROPIC_API_KEY` en Vercel (Project → Settings → Environment Variables) y volver a desplegar para activar Claude. Luego ejecutar `node scripts/test-matrix.mjs --base https://ecotrack-vibecoding.vercel.app --out docs/evidence/produccion-ia` y documentar los resultados reales.
2. Grabar el video siguiendo `docs/demo-script.md`.
