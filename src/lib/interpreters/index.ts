import { getAnthropicClient, readAiConfig } from "@/lib/ai/client";
import { ClaudeInterpreter } from "@/lib/interpreters/claude";
import { demoInterpreter } from "@/lib/interpreters/demo";
import type { Interpreter } from "@/lib/interpreters/types";
import type { AnalysisMode } from "@/lib/schemas";

export type { ExplainContext, Interpreter, ReviewResult } from "@/lib/interpreters/types";
export { InterpreterError } from "@/lib/interpreters/types";

/**
 * Elige el intérprete para una petición (SÓLO SERVIDOR).
 * - `"demo"`: siempre el intérprete por reglas (lo pide la UI con "Probar en modo demo").
 * - `"auto"` (por defecto): Claude si hay `ANTHROPIC_API_KEY`; si no, el modo demo.
 */
export function getInterpreter(
  mode: AnalysisMode = "auto",
  env: Record<string, string | undefined> = process.env,
): Interpreter {
  if (mode === "demo") return demoInterpreter;
  const config = readAiConfig(env);
  if (!config) return demoInterpreter;
  return new ClaudeInterpreter({
    client: getAnthropicClient(config.apiKey),
    model: config.model,
    effort: config.effort,
  });
}
