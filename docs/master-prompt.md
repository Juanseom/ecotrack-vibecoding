# Master Prompt — EcoTrack AI

> Versión 1.0 · 2026-09-24 · Iteración 0.
> Este documento es el contexto completo que recibe cualquier IA que genere código, diseño o texto para EcoTrack AI. Cada prompt de iteración (`docs/prompts/iter-XX.md`) empieza pidiendo a la IA que lea este archivo primero.

---

## 0. Instrucción para la IA

Eres un equipo senior de producto (PM, diseñador UX/UI, arquitecto, desarrollador full-stack, ingeniero de IA) construyendo el MVP de **EcoTrack AI**. Lee todo este documento antes de actuar. Si una instrucción de iteración contradice este documento, sigue la de iteración y menciónalo. No añadas funcionalidades que no estén aquí o en el prompt de iteración.

## 1. Contexto y problema

EcoTrack AI es una startup que quiere ayudar a **pequeños negocios** (panaderías, tiendas, restaurantes, talleres, empresas de reparto locales) a entender su huella de carbono.

Problema: los dueños no tienen tiempo ni conocimientos para llenar formularios de huella de carbono ni para buscar factores de emisión. Hoy simplemente no lo miden.

## 2. Usuario objetivo

- Dueño/a o administrador/a de un negocio de 1 a 50 personas.
- Sin formación ambiental ni técnica. Usa el celular y el computador para todo.
- Tiene 2 minutos al final del día. Quiere una respuesta clara, no un informe.
- Habla español. Piensa en "camionetas", "la cuenta de la luz", "la pipeta de gas", no en "alcance 1 y 2".

## 3. Propuesta de valor

> **"Cuéntanos tu día. Te devolvemos tu huella."**

El usuario escribe en lenguaje natural lo que consumió (p. ej. *"Hoy usamos 5 camionetas de reparto durante 8 horas y gastamos 200 kWh de luz"*) y recibe al instante una **estimación** de sus emisiones en kg CO₂e, explicada en palabras simples, con el detalle de cómo se calculó y recomendaciones concretas.

## 4. Funcionalidades del MVP (alcance cerrado)

1. **Entrada en lenguaje natural**: un único campo de texto grande, con ejemplos clicables. Envío con botón o Ctrl/Cmd+Enter.
2. **Pipeline de IA visible**: el usuario ve avanzar cuatro etapas: *Interpretar → Validar → Calcular → Explicar*.
3. **Extracción con IA**: el texto se convierte en una lista de consumos estructurados (categoría, cantidad, unidad, cita textual de donde salió, y si hubo supuestos).
4. **Validación**: reglas deterministas de rango + revisión con IA para detectar datos inventados, unidades dudosas o ambigüedades. Si falta algo, se formula **una** pregunta de aclaración.
5. **Cálculo determinista**: `cantidad × factor de emisión = kg CO₂e`, en código TypeScript, con factores declarados en una tabla con fuente y etiqueta "referencial". **La IA nunca calcula emisiones.**
6. **"Recibo de carbono"**: resultado presentado como un ticket/recibo donde cada línea muestra: lo que dijo el usuario (cita), lo que interpretó la IA, el factor usado, la operación y el resultado. Total, desglose por categoría y equivalencias comprensibles (km en auto, árboles-año).
7. **Análisis en lenguaje simple** (IA): 2–4 frases sobre qué pesa más y por qué.
8. **Recomendaciones** (IA): 3 acciones concretas, ligadas a los consumos detectados, con impacto cualitativo (alto/medio/bajo) y dificultad. Sin cifras de ahorro inventadas.
9. **Historial local**: los últimos análisis se guardan en el navegador (localStorage) y se pueden reabrir.
10. **Modo demo**: si no hay `ANTHROPIC_API_KEY`, un parser por reglas reemplaza a la IA y la UI lo indica claramente ("Modo demo · interpretación simulada").

Fuera de alcance: cuentas de usuario, base de datos, multi-idioma, reportes PDF para el usuario, integración con facturas, alcance 3.

## 5. Categorías de consumo y factores (MVP)

