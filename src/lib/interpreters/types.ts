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
  /** Índices (desde 0) de items de la extracción no respaldados por el texto: el pipeline los descarta. */
  discard: number[];
}

/**
 * Contrato del intérprete: extrae y explica, nunca calcula.
 * Lo implementan el intérprete por reglas (modo demo) y Claude (`ClaudeInterpreter`).
 */
export interface Interpreter {
  mode: "ai" | "demo";
  model?: string;
  extract(text: string): Promise<Extraction>;
  review(text: string, extraction: Extraction): Promise<ReviewResult>;
  explain(ctx: ExplainContext): Promise<AnalysisResult["analysis"]>;
  recommend(ctx: ExplainContext): Promise<Recommendation[]>;
}

/**
 * Error que viene del intérprete (p. ej. la API de IA): el pipeline lo reporta como `ai_error`.
 * Su `message` se muestra al usuario, así que va en español y sin detalles internos
 * (el detalle técnico viaja en `cause` y sólo se registra en el servidor).
 */
export class InterpreterError extends Error {
  /** `false` si reintentar no sirve (configuración del servidor); `true` si puede ser pasajero. */
  readonly retryable: boolean;

  constructor(message: string, options?: { cause?: unknown; retryable?: boolean }) {
    super(message, options);
    this.name = "InterpreterError";
    this.retryable = options?.retryable ?? true;
  }
}
