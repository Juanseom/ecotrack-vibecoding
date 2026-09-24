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
