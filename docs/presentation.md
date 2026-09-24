# Estructura de la presentación — EcoTrack AI

> 14 diapositivas, unos 10 minutos. Cada diapositiva indica el mensaje clave y la evidencia a mostrar (todas existen en el repo).

| # | Diapositiva | Mensaje clave | Evidencia / visual |
|---|---|---|---|
| 1 | **Problema** | Los pequeños negocios no miden su huella: formularios complejos, jerga, sin tiempo. | Frase del enunciado: *"Hoy usamos 5 camionetas de reparto y gastamos 200 kWh de luz."* |
| 2 | **Usuario** | Dueño/a de un negocio de 1–50 personas, sin formación ambiental, 2 minutos al final del día, desde el celular. | `docs/master-prompt.md` §2 |
| 3 | **Solución** | "Cuéntanos tu día. Te devolvemos tu huella." Un campo de texto → un recibo de carbono. | `08-produccion-vacio.png` |
| 4 | **Vibe** | Cuaderno de campo + recibo de papel reciclado + precisión técnica. Eco: sereno, honesto, sin culpa. Paleta papel/bosque/musgo, Fraunces + Geist Mono. | `docs/master-prompt.md` §7, `07-despues-resultado.png` |
| 5 | **Producto** | Total primero, recibo línea por línea, insignias de origen, pregunta de Eco, 3 recomendaciones, "Cómo calculamos". | `08-produccion-resultado.png`, `08-produccion-mobile.png` |
| 6 | **Arquitectura** | Una app Next.js en Vercel; `/api/analyze` transmite 4 etapas en streaming; intérprete intercambiable (Claude / reglas); motor determinista. Sin base de datos: no hacía falta. | Diagrama de `docs/architecture.md` |
| 7 | **IA** | 4 prompts con una tarea cada uno y salida validada con Zod. **La IA interpreta y explica; el código calcula.** La validación puede descartar datos inventados. | `docs/ai-prompts.md` (tabla de flujo) |
| 8 | **Ejemplo de funcionamiento** | 200 kWh × 0,45 = 90 kg; 5 camionetas × 8 h × 20 km/h = 800 km × 0,25 = 200 kg; total 290 kg (69 % reparto). | Demo en vivo o `07-despues-resultado.png` |
| 9 | **Iteraciones** | 0 Definición → 1 Estructura → 2 Interfaz → 3 Flujo → 4 IA → 5 QA → 6 Debugging → 7 Refinamiento → 8 Despliegue. Cada una con un prompt versionado ejecutado por un agente. | `docs/prompts/`, `docs/vibe-log.md`, capturas 01→08 |
| 10 | **Debugging** | QA encontró que "-50 kWh" se calculaba como +50 sin aviso. La IA diagnosticó la causa raíz (regex sin signo), encontró un 2.º defecto oculto (vehículos ≤ 0 contados como 1), escribió 26 pruebas de regresión y lo corrigió. 17/19 → 19/19. | `docs/debugging.md` #2, `docs/evidence/debug-diagnostico-iter06.md`, `06-f1-negativo.png` |
| 11 | **Resultado** | MVP desplegado, 183 pruebas, matriz 19/19 local y 17/17 aplicables en producción, responsive y accesible. | URL en vivo, `docs/testing.md` |
| 12 | **Qué permitió el Vibe Coding** | Ver sección siguiente. | `docs/vibe-log.md` (métricas) |
| 13 | **Limitaciones** | Factores referenciales (no por país); estimación, no medición; demo pública en modo reglas: **la IA real está implementada pero no se ha ejecutado con éxito por falta de API key**; historial sólo local; latencia de 4 llamadas sin medir. | `docs/ai-prompts.md` (estado de verificación) |
| 14 | **Próximos pasos** | Activar Claude con API key y medir extracción/latencia; factores por país (p. ej. red eléctrica de Colombia); conversación de seguimiento con la pregunta de Eco; exportar un reporte mensual; cuentas y metas. | — |

## Diapositiva 12 — Cómo el Vibe Coding aceleró el desarrollo

**Datos medidos en este proyecto** (fuente: `git log` y registros de los agentes):

| Métrica | Valor |
|---|---|
| Del primer commit de documentación (11:07) al despliegue verificado (≈ 12:50) | ≈ 1 h 45 min |
| Tiempo total de generación de los 7 sub-agentes | ≈ 72 min |
| Código de producción / pruebas generados | 4.711 / 1.911 líneas TypeScript |
| Pruebas automatizadas | 183 |
| Prompts de iteración escritos | 7 (+ Master Prompt) |
| Líneas de código de producto escritas a mano | 0 (el agente principal escribió prompts, documentación y un script de capturas) |

**Qué cambió respecto al desarrollo tradicional** (comparación cualitativa, no medida):
1. **El trabajo se movió de escribir sintaxis a escribir intención.** El esfuerzo estuvo en el Master Prompt y en prompts precisos (contratos de tipos, criterios de aceptación, límites), no en teclear componentes.
2. **Iteraciones de minutos, no de días.** Una interfaz completa con 14 componentes salió de un solo prompt (iteración 2, ~12 min de generación).
3. **QA y debugging también se delegan.** Un agente QA escribió el arnés y encontró fallos; otro los diagnosticó con causa raíz y pruebas de regresión antes de tocar el código.
4. **El diseño se dirige con lenguaje natural.** "Más verde, menos arcoíris", "cuando no hay nada que sumar, no finjas" → rediseño completo verificado con capturas antes/después.
5. **Lo que no se acelera:** decidir qué construir, revisar lo generado (el agente principal detectó el problema de honestidad del modo demo al mirar una captura) y validar con pruebas reales. El criterio humano sigue siendo el cuello de botella, y es donde está el valor.
