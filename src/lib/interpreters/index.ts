import { demoInterpreter } from "@/lib/interpreters/demo";
import type { Interpreter } from "@/lib/interpreters/types";
import type { AnalysisMode } from "@/lib/schemas";

export type { ExplainContext, Interpreter, ReviewResult } from "@/lib/interpreters/types";
export { InterpreterError } from "@/lib/interpreters/types";

/**
 * Elige el intérprete para una petición.
 * - `"demo"`: siempre el intérprete por reglas (lo pide la UI con "Probar en modo demo").
 * - `"auto"` (por defecto): la IA si está configurada; si no, el modo demo.
 */
export function getInterpreter(mode: AnalysisMode = "auto"): Interpreter {
  if (mode === "demo") return demoInterpreter;
  // Iteración 4: intérprete Claude
  // if (process.env.ANTHROPIC_API_KEY) return createClaudeInterpreter({ model: process.env.ANTHROPIC_MODEL });
  return demoInterpreter;
}
