import { describe, expect, it } from "vitest";

import {
  pipelineForResult,
  pipelineHeadline,
  pipelineReducer,
  STAGE_ORDER,
  stageSubtitle,
  startPipeline,
  type PipelineState,
} from "@/lib/client/pipeline-state";
import { sampleResult } from "@/lib/fixtures/sample-result";
import type { StreamEvent } from "@/lib/types";

/** Aplica una secuencia de eventos del stream, como hace EcoTrackApp. */
function play(events: StreamEvent[], state: PipelineState = startPipeline()): PipelineState {
  return events.reduce(pipelineReducer, state);
}

const statuses = (state: PipelineState) => STAGE_ORDER.map((id) => `${id}:${state.stages[id].status}`);

const NO_DATA: StreamEvent[] = [
  { type: "stage", stage: "extract", status: "running", detail: "Leyendo…", mode: "demo" },
  { type: "stage", stage: "extract", status: "done", detail: "No encontré consumos en tu texto" },
  { type: "stage", stage: "validate", status: "skipped" },
  { type: "stage", stage: "calculate", status: "skipped" },
  { type: "stage", stage: "explain", status: "skipped" },
  { type: "error", code: "no_data", message: "No encontramos consumos en tu texto." },
];

const FULL_RUN: StreamEvent[] = [
  { type: "stage", stage: "extract", status: "running", detail: "Leyendo…", mode: "demo" },
  ...(["extract", "validate", "calculate", "explain"] as const).flatMap((stage, i) => [
    ...(i === 0 ? [] : [{ type: "stage", stage, status: "running" } as StreamEvent]),
    { type: "stage", stage, status: "done" } as StreamEvent,
  ]),
  { type: "result", data: { ...sampleResult, mode: "demo" } },
];

describe("regresión UI-1 · el encabezado refleja el desenlace real", () => {
  it("no_data: nunca dice «Listo» ni promete un recibo", () => {
    const state = play(NO_DATA);
    expect(statuses(state)).toEqual(["extract:done", "validate:skipped", "calculate:skipped", "explain:skipped"]);
    const headline = pipelineHeadline(state);
    expect(headline).not.toMatch(/Listo/);
    expect(headline).toMatch(/no hay recibo/);
  });

  it("cualquier error: nunca «Listo»", () => {
    for (const code of ["ai_error", "internal", "network", "bad_request", "empty_input"] as const) {
      const state = play([{ type: "error", code, message: "x" }]);
      expect(pipelineHeadline(state)).not.toMatch(/Listo/);
    }
  });

  it("con resultado sí dice «Listo. Aquí tienes tu recibo.»", () => {
    expect(pipelineHeadline(play(FULL_RUN))).toBe("Listo. Aquí tienes tu recibo.");
  });

  it("mientras una etapa corre, muestra su detalle", () => {
    expect(pipelineHeadline(play(FULL_RUN.slice(0, 1)))).toBe("Leyendo…");
  });

  it("un recibo reabierto del historial muestra las etapas listas y «Listo»", () => {
    const state = pipelineForResult(sampleResult);
    expect(statuses(state).every((s) => s.endsWith(":done"))).toBe(true);
    expect(pipelineHeadline(state)).toBe("Listo. Aquí tienes tu recibo.");
  });
});

describe("regresión UI-3 · un error marca la etapa activa (o la primera)", () => {
  it("sin red antes de cualquier evento: «Interpretar» queda en error, no pendiente", () => {
    const state = play([{ type: "error", code: "network", message: "No pudimos conectar." }]);
    expect(statuses(state)).toEqual(["extract:error", "validate:pending", "calculate:pending", "explain:pending"]);
  });

  it("corte a mitad de una etapa: esa etapa queda en error", () => {
    const state = play([
      { type: "stage", stage: "extract", status: "running", mode: "demo" },
      { type: "stage", stage: "extract", status: "done" },
      { type: "stage", stage: "validate", status: "running" },
      { type: "error", code: "network", message: "Se cortó la conexión mientras calculábamos." },
    ]);
    expect(statuses(state)).toEqual(["extract:done", "validate:error", "calculate:pending", "explain:pending"]);
  });

  it("corte entre dos etapas: la siguiente pendiente queda en error", () => {
    const state = play([
      { type: "stage", stage: "extract", status: "running" },
      { type: "stage", stage: "extract", status: "done" },
      { type: "error", code: "internal", message: "La respuesta terminó antes de tiempo." },
    ]);
    expect(statuses(state)).toEqual(["extract:done", "validate:error", "calculate:pending", "explain:pending"]);
  });

  it("si el servidor ya marcó la etapa con error, no marca otra", () => {
    const state = play([
      { type: "stage", stage: "extract", status: "running", mode: "ai" },
      { type: "stage", stage: "extract", status: "error" },
      { type: "error", code: "ai_error", message: "La clave…", retryable: false },
    ]);
    expect(statuses(state)).toEqual(["extract:error", "validate:pending", "calculate:pending", "explain:pending"]);
  });
});

describe("regresión H1 · el pipeline no atribuye a la IA lo que hace el parser", () => {
  it("antes de saber el modo, el subtítulo es neutral", () => {
    const subtitle = stageSubtitle("extract", startPipeline());
    expect(subtitle).toBe("Eco lee tu texto");
    expect(subtitle).not.toMatch(/\bIA\b/);
  });

  it("modo demo (del primer evento): «Eco lee tu texto (reglas)»", () => {
    const state = play(FULL_RUN.slice(0, 1));
    expect(state.mode).toBe("demo");
    expect(stageSubtitle("extract", state)).toBe("Eco lee tu texto (reglas)");
    for (const id of STAGE_ORDER) expect(stageSubtitle(id, state)).not.toMatch(/\bIA\b/);
  });

  it("modo demo también sin evento con modo: lo toma del resultado o del historial", () => {
    const fromResult = play([{ type: "result", data: { ...sampleResult, mode: "demo" } }]);
    expect(stageSubtitle("extract", fromResult)).toBe("Eco lee tu texto (reglas)");
    const fromHistory = pipelineForResult({ ...sampleResult, mode: "demo" });
    expect(stageSubtitle("extract", fromHistory)).toBe("Eco lee tu texto (reglas)");
  });

  it("modo IA: se mantiene «La IA lee tu texto»", () => {
    const state = play([{ type: "stage", stage: "extract", status: "running", mode: "ai" }]);
    expect(stageSubtitle("extract", state)).toBe("La IA lee tu texto");
  });

  it("etapas omitidas o con error cambian el subtítulo", () => {
    const state = play(NO_DATA);
    expect(stageSubtitle("validate", state)).toBe("Omitida");
    const failed = play([{ type: "error", code: "network", message: "x" }]);
    expect(stageSubtitle("extract", failed)).toBe("No se pudo completar");
  });
});