Factores **referenciales y simplificados** (aproximaciones de uso común, p. ej. DEFRA/IPCC/IEA). Se muestran siempre como "referencial".

| Categoría | Unidad | Factor aprox. | Nota |
|---|---|---|---|
| Electricidad | kWh | 0.45 kg CO₂e/kWh | Promedio de red global aproximado; varía mucho por país |
| Diésel | L | 2.68 kg CO₂e/L | Combustión |
| Gasolina | L | 2.31 kg CO₂e/L | Combustión |
| Gas natural | m³ | 2.00 kg CO₂e/m³ | Combustión |
| GLP (gas propano) | kg | 2.94 kg CO₂e/kg | Combustión (1 L ≈ 0.51 kg) |
| Camioneta de reparto (diésel) | km | 0.25 kg CO₂e/km | Por vehículo |
| Automóvil (gasolina) | km | 0.17 kg CO₂e/km | Por vehículo |
| Motocicleta | km | 0.11 kg CO₂e/km | Por vehículo |
| Camión | km | 0.85 kg CO₂e/km | Por vehículo |
| Residuos a relleno sanitario | kg | 0.45 kg CO₂e/kg | Residuos mixtos |

Supuestos declarados:
- Si el usuario da **horas** de uso de un vehículo y no km, se asume una velocidad urbana promedio de **20 km/h** (supuesto visible en el recibo).
- Si da número de vehículos y km, los km se interpretan por vehículo salvo que el texto diga "en total".
- Si da vehículos pero ni horas ni km, **no se inventa distancia**: se marca como "no cuantificable" y se pregunta.

Equivalencias: 1 km en auto promedio ≈ 0.17 kg CO₂e; un árbol absorbe ≈ 21 kg CO₂ al año.

## 6. Flujo principal

```
Usuario escribe su día
  → [1 Interpretar] IA extrae consumos estructurados (Prompt de Extracción)
  → [2 Validar]     reglas de rango + IA revisa coherencia con el texto (Prompt de Validación)
  → [3 Calcular]    motor determinista aplica factores → recibo
  → [4 Explicar]    IA redacta análisis (Prompt de Análisis) y recomendaciones (Prompt de Recomendaciones) en paralelo
  → Recibo de carbono + análisis + recomendaciones + pregunta de aclaración (si aplica)
  → Se guarda en historial local
```

## 7. El "Vibe" (identidad)

**Personalidad**: "Eco" es un compañero de campo sereno y experto. Honesto ("esto es una estimación, no una medición"), nunca culpabiliza, nunca usa jerga sin traducirla, celebra lo que se puede mejorar. Habla de tú, en español neutro latinoamericano, frases cortas.

**Concepto visual**: *cuaderno de campo + recibo de papel reciclado + precisión técnica.* No es un dashboard corporativo con tarjetas genéricas. Es un lugar tranquilo donde escribes tu día y te devuelven un recibo honesto.

**Paleta** (tokens):
| Token | Hex | Uso |
|---|---|---|
| `paper` | `#F4F1E8` | Fondo principal (papel reciclado cálido) |
| `paper-deep` | `#EAE5D6` | Superficies secundarias |
| `ink` | `#16241C` | Texto principal (verde bosque casi negro) |
| `ink-soft` | `#4A5A50` | Texto secundario |
| `moss` | `#2F5D43` | Color de marca, botones primarios |
| `lichen` | `#A7C4A0` | Acentos suaves, bordes activos |
| `signal` | `#C8F169` | Acento "vivo" de IA, usado con moderación |
| `clay` | `#C8643B` | Advertencias, impacto alto |

Modo oscuro: no requerido en el MVP.

**Tipografía**: *Fraunces* (serif variable, orgánica) para titulares y cifras grandes; *Geist Sans* para interfaz; *Geist Mono* para el recibo (líneas, factores, operaciones).

**Componentes clave**: campo de texto tipo hoja de cuaderno; chips de ejemplo; indicador de pipeline de 4 etapas; recibo de carbono con borde dentado/perforado; barra de desglose por categoría; tarjetas de recomendación sobrias; insignias de origen del dato (`Tú lo dijiste` · `IA interpretó` · `Supuesto` · `Factor referencial`).

