import type { AnalysisResult, StageId, StageStatus, StreamEvent } from "@/lib/types";

/**
 * Estado del indicador de pipeline en el cliente, como un reductor puro sobre los
 * `StreamEvent`. Guarda el desenlace (para no decir "Listo" si hubo error) y quién
 * interpreta el texto (para no atribuirle a la IA lo que hace el parser por reglas).
 */

export type StageState = { status: StageStatus; detail?: string };
export type PipelineStages = Record<StageId, StageState>;
export type InterpreterMode = AnalysisResult["mode"];
type ErrorEvent = Extract<StreamEvent, { type: "error" }>;

export interface PipelineState {
  stages: PipelineStages;
  /** `null` mientras el servidor no haya dicho quién interpreta. */
  mode: InterpreterMode | null;
  outcome: "running" | "result" | "error";
  errorCode: ErrorEvent["code"] | null;
}

export const STAGE_ORDER: StageId[] = ["extract", "validate", "calculate", "explain"];

export const STAGE_TITLES: Record<StageId, string> = {
  extract: "Interpretar",
  validate: "Validar",
  calculate: "Calcular",
  explain: "Explicar",
};

const SUBTITLES: Record<Exclude<StageId, "extract">, string> = {
  validate: "Revisa que todo cuadre",
  calculate: "Factores × cantidades",
  explain: "Te lo cuenta en simple",
};

const EXTRACT_SUBTITLE: Record<InterpreterMode | "unknown", string> = {
  ai: "La IA lee tu texto",
  demo: "Eco lee tu texto (reglas)",
  unknown: "Eco lee tu texto",
};

export function initialStages(status: StageStatus = "pending"): PipelineStages {
  return {
    extract: { status },
    validate: { status },
    calculate: { status },
    explain: { status },
  };
}

/** Un análisis nuevo: todo pendiente, modo aún desconocido. */
export function startPipeline(): PipelineState {
  return { stages: initialStages(), mode: null, outcome: "running", errorCode: null };
}

/** Un recibo ya terminado (p. ej. reabierto del historial). */
export function pipelineForResult(result: Pick<AnalysisResult, "mode">): PipelineState {
  return { stages: initialStages("done"), mode: result.mode, outcome: "result", errorCode: null };
}

export function pipelineReducer(state: PipelineState, event: StreamEvent): PipelineState {
  switch (event.type) {
    case "stage":
      return {
        ...state,
        mode: event.mode ?? state.mode,
        stages: { ...state.stages, [event.stage]: { status: event.status, detail: event.detail } },
      };
    case "result":
      return { ...state, mode: event.data.mode, outcome: "result", errorCode: null };
    case "error":
      return { ...state, outcome: "error", errorCode: event.code, stages: markErrorStage(state.stages) };
  }
}

/**
 * Al fallar, la etapa que estaba en curso queda en error. Si ninguna estaba en curso
 * (p. ej. sin red: el error llega antes del primer evento), queda en error la primera
 * pendiente, que es la que tocaba. Si el servidor ya marcó una etapa con error, o todas
 * terminaron (`no_data`: hecho + omitidas), no se toca nada.
 */
function markErrorStage(stages: PipelineStages): PipelineStages {
  if (STAGE_ORDER.some((id) => stages[id].status === "error")) return stages;
  const next = { ...stages };
  const running = STAGE_ORDER.filter((id) => stages[id].status === "running");
  if (running.length > 0) {
    for (const id of running) next[id] = { status: "error" };
    return next;
  }
  const firstPending = STAGE_ORDER.find((id) => stages[id].status === "pending");
  if (firstPending) next[firstPending] = { status: "error" };
  return next;
}

/** Texto del encabezado (región `aria-live`): refleja el desenlace real. */
export function pipelineHeadline(state: PipelineState): string {
  const running = STAGE_ORDER.find((id) => state.stages[id].status === "running");
  if (running) return state.stages[running].detail ?? `${STAGE_TITLES[running]}…`;
  if (state.outcome === "error") {
    return state.errorCode === "no_data"
      ? "Terminé de leer, pero no encontré consumos: esta vez no hay recibo."
      : "Me detuve antes de terminar: esta vez no hay recibo.";
  }
  if (state.outcome === "result") return "Listo. Aquí tienes tu recibo.";
  return "";
}

/** Subtítulo de cada etapa. "Interpretar" dice quién lee el texto sólo cuando se sabe. */
export function stageSubtitle(stage: StageId, state: PipelineState): string {
  const { status } = state.stages[stage];
  if (status === "skipped") return "Omitida";
  if (status === "error") return "No se pudo completar";
  return stage === "extract" ? EXTRACT_SUBTITLE[state.mode ?? "unknown"] : SUBTITLES[stage];
}
