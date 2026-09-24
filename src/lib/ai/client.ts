import Anthropic from "@anthropic-ai/sdk";

/**
 * Configuración y cliente de Claude. SÓLO SERVIDOR: la clave nunca debe llegar al navegador.
 * No importes nada de src/lib/ai/ desde componentes de cliente ("use client").
 */

export const DEFAULT_MODEL = "claude-opus-5";
export const EFFORTS = ["low", "medium", "high"] as const;
export type Effort = (typeof EFFORTS)[number];
export const DEFAULT_EFFORT: Effort = "low";

/** 30 s por intento y 1 reintento (el SDK reintenta 408/409/429/5xx y errores de conexión). */
export const REQUEST_TIMEOUT_MS = 30_000;
export const MAX_RETRIES = 1;

export interface AiConfig {
  apiKey: string;
  model: string;
  effort: Effort;
}

type Env = Record<string, string | undefined>;

/** Lee la configuración de IA del entorno. Sin `ANTHROPIC_API_KEY` devuelve null (→ modo demo). */
export function readAiConfig(env: Env = process.env): AiConfig | null {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  const model = env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const rawEffort = env.ANTHROPIC_EFFORT?.trim().toLowerCase();
  const effort = EFFORTS.find((value) => value === rawEffort) ?? DEFAULT_EFFORT;
  if (rawEffort && effort !== rawEffort) {
    console.warn(`[ai] ANTHROPIC_EFFORT="${rawEffort}" no es válido (low|medium|high); uso "${DEFAULT_EFFORT}".`);
  }
  return { apiKey, model, effort };
}

let cached: { apiKey: string; client: Anthropic } | null = null;

/** Cliente de Anthropic reutilizable entre peticiones (se recrea si cambia la clave). */
export function getAnthropicClient(apiKey: string): Anthropic {
  if (cached?.apiKey !== apiKey) {
    cached = {
      apiKey,
      client: new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES }),
    };
  }
  return cached.client;
}
