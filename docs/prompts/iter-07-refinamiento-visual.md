# Prompt · Iteración 7 — Refinamiento visual en lenguaje natural

> Escrito por el agente principal el 2026-09-24 tras mirar las capturas `07-antes-*.png`. A propósito está redactado como una petición de diseño en lenguaje natural (lo que pide el taller: "refina la interfaz pidiendo cambios en lenguaje natural"), no como una especificación técnica. Entregado por referencia a un sub-agente (Claude Code, contexto limpio).

---

Estás en `/Users/juanseom/UNIVERSIDAD/SWNT/ecotrack-vibecoding`. Lee `docs/master-prompt.md` (sobre todo §7, el vibe) y `AGENTS.md`, y **mira las capturas** `docs/evidence/screenshots/07-antes-vacio.png`, `07-antes-resultado.png`, `07-antes-mobile.png` y `07-antes-total-cero.png` antes de tocar nada.

Quiero que la app se sienta **más minimalista, más tranquila y más verde**. Hoy funciona y tiene personalidad, pero cuando llega el resultado hay demasiadas cosas gritando a la vez. Imagina que el dueño de una panadería la abre en su celular a las 9 de la noche: tiene que ver su número y entender qué hacer en cinco segundos, y el detalle tiene que estar ahí sólo si lo quiere.

Lo que te pido, en palabras:

1. **Primero el número, después el detalle.** Cuando llega el resultado, lo primero que se debe ver (sobre todo en el celular) es el total grande y la frase de Eco con el hallazgo principal. Hoy en el celular hay que bajar muchísimo, pasando por todo el recibo, para ver qué pasó. En escritorio el recibo a la izquierda me gusta; mantenlo.
2. **Un recibo más limpio.** Las insignias de origen del dato son la idea más valiosa de la app, pero ahora hay tantas y tan fuertes que el recibo parece un formulario. Hazlas más discretas (más pequeñas, menos color, quizá sólo un punto de color + texto corto) y deja que la operación `cantidad × factor = kg` respire. Los supuestos pueden ir más suaves. No pierdas información: sólo baja el volumen.
3. **Más verde, menos arcoíris.** Los colores del desglose (naranja, azul, morado) se salen de la identidad. Llévalos a una familia de verdes, musgos y tierras que se siga distinguiendo bien entre sí (el ícono y el nombre ya acompañan al color, así que no dependas sólo del color). El amarillo-lima `signal` úsalo sólo para lo que "está vivo" (la etapa en curso), no como color de datos.
4. **Menos ruido alrededor.** Menos bordes y cajas: prefiero separar con aire y líneas finas punteadas, como un cuaderno. Revisa que los títulos de sección en mayúsculas mono no compitan con el contenido.
5. **Cuando no hay nada que sumar, no finjas.** Si el total es 0 (como en `07-antes-total-cero.png`), no muestres "¿De dónde viene?" vacío ni "≈ 0 km / 0,0 árboles". Muestra algo honesto y amable que invite a corregir el dato.
6. **El pipeline, más ligero.** Cuando termina bien, puede plegarse en una sola línea discreta ("Interpretado · Validado · Calculado · Explicado") en vez de ocupar cuatro cajas.
7. **Transparencia sin ruido.** Añade al final una sección plegable "Cómo calculamos" con la tabla de factores referenciales (actividad, factor, unidad, fuente) y los supuestos (20 km/h, etc.), leyendo los datos de `src/lib/emissions/factors.ts` (no los copies a mano). En el pie, un enlace discreto al repositorio `https://github.com/Juanseom/ecotrack-vibecoding`.
8. **Detalle pendiente:** la sección "Cómo funciona" dice "La IA entiende tu texto" aunque todavía no sabemos si hay IA; redáctalo de forma que sea verdad en ambos modos.

Límites: no cambies la lógica de cálculo, la API ni los textos de los prompts de IA. Mantén accesibilidad (contraste AA — los verdes claros sobre papel suelen fallar, compruébalo —, foco visible, `aria-live`), `prefers-reduced-motion` y cero scroll horizontal a 375 px. Todo en español.

Cuando termines: `npm run build`, `npm run lint` y `npm test` en verde (actualiza pruebas si cambiaste algo que tenían fijado, sin borrarlas). Genera las capturas "después" con los mismos escenarios y nombres `07-despues-vacio.png`, `07-despues-resultado.png` (1440 px), `07-despues-mobile.png` (390 px) y `07-despues-total-cero.png` en `docs/evidence/screenshots/` (puedes usar `scripts/screenshot.mjs`; el servidor en `127.0.0.1`). Cuéntame qué cambiaste y por qué, en términos de diseño, y cualquier problema que encontraste (con el error literal). No toques otros archivos de `docs/` y no hagas commits.
