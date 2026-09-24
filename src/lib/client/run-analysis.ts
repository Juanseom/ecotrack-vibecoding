import { sampleResult } from "@/lib/fixtures/sample-result";
import type { AnalysisResult, StageId, StreamEvent } from "@/lib/types";

/**
 * Punto único de entrada del análisis en el cliente.
 *
 * Iteración 2: SIMULA el pipeline con temporizadores y devuelve el fixture.
 * Iteración 3: hará `fetch("/api/analyze")` y leerá NDJSON (un StreamEvent por línea),
 * llamando a `onEvent` por cada evento. La firma no cambia.
 */
export type AnalysisEventHandler = (event: StreamEvent) => void;

export interface RunAnalysisOptions {
  signal?: AbortSignal;
  /** Duración simulada de cada etapa (ms). */
  stageDelayMs?: number;
}

export const MAX_INPUT_LENGTH = 1000;

const SIMULATED_STAGES: { stage: StageId; detail: string }[] = [
  { stage: "extract", detail: "Leyendo tu texto y separando cada consumo…" },
  { stage: "validate", detail: "Revisando que las cantidades y unidades cuadren…" },
  { stage: "calculate", detail: "Multiplicando cada consumo por su factor…" },
  { stage: "explain", detail: "Escribiendo la lectura y las recomendaciones…" },
];

export async function runAnalysis(
  text: string,
  onEvent: AnalysisEventHandler,
  { signal, stageDelayMs = 600 }: RunAnalysisOptions = {},
): Promise<void> {
  const input = text.trim();
  if (!input) {
    onEvent({
      type: "error",
      code: "empty_input",
      message: "Escribe algo sobre tu día para poder calcular tu huella.",
    });
    return;
  }

  try {
    for (const { stage, detail } of SIMULATED_STAGES) {
      onEvent({ type: "stage", stage, status: "running", detail });
      await wait(stageDelayMs, signal);
      onEvent({ type: "stage", stage, status: "done" });
    }
    onEvent({ type: "result", data: simulatedResult() });
  } catch (error) {
    if (isAbortError(error)) return; // cancelado por el usuario o por un nuevo envío
    onEvent({
      type: "error",
      code: "internal",
      message: "Algo falló de nuestro lado.",
    });
  }
}

/** El fixture con id y fecha nuevos (la cita del recibo sigue siendo la del ejemplo). */
function simulatedResult(): AnalysisResult {
  return { ...sampleResult, id: newId(), createdAt: new Date().toISOString() };
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function abortError(): Error {
  const error = new Error("Análisis cancelado");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