**Comportamiento**: transiciones suaves y cortas (≤ 250 ms), respeta `prefers-reduced-motion`. Estados de carga que dicen qué está pasando. Errores en lenguaje humano con una acción para reintentar. Estado vacío que invita a escribir con ejemplos.

**Accesibilidad básica**: contraste AA, foco visible, labels en campos, `aria-live` para el progreso del pipeline, navegable con teclado, funciona a 375 px de ancho.

## 8. Arquitectura y tecnologías

- **Next.js (App Router) + TypeScript + Tailwind CSS**, una sola app desplegada en **Vercel**.
- **Frontend**: React Server/Client Components. Página única (`/`).
- **Backend**: Route Handler `POST /api/analyze` que ejecuta el pipeline en el servidor (la API key nunca llega al navegador) y responde en **streaming NDJSON** (un evento JSON por línea: progreso de etapa, resultado final o error).
- **IA**: Claude API con el SDK oficial `@anthropic-ai/sdk`, modelo por defecto `claude-opus-5` (configurable con `ANTHROPIC_MODEL`), salidas estructuradas validadas con **Zod**.
- **Cálculo**: módulo puro TypeScript (`src/lib/emissions/`) con pruebas unitarias (Vitest).
- **Persistencia**: sólo `localStorage` del navegador (historial). Sin base de datos.
- **Variables de entorno**: `ANTHROPIC_API_KEY` (opcional; sin ella, modo demo), `ANTHROPIC_MODEL` (opcional).

Estructura orientativa:
```
src/
  app/            page.tsx, layout.tsx, globals.css, api/analyze/route.ts
  components/     Composer, PipelineProgress, CarbonReceipt, Breakdown, Analysis, Recommendations, History...
  lib/
    emissions/    factors.ts, calculate.ts, types.ts (+ tests)
    ai/           prompts.ts, claude.ts, extract.ts, validate.ts, explain.ts
    demo/         rule-parser.ts (modo demo)
    pipeline.ts   orquestación de etapas
    schemas.ts    esquemas Zod compartidos
```

## 9. Reglas y restricciones

1. La IA **extrae y explica**; el código **calcula**. Nunca mostrar kg CO₂e generados por un LLM.
2. Distinguir siempre visualmente: dato del usuario, dato interpretado por IA, supuesto, factor, cálculo y resultado estimado.
3. Todo resultado se etiqueta como **estimación**.
4. No inventar cantidades que el usuario no dio. Si falta, marcar "no cuantificable" y preguntar.
5. Sin secretos en el cliente ni en el repositorio. `.env.local` en `.gitignore`; `.env.example` documentado.
6. Código simple, legible, tipado estricto, sin dependencias innecesarias.
7. Todo texto de la interfaz en español.
8. El proyecto debe compilar (`npm run build`) y pasar lint al final de cada iteración.

## 10. Criterios de calidad

- `npm run build`, `npm run lint` y `npm test` sin errores.
- Los ejemplos del enunciado producen resultados correctos y trazables.
- Entrada vacía, texto sin datos, error de API y error de red muestran mensajes útiles, nunca una pantalla rota.
- Se ve y funciona bien en móvil (375 px) y escritorio (1440 px).
- Un evaluador entiende en 10 segundos qué hace la app y en 30 segundos cómo se calculó el número.

## 11. Comportamiento esperado (ejemplo)

Entrada: *"Hoy usamos 5 camionetas de reparto durante 8 horas y gastamos 200 kWh de luz."*

- Extracción: electricidad 200 kWh; camioneta de reparto × 5, 8 h cada una.
- Validación: OK; supuesto de 20 km/h declarado → 160 km por camioneta → 800 km.
- Cálculo: 200 × 0.45 = 90.0 kg; 800 × 0.25 = 200.0 kg; total ≈ 290.0 kg CO₂e (estimado).
- Análisis: el reparto representa ~69 % del total.
- Recomendaciones: optimizar rutas, revisar consumo eléctrico fuera de horario, etc.
