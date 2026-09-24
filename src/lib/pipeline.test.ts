import { afterEach, describe, expect, it, vi } from "vitest";

import { demoInterpreter } from "@/lib/interpreters/demo";
import type { Interpreter } from "@/lib/interpreters/types";
import { runPipeline } from "@/lib/pipeline";
import type { StreamEvent } from "@/lib/types";

async function collect(text: string, interpreter: Interpreter = demoInterpreter) {
  const events: StreamEvent[] = [];
  for await (const event of runPipeline(text, interpreter)) events.push(event);
  return events;
}

const stageTrail = (events: StreamEvent[]) =>
  events.filter((e) => e.type === "stage").map((e) => `${e.stage}:${e.status}`);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runPipeline", () => {
  it("recorre las 4 etapas y termina con un AnalysisResult completo", async () => {
    const text = "Hoy usamos 5 camionetas de reparto durante 8 horas y gastamos 200 kWh de luz.";
    const events = await collect(text);

    expect(stageTrail(events)).toEqual([
      "extract:running",
      "extract:done",
      "validate:running",
      "validate:done",
      "calculate:running",
      "calculate:done",
      "explain:running",
      "explain:done",
    ]);
    expect(events[1]).toMatchObject({ detail: "Encontré 2 consumos" });

    const last = events.at(-1);
    expect(last?.type).toBe("result");
    if (last?.type !== "result") return;
    const result = last.data;
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.mode).toBe("demo");
    expect(result.input).toBe(text);
    expect(result.totalKg).toBeCloseTo(290);
    expect(result.lines).toHaveLength(2);
    expect(result.validation.status).toBe("ok");
    expect(result.validation.clarifyingQuestion).toBeTruthy();
    expect(result.recommendations).toHaveLength(3);
    expect(result.analysis.headline).toMatch(/69 %/);
  });

  it("texto sin datos → error no_data con etapas omitidas", async () => {
    const events = await collect("hola, ¿cómo estás?");
    expect(stageTrail(events)).toEqual([
      "extract:running",
      "extract:done",
      "validate:skipped",
      "calculate:skipped",
      "explain:skipped",
    ]);
    expect(events.at(-1)).toMatchObject({ type: "error", code: "no_data" });
  });

  it("una excepción marca la etapa en curso como error y emite internal sin trazas", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken: Interpreter = {
      ...demoInterpreter,
      async review() {
        throw new Error("boom: detalle interno");
      },
    };
    const events = await collect("Gastamos 200 kWh de luz", broken);
    expect(events.at(-2)).toEqual({ type: "stage", stage: "validate", status: "error" });
    const last = events.at(-1);
    expect(last).toMatchObject({ type: "error", code: "internal" });
    expect(JSON.stringify(last)).not.toMatch(/boom/);
    expect(console.error).toHaveBeenCalled();
  });

  it("un fallo del intérprete de IA se reporta como ai_error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const ai: Interpreter = {
      ...demoInterpreter,
      mode: "ai",
      model: "prueba",
      async extract() {
        throw new Error("timeout");
      },
    };
    const events = await collect("Gastamos 200 kWh de luz", ai);
    expect(events.at(-2)).toEqual({ type: "stage", stage: "extract", status: "error" });
    expect(events.at(-1)).toMatchObject({ type: "error", code: "ai_error" });
  });

  it("una extracción que no cumple el esquema es un ai_error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bad: Interpreter = {
      ...demoInterpreter,
      async extract() {
        return { items: [{ activity: "nuclear" }], ignored: [] } as never;
      },
    };
    const events = await collect("Gastamos 200 kWh de luz", bad);
    expect(events.at(-1)).toMatchObject({ type: "error", code: "ai_error" });
  });
});
