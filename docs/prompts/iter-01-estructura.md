# Prompt · Iteración 1 — Estructura inicial

> Escrito por el agente principal el 2026-09-24. Entregado literalmente a un sub-agente generador de código (Claude Code, contexto limpio).

---

Estás trabajando en el repositorio `/Users/juanseom/UNIVERSIDAD/SWNT/ecotrack-vibecoding`.

**Primero lee completo `docs/master-prompt.md`.** Es el contexto del producto EcoTrack AI. Esta iteración sólo crea la base técnica y visual; no implementes todavía la lógica de IA ni el cálculo.

## Objetivo
Dejar un proyecto Next.js que compila, con el sistema de diseño de EcoTrack AI configurado y una página inicial que ya transmita la identidad ("cuaderno de campo + recibo de papel reciclado + precisión técnica").

## Tareas
1. Crea un proyecto **Next.js (última versión estable, App Router) + TypeScript + Tailwind CSS + ESLint** en la raíz del repositorio, usando `npm` y el directorio `src/`, alias `@/*`. El repo ya contiene `README.md` y `docs/`: consérvalos intactos (si el generador se niega por archivos existentes, genera en una carpeta temporal y mueve los archivos).
2. Configura los **tokens de color** del Master Prompt (`paper`, `paper-deep`, `ink`, `ink-soft`, `moss`, `lichen`, `signal`, `clay`) como colores de Tailwind utilizables (`bg-paper`, `text-ink`, etc.).
3. Configura las tipografías con `next/font`: **Fraunces** (display), **Geist Sans** (UI), **Geist Mono** (recibo), expuestas como `font-display`, `font-sans`, `font-mono`.
4. `layout.tsx`: `lang="es"`, metadata (título "EcoTrack AI — Tu huella de carbono en lenguaje natural", descripción en español), fondo `paper`, texto `ink`. Añade una textura sutil de papel en el fondo (CSS puro, sin imágenes externas).
5. `page.tsx`: una portada mínima con: logotipo tipográfico "EcoTrack AI" (con una pequeña marca/hoja hecha en SVG inline), el lema **"Cuéntanos tu día. Te devolvemos tu huella."**, una línea explicativa y un área reservada (placeholder visual) donde en la siguiente iteración irá el campo de texto. Nada de tarjetas genéricas de dashboard.
6. Añade `.env.example` con `ANTHROPIC_API_KEY=` y `ANTHROPIC_MODEL=claude-opus-5`, ambos comentados/explicados. Asegura que `.env*.local` está en `.gitignore`.
7. Añade Vitest como dependencia de desarrollo con un script `npm test` (`vitest run`) y un test trivial que pase, para que las iteraciones siguientes puedan añadir pruebas.
8. Elimina el contenido de ejemplo de Next.js (logos de Vercel/Next, SVGs de `public/` que no se usen).

## Criterios de aceptación
- `npm run build`, `npm run lint` y `npm test` terminan sin errores.
- La portada usa los tokens y las tres familias tipográficas.
- `README.md` y `docs/` siguen intactos.

## Al terminar
Responde con: lista de archivos creados/modificados, versiones instaladas de next/react/tailwind, salida resumida de build/lint/test, y cualquier problema que hayas encontrado y cómo lo resolviste (con el mensaje de error literal si lo hubo). No hagas commits.
