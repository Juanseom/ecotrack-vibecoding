import { calculate } from "@/lib/emissions/calculate";
import { formatKg } from "@/lib/format";
import { InterpreterError, type ExplainContext, type Interpreter } from "@/lib/interpreters";
import { ExtractionSchema, type Extraction } from "@/lib/schemas";
import type { AnalysisResult, StageId, StreamEvent, ValidationIssue } from "@/lib/types";
import { ruleCheck } from "@/lib/validation/rules";

/**
 * Orquesta las 4 etapas y emite un `StreamEvent` por cada avance:
 * Interpretar → Validar → Calcular → Explicar → resultado.
 * El intérprete (demo o IA) extrae y explica; el cálculo es siempre del motor determinista.
 */
export async function* runPipeline(
  text: string,
  interpreter: Interpreter,
): AsyncGenerator<StreamEvent> {
  const input = text.trim();
  let current: StageId = "extract";

  try {
    // 1 · Interpretar
    yield { type: "stage", stage: "extract", status: "running", detail: "Leyendo tu texto y separando cada consumo…" };
    const extraction = await fromInterpreter(interpreter, async () =>
      checkExtraction(await interpreter.extract(input)),
    );
    const found = extraction.items.length;

    if (found === 0) {
      yield { type: "stage", stage: "extract", status: "done", detail: "No encontré consumos en tu texto" };
      for (const stage of ["validate", "calculate", "explain"] as const) {
        yield { type: "stage", stage, status: "skipped" };
      }
      yield {
        type: "error",
        code: "no_data",
        message:
          "No encontramos consumos en tu texto. Prueba con algo como «gastamos 200 kWh de luz» o «2 motos hicieron 40 km cada una».",
      };
      return;
    }
    yield {
      type: "stage",
      stage: "extract",
      status: "done",
      detail: `Encontré ${found} ${found === 1 ? "consumo" : "consumos"}`,
    };

    // 2 · Validar
    current = "validate";
    yield { type: "stage", stage: "validate", status: "running", detail: "Revisando que las cantidades y unidades cuadren…" };
    const review = await fromInterpreter(interpreter, () => interpreter.review(input, extraction));
    const issues = dedupe([...ruleCheck(extraction.items, input), ...review.issues]);
    const warnings = issues.filter((issue) => issue.severity === "warning").length;
    yield {
      type: "stage",
      stage: "validate",
      status: "done",
      detail: warnings === 0 ? "Todo cuadra" : `${warnings} ${warnings === 1 ? "dato por revisar" : "datos por revisar"}`,
    };

    // 3 · Calcular
    current = "calculate";
    yield { type: "stage", stage: "calculate", status: "running", detail: "Multiplicando cada consumo por su factor…" };
    const calc = calculate(extraction.items);
    yield { type: "stage", stage: "calculate", status: "done", detail: `≈ ${formatKg(calc.totalKg)} kg CO₂e` };

    // 4 · Explicar (análisis y recomendaciones en paralelo)
    current = "explain";
    yield { type: "stage", stage: "explain", status: "running", detail: "Escribiendo la lectura y las recomendaciones…" };
    const ctx: ExplainContext = {
      text: input,
      lines: calc.lines,
      unquantified: calc.unquantified,
      totalKg: calc.totalKg,
      byCategory: calc.byCategory,
      issues,
    };
    const [analysis, recommendations] = await fromInterpreter(interpreter, () =>
      Promise.all([interpreter.explain(ctx), interpreter.recommend(ctx)]),
    );
    yield { type: "stage", stage: "explain", status: "done", detail: "Listo" };

    const result: AnalysisResult = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      input,
      mode: interpreter.mode,
      ...(interpreter.model ? { model: interpreter.model } : {}),
      lines: calc.lines,
      unquantified: calc.unquantified,
      totalKg: calc.totalKg,
      byCategory: calc.byCategory,
      equivalences: calc.equivalences,
      validation: {
        status: warnings > 0 ? "warnings" : "ok",
        issues,
        clarifyingQuestion: review.clarifyingQuestion,
      },
      analysis,
      recommendations,
    };
    yield { type: "result", data: result };
  } catch (error) {
    // Nunca exponemos trazas al cliente: se registran en el servidor.
    console.error(`[pipeline] Falló la etapa "${current}":`, error);
    yield { type: "stage", stage: current, status: "error" };
    yield error instanceof InterpreterError
      ? {
          type: "error",
          code: "ai_error",
          message: "Eco no pudo interpretar tu texto esta vez. Inténtalo de nuevo en unos segundos.",
        }
      : {
          type: "error",
          code: "internal",
          message: "Algo falló de nuestro lado mientras calculábamos. Inténtalo de nuevo.",
        };
  }
}

/**
 * Ejecuta una llamada al intérprete. Si el intérprete es la IA, cualquier fallo se
 * reporta como `ai_error` (el usuario puede reintentar o pasar al modo demo).
 */
async function fromInterpreter<T>(interpreter: Interpreter, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (interpreter.mode === "ai" && !(error instanceof InterpreterError)) {
      throw new InterpreterError("Falló el intérprete de IA", { cause: error });
    }
    throw error;
  }
}

/** La extracción debe cumplir el esquema; si no, es un fallo del intérprete. */
function checkExtraction(extraction: Extraction): Extraction {
  const parsed = ExtractionSchema.safeParse(extraction);
  if (!parsed.success) {
    throw new InterpreterError("La extracción no cumple el esquema", { cause: parsed.error });
  }
  return parsed.data;
}

function dedupe(issues: ValidationIssue[]): ValidationIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    if (seen.has(issue.message)) return false;
    seen.add(issue.message);
    return true;
  });
}
