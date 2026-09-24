import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

import { DEFAULT_EFFORT, type Effort } from "@/lib/ai/client";
import {
  ANALYSIS_SYSTEM_PROMPT,
  EXTRACTION_SYSTEM_PROMPT,
  PROMPT_VERSION,
  RECOMMENDATIONS_SYSTEM_PROMPT,
  VALIDATION_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import {
  AnalysisOutputSchema,
  RecommendationsOutputSchema,
  ValidationOutputSchema,
} from "@/lib/ai/schemas";
import { lineIdFor } from "@/lib/emissions/calculate";
import { formatAmount, formatKg, formatShare } from "@/lib/format";
import {
  InterpreterError,
  type ExplainContext,
  type Interpreter,
  type ReviewResult,
} from "@/lib/interpreters/types";
import { ExtractionSchema, type Extraction } from "@/lib/schemas";
import type { AnalysisResult, Recommendation, ValidationIssue } from "@/lib/types";

/**
 * Intérprete con Claude: cuatro llamadas con salidas estructuradas (`client.messages.parse`
 * + `zodOutputFormat`), una por prompt de producto. Claude extrae, revisa y redacta;
 * los kg CO₂e los calcula siempre el motor determinista (src/lib/emissions/).
 * SÓLO SERVIDOR.
 */

/** Lo único que el intérprete usa del SDK: permite inyectar un doble en las pruebas. */
export type ClaudeClient = { messages: Pick<Anthropic["messages"], "parse"> };

export interface ClaudeInterpreterOptions {
  client: ClaudeClient;
  model: string;
  effort?: Effort;
}

type Stage = "extract" | "review" | "explain" | "recommend";

const MAX_TOKENS: Record<Stage, number> = {
  extract: 16_000,
  review: 8_000,
  explain: 4_000,
  recommend: 8_000,
};

export const RECOMMENDATION_COUNT = 3;

export class ClaudeInterpreter implements Interpreter {
  readonly mode = "ai" as const;
  readonly model: string;
  private readonly client: ClaudeClient;
  private readonly effort: Effort;

  constructor({ client, model, effort = DEFAULT_EFFORT }: ClaudeInterpreterOptions) {
    this.client = client;
    this.model = model;
    this.effort = effort;
  }

  async extract(text: string): Promise<Extraction> {
    return this.callStructured({
      stage: "extract",
      system: EXTRACTION_SYSTEM_PROMPT,
      user: tag("texto_usuario", text),
      schema: ExtractionSchema,
      maxTokens: MAX_TOKENS.extract,
    });
  }

  async review(text: string, extraction: Extraction): Promise<ReviewResult> {
    const numbered = {
      items: extraction.items.map((item, index) => ({ index, ...item })),
      ignored: extraction.ignored,
    };
    const output = await this.callStructured({
      stage: "review",
      system: VALIDATION_SYSTEM_PROMPT,
      user: [tag("texto_usuario", text), tag("extraccion", JSON.stringify(numbered))].join("\n\n"),
      schema: ValidationOutputSchema,
      maxTokens: MAX_TOKENS.review,
    });

    const count = extraction.items.length;
    const isIndex = (value: number | null): value is number =>
      value !== null && Number.isInteger(value) && value >= 0 && value < count;
    const discard = [...new Set(output.discard.filter(isIndex))].sort((a, b) => a - b);

    const issues: ValidationIssue[] = output.issues
      .filter((issue) => issue.message.trim())
      .map((issue) => {
        const lineId = lineIdAfterDiscard(extraction, issue.item_index, discard, isIndex);
        return {
          severity: issue.severity,
          message: issue.message.trim(),
          ...(lineId ? { lineId } : {}),
        };
      });

    return {
      issues,
      clarifyingQuestion: output.clarifying_question?.trim() || null,
      discard,
    };
  }

  async explain(ctx: ExplainContext): Promise<AnalysisResult["analysis"]> {
    const output = await this.callStructured({
      stage: "explain",
      system: ANALYSIS_SYSTEM_PROMPT,
      user: tag("contexto_calculado", JSON.stringify(compactContext(ctx))),
      schema: AnalysisOutputSchema,
      maxTokens: MAX_TOKENS.explain,
    });
    return { headline: output.headline.trim(), summary: output.summary.trim() };
  }

  async recommend(ctx: ExplainContext): Promise<Recommendation[]> {
    // Sin emisiones calculadas no hay a qué ligar una recomendación (igual que el modo demo).
    if (ctx.byCategory.length === 0) return [];
    const output = await this.callStructured({
      stage: "recommend",
      system: RECOMMENDATIONS_SYSTEM_PROMPT,
      user: tag("contexto_calculado", JSON.stringify(compactContext(ctx))),
      schema: RecommendationsOutputSchema,
      maxTokens: MAX_TOKENS.recommend,
    });
    return output.recommendations.slice(0, RECOMMENDATION_COUNT).map((rec) => ({
      title: rec.title.trim(),
      detail: rec.detail.trim(),
      category: rec.category,
      impact: rec.impact,
      effort: rec.effort,
    }));
  }

  /**
   * Una llamada con salida estructurada. Comprueba `stop_reason` y `parsed_output` y traduce
   * cualquier fallo a `InterpreterError` con un mensaje para el usuario. Registra en el
   * servidor la duración y, si falla, el tipo de error (nunca el texto del usuario).
   */
  private async callStructured<S extends z.ZodType>({
    stage,
    system,
    user,
    schema,
    maxTokens,
  }: {
    stage: Stage;
    system: string;
    user: string;
    schema: S;
    maxTokens: number;
  }): Promise<z.infer<S>> {
    const started = Date.now();
    const elapsed = () => `${Date.now() - started} ms`;
    const tagLine = `[claude] ${stage} (${this.model}, effort ${this.effort}, prompts v${PROMPT_VERSION})`;

    let response;
    try {
      response = await this.client.messages.parse({
        model: this.model,
        max_tokens: maxTokens,
        thinking: { type: "adaptive" },
        output_config: { effort: this.effort, format: zodOutputFormat(schema) },
        system,
        messages: [{ role: "user", content: user }],
      });
    } catch (error) {
      const translated = translateError(error);
      console.error(`${tagLine} falló tras ${elapsed()}: ${translated.kind}`, describe(error));
      throw new InterpreterError(translated.message, { cause: error });
    }

    const fail = (kind: string, message: string): never => {
      console.error(`${tagLine} falló tras ${elapsed()}: ${kind}`);
      throw new InterpreterError(message);
    };

    if (response.stop_reason === "refusal") {
      fail(
        `refusal (${response.stop_details?.category ?? "sin categoría"})`,
        "La IA prefirió no procesar este texto. Descríbelo sólo con los consumos de tu negocio (luz, combustible, vehículos, gas, basura) e inténtalo otra vez.",
      );
    }
    if (response.stop_reason === "max_tokens") {
      fail("max_tokens", "La respuesta de la IA quedó incompleta. Inténtalo de nuevo, quizá con un texto más corto.");
    }
    if (response.parsed_output === null || response.parsed_output === undefined) {
      fail(`parsed_output nulo (stop_reason ${response.stop_reason})`, "La IA respondió en un formato inesperado. Inténtalo de nuevo.");
    }

    console.info(
      `${tagLine} ok en ${elapsed()} · tokens entrada ${response.usage.input_tokens}, salida ${response.usage.output_tokens}`,
    );
    return response.parsed_output as z.infer<S>;
  }
}

// ───────────────────────── Ayudantes ─────────────────────────

/** Envuelve datos en una etiqueta XML y evita que el texto la cierre antes de tiempo. */
function tag(name: string, content: string): string {
  const safe = content.replace(new RegExp(`</?${name}>`, "gi"), "");
  return `<${name}>\n${safe}\n</${name}>`;
}

/**
 * El pipeline descarta items antes de calcular, así que las líneas del recibo se numeran
 * con las posiciones que quedan. Si el item fue descartado o el índice no es válido, no hay línea.
 */
function lineIdAfterDiscard(
  extraction: Extraction,
  itemIndex: number | null,
  discard: number[],
  isIndex: (value: number | null) => value is number,
): string | undefined {
  if (!isIndex(itemIndex) || discard.includes(itemIndex)) return undefined;
  const position = itemIndex - discard.filter((d) => d < itemIndex).length;
  return lineIdFor(position, extraction.items[itemIndex]);
}

/**
 * Contexto compacto para análisis y recomendaciones: sólo lo que el modelo necesita,
 * con las cifras YA formateadas (es-CO) tal como aparecen en el recibo, para que las copie
 * en lugar de recalcularlas.
 */
export function compactContext(ctx: ExplainContext) {
  return {
    texto_usuario: ctx.text,
    lines: ctx.lines.map((line) => ({
      label: line.label,
      category: line.category,
      quote: line.quote,
      interpreted: line.interpreted,
      activity: `${formatAmount(line.activityAmount)} ${line.activityUnit}`,
      factor: `${formatAmount(line.factor.value, 3)} ${line.factor.unit}`,
      kg_co2e: formatKg(line.kgCO2e),
      ...(line.assumptions.length > 0 ? { assumptions: line.assumptions } : {}),
    })),
    total_kg_co2e: formatKg(ctx.totalKg),
    by_category: ctx.byCategory.map((c) => ({
      category: c.category,
      kg_co2e: formatKg(c.kg),
      share: formatShare(c.share),
    })),
    unquantified: ctx.unquantified.map((u) => ({ label: u.label, quote: u.quote, reason: u.reason })),
    validation_issues: ctx.issues.map((issue) => ({ severity: issue.severity, message: issue.message })),
  };
}

/** Traduce errores del SDK a un tipo (para el registro) y un mensaje humano (para el usuario). */
export function translateError(error: unknown): { kind: string; message: string } {
  // Orden: de lo más específico a lo más general (APIConnectionError hereda de APIError).
  if (error instanceof Anthropic.AuthenticationError) {
    return {
      kind: "authentication_error (401)",
      message: "La clave de la IA no es válida o fue revocada. Hay que revisar la configuración del servidor.",
    };
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return {
      kind: "permission_error (403)",
      message: "La clave de la IA no tiene permiso para usar este modelo. Hay que revisar la configuración del servidor.",
    };
  }
  if (error instanceof Anthropic.NotFoundError) {
    return {
      kind: "not_found_error (404)",
      message: "El modelo de IA configurado no existe o no está disponible. Hay que revisar ANTHROPIC_MODEL.",
    };
  }
  if (error instanceof Anthropic.RateLimitError) {
    return {
      kind: "rate_limit_error (429)",
      message: "Llegamos al límite de uso de la IA por ahora. Espera un minuto e inténtalo de nuevo.",
    };
  }
  if (error instanceof Anthropic.InternalServerError) {
    return {
      kind: `${error.type ?? "api_error"} (${error.status})`,
      message: "El servicio de IA está saturado o caído en este momento. Inténtalo de nuevo en unos minutos.",
    };
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return {
      kind: "timeout",
      message: "La IA tardó demasiado en responder. Inténtalo de nuevo en unos segundos.",
    };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return {
      kind: "connection_error",
      message: "No pudimos conectar con el servicio de IA. Revisa la conexión a internet del servidor e inténtalo de nuevo.",
    };
  }
  if (error instanceof Anthropic.APIError) {
    return {
      kind: `${error.type ?? "api_error"} (${error.status ?? "sin estado"})`,
      message: "La IA no pudo procesar esta petición. Inténtalo de nuevo.",
    };
  }
  if (error instanceof Anthropic.AnthropicError) {
    // p. ej. la salida estructurada no cumplió el esquema al validarla en el SDK.
    return {
      kind: "structured_output_parse_error",
      message: "La IA respondió en un formato inesperado. Inténtalo de nuevo.",
    };
  }
  return { kind: "unknown_error", message: "Algo falló al hablar con la IA. Inténtalo de nuevo." };
}

function describe(error: unknown): string {
  if (error instanceof Anthropic.APIError && error.requestID) return `request-id ${error.requestID}`;
  return error instanceof Error ? error.message : String(error);
}
