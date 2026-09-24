import type { CalculationResult } from "@/lib/emissions/calculate";
import type { Extraction } from "@/lib/schemas";
import type { AnalysisResult, Recommendation, ValidationIssue } from "@/lib/types";

/** Todo lo que el intérprete necesita para redactar el análisis y las recomendaciones. */
export interface ExplainContext {
  text: string;
  lines: CalculationResult["lines"];
  unquantified: CalculationResult["unquantified"];
  totalKg: number;
  byCategory: CalculationResult["byCategory"];
  issues: ValidationIssue[];
}

export interface ReviewResult {
  issues: ValidationIssue[];
  clarifyingQuestion: string | null;
}

/**
 * Contrato del intérprete: extrae y explica, nunca calcula.
 * Hoy lo implementa el intérprete por reglas (modo demo); en la iteración 4, Claude.
 */
export interface Interpreter {
  mode: "ai" | "demo";
  model?: string;
  extract(text: string): Promise<Extraction>;
  review(text: string, extraction: Extraction): Promise<ReviewResult>;
  explain(ctx: ExplainContext): Promise<AnalysisResult["analysis"]>;
  recommend(ctx: ExplainContext): Promise<Recommendation[]>;
}

/** Error que viene del intérprete (p. ej. la API de IA): el pipeline lo reporta como `ai_error`. */
export class InterpreterError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "InterpreterError";
  }
}
