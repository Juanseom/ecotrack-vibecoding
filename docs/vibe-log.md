# Bitácora de Vibe Coding — EcoTrack AI

> Registro cronológico escrito **durante** el desarrollo. Cada entrada se agrega al terminar la etapa correspondiente.
> Zona horaria: America/Bogota (UTC−5).

## Estrategia de Vibe Coding

El proceso tiene tres capas de prompts:

1. **Prompt de dirección (meta-prompt)**: el estudiante entregó a Claude Code un documento que lo nombra agente principal del Capstone (rol, reglas de no inventar evidencia, fases). Ese documento es el punto de partida.
2. **Master Prompt** (`docs/master-prompt.md`): el contexto de producto, diseño y arquitectura que cualquier IA generadora debe leer.
3. **Prompts de iteración** (`docs/prompts/iter-XX-*.md`): instrucciones concretas por iteración. Se guardan **antes** de ejecutarse y se entregan *literalmente* a un sub-agente generador de código de Claude Code que arranca con contexto limpio (sólo conoce el Master Prompt, el prompt de iteración y el repositorio). Así la calidad del resultado depende de la calidad del prompt, igual que en Cursor o Bolt.

El agente principal actúa como director: escribe prompts, revisa el resultado (build, lint, pruebas, capturas con Playwright), decide la siguiente iteración y documenta.

Dentro del producto hay una cuarta capa: los **prompts de IA del producto** (`docs/ai-prompts.md`) que usa EcoTrack AI en tiempo de ejecución.

---

## Entrada 0 — Análisis y definición del producto

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-24 11:05 |
| Etapa | Iteración 0 · Definición |
| Objetivo | Entender el taller, convertir la rúbrica en criterios verificables y definir producto, vibe, arquitectura y roadmap antes de escribir código. |
| Prompt utilizado | Meta-prompt del estudiante ("ROL: AGENTE PRINCIPAL DEL PROYECTO CAPSTONE – ECOTRACK AI") + documento oficial del taller. |
| Acción realizada | Inspección del entorno: repo Git vacío (sólo `README.md`, 1 commit) con remoto en GitHub; Node v26.3.0, npm 11.16.0, `gh` autenticado como `Juanseom`; Chromium de Playwright en caché (permite capturas reales); **sin** `ANTHROPIC_API_KEY` ni CLI de Vercel. Se escribieron `docs/01-analisis-taller.md`, `docs/master-prompt.md`, `docs/architecture.md`, `docs/status.md`. |
| Resultado | Rúbrica convertida en 20 criterios verificables (A1–A6, B1–B7, C1–C7) + 6 extras. Master Prompt v1.0. Roadmap de 8 iteraciones. |
| Problemas | Falta la API key de Anthropic y una cuenta de Vercel: ambas requieren al estudiante. |
| Solución | Se diseña un **modo demo** (parser por reglas, etiquetado como simulado) para que el desarrollo avance sin clave; la clave se pedirá al llegar a la iteración de integración de IA, y la cuenta de Vercel al desplegar. |
| Decisiones | (1) Claude Code como herramienta de Vibe Coding; (2) Next.js + Tailwind + Claude API + Zod; (3) **la IA interpreta, el código calcula**; (4) resultado presentado como "recibo de carbono" para mostrar la trazabilidad; (5) streaming NDJSON para que el usuario vea las 4 etapas de la IA. |
| Evidencia | `docs/01-analisis-taller.md`, `docs/master-prompt.md`, `docs/architecture.md`, commit de la iteración 0. |
