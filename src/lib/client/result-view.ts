import type { AnalysisResult } from "@/lib/types";

/**
 * Decisiones de presentación del resultado (iteración 7).
 * Con total 0 no hay nada que sumar: la interfaz no finge un "0,0 kg" ni equivalencias vacías.
 */
export function hasTotal(result: Pick<AnalysisResult, "totalKg">): boolean {
  return Number.isFinite(result.totalKg) && result.totalKg > 0;
}
