# 01 · Análisis del taller y rúbrica

> Iteración 0 · 2026-09-24 · Autor: agente principal (Claude Code) actuando como PM / Business Analyst.

## 1. Qué pide el taller (lectura literal)

| # | Instrucción del documento oficial | Tipo |
|---|---|---|
| I1 | Definir la **personalidad** y el **flujo** de la aplicación ("el Vibe") | Obligatorio |
| I2 | Redactar un **Master Prompt** con la visión técnica **y estética** | Obligatorio |
| I3 | Usar una herramienta de generación de código con IA para crear **frontend y lógica básica** | Obligatorio |
| I4 | Implementar **al menos una funcionalidad impulsada por una API de IA** (real o simulada), p. ej. análisis de texto para extraer datos de consumo | Obligatorio |
| I5 | **Refinar la interfaz pidiendo cambios en lenguaje natural** (ej.: "más minimalista, tonos verdes") | Obligatorio |
| I6 | Identificar **al menos un error o desafío técnico real** y documentar cómo se usó la IA para resolverlo **sin escribir código manualmente** | Obligatorio |
| I7 | Explicar cómo el Vibe Coding **aceleró** el desarrollo frente a métodos tradicionales | Obligatorio |
| I8 | Interfaz tipo **chat o formulario inteligente** donde el usuario describe su día | Obligatorio (escenario) |

## 2. Entregables

| # | Entregable | Tipo | Dónde quedará |
|---|---|---|---|
| E1 | Enlace al repositorio **o** proyecto vivo | Obligatorio | GitHub `Juanseom/ecotrack-vibecoding` + URL de despliegue |
| E2 | Bitácora (PDF/Markdown) con **prompts principales** | Obligatorio | `docs/vibe-log.md`, `docs/prompts/`, `docs/ai-prompts.md` |
| E3 | Bitácora con **capturas de pantalla del proceso de iteración** | Obligatorio | `docs/evidence/screenshots/` (capturas reales con Playwright) |
| E4 | Bitácora con **explicación de la funcionalidad de IA** | Obligatorio | `docs/ai-prompts.md`, `docs/architecture.md` |
| E5 | Video demo ≤ 2 min | Opcional, recomendado | `docs/demo-script.md` (guion); la grabación la hace el estudiante |

## 3. Rúbrica convertida en criterios verificables

### Criterio A — Ejecución técnica y Vibe Coding
- [ ] A1. La aplicación funciona de extremo a extremo (texto → resultado) en local.
- [ ] A2. La aplicación funciona en la URL desplegada (comprobado, no supuesto).
- [ ] A3. Sin errores críticos: build de producción limpio, lint/typecheck sin errores, sin crashes en la matriz de pruebas.
- [ ] A4. Estética: identidad visual propia (no dashboard genérico), responsive, estados de carga/error/vacío.
- [ ] A5. Evidencia de que el código fue generado con prompts precisos (prompts de iteración guardados literalmente y ejecutados).
- [ ] A6. Al menos una iteración de UI pedida en lenguaje natural, con captura antes/después.

### Criterio B — Integración de IA
- [ ] B1. IA real vía API (Claude) integrada en el flujo principal.
- [ ] B2. La IA resuelve el problema del usuario: lenguaje natural → datos estructurados.
- [ ] B3. Integración lógica: la IA interpreta y explica; el **cálculo es determinista** (la IA no inventa números).
- [ ] B4. Cuatro prompts diseñados: extracción, validación, análisis, recomendaciones.
- [ ] B5. Separación visible entre dato del usuario / dato extraído por IA / supuesto / factor / cálculo / resultado estimado.
- [ ] B6. Manejo de errores de IA (clave ausente, error de API, respuesta inválida, texto sin datos).
- [ ] B7. Demostrable: funciona con los ejemplos del enunciado.

### Criterio C — Pensamiento crítico y documentación
- [ ] C1. Estrategia de prompts explicada (por qué Master Prompt + prompts por iteración + prompts de producto).
- [ ] C2. Bitácora escrita durante el proceso (no al final), con fecha, objetivo, prompt, resultado, decisiones.
- [ ] C3. Debugging real documentado (problema → contexto → error → análisis → prompt → respuesta → solución → prueba).
- [ ] C4. Decisiones técnicas justificadas (stack, arquitectura, factores de emisión).
- [ ] C5. Limitaciones honestas (estimaciones, factores simplificados).
- [ ] C6. Explicación de cómo el Vibe Coding aceleró el desarrollo.
- [ ] C7. Matriz de pruebas con resultados reales.

### Extras que elevan la calidad (no obligatorios)
- [ ] X1. Pipeline de IA visible en la UI (el usuario ve cada etapa).
- [ ] X2. Modo demo sin clave, claramente etiquetado como simulado (para que la demo nunca falle).
- [ ] X3. Pruebas automatizadas del motor de cálculo.
- [ ] X4. Historial local de análisis.
- [ ] X5. Bitácora exportada a PDF.
- [ ] X6. Guion de video y estructura de presentación.

## 4. Conclusiones que guían el plan

1. **La rúbrica premia el proceso tanto como el producto.** Cada iteración debe dejar: prompt literal, resultado, captura y decisión.
2. **La IA no debe calcular.** Si un LLM "inventa" kg de CO₂ el resultado no es defendible. La IA extrae y explica; un motor determinista calcula con factores declarados.
3. **La demo no puede depender de la suerte.** Se añade un modo demo (parser por reglas) claramente etiquetado, para cuando no haya API key o falle la red.
4. **El debugging no se fabrica.** Se documentará el primer problema real que aparezca.
5. **"Vibe Coding" demostrable** = los prompts de iteración se guardan *antes* de ejecutarse y se entregan tal cual a un agente generador de código (sub-agente de Claude Code con contexto limpio que sólo conoce el Master Prompt y el prompt de iteración).
