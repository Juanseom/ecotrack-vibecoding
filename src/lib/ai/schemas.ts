import { z } from "zod";

/**
 * Esquemas de salida de las llamadas a Claude (salidas estructuradas, `output_config.format`).
 *
 * Deben ser compatibles con las salidas estructuradas de la API: objetos, enums, strings,
 * números, booleanos y `nullable`. Sin `min`/`max`/`length` ni `.int()` (la API no admite
 * restricciones numéricas ni de longitud): las longitudes y los índices se validan en código
 * (src/lib/interpreters/claude.ts). La extracción usa `ExtractionSchema` de src/lib/schemas.ts.
 */

export const CATEGORIES = ["electricity", "fuel", "vehicle", "heating_gas", "waste"] as const;

/** Prompt 2 · Validación. */
export const ValidationOutputSchema = z.object({
  issues: z.array(
    z.object({
      severity: z.enum(["info", "warning"]),
      message: z.string(),
      /** Índice (desde 0) del item de la extracción, o null si es general. */
      item_index: z.number().nullable(),
    }),
  ),
  clarifying_question: z.string().nullable(),
  /** Índices de items no respaldados por el texto. */
  discard: z.array(z.number()),
});

/** Prompt 3 · Análisis. */
export const AnalysisOutputSchema = z.object({
  headline: z.string(),
  summary: z.string(),
});

export const RecommendationOutputSchema = z.object({
  title: z.string(),
  detail: z.string(),
  category: z.enum(CATEGORIES),
  impact: z.enum(["alto", "medio", "bajo"]),
  effort: z.enum(["fácil", "media", "difícil"]),
});

/** Prompt 4 · Recomendaciones. Exactamente 3 lo pide el prompt; el código recorta a 3. */
export const RecommendationsOutputSchema = z.object({
  recommendations: z.array(RecommendationOutputSchema),
});

export type ValidationOutput = z.infer<typeof ValidationOutputSchema>;
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
export type RecommendationsOutput = z.infer<typeof RecommendationsOutputSchema>;
