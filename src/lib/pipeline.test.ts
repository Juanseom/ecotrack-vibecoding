import { afterEach, describe, expect, it, vi } from "vitest";

import { demoInterpreter } from "@/lib/interpreters/demo";
import { InterpreterError, type Interpreter } from "@/lib/interpreters/types";
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

  // ───────────────────────── Regresiones · iteración 6 ─────────────────────────

  it("regresión F1: una cantidad negativa del intérprete de IA nunca se calcula y se avisa", async () => {
    const text = "Consumimos -50 kWh de electricidad.";
    const ai: Interpreter = {
      ...demoInterpreter,
      mode: "ai",
      model: "prueba",
      async extract() {
        return {
          items: [
            {
              activity: "electricity_grid",
              label: "Electricidad",
              quantity: -50,
              unit: "kWh",
              vehicle_count: null,
              per_vehicle: null,
              source_quote: "-50 kWh de electricidad",
              notes: null,
            },
          ],
          ignored: [],
        };
      },
      async review() {
        return { issues: [], clarifyingQuestion: null, discard: [] };
      },
    };
    const last = (await collect(text, ai)).at(-1);
    expect(last?.type).toBe("result");
    if (last?.type !== "result") return;
    expect(last.data.lines).toEqual([]);
    expect(last.data.totalKg).toBe(0);
    expect(last.data.unquantified).toEqual([
      expect.objectContaining({ quote: "-50 kWh de electricidad", reason: expect.stringMatching(/negativ/) }),
    ]);
    expect(last.data.validation.status).toBe("warnings");
    expect(last.data.validation.issues).toContainEqual(
      expect.objectContaining({ severity: "warning", message: expect.stringMatching(/negativa/) }),
    );
  });

  it("regresión F1: el caso reportado en modo demo va a «No cuantificado» con la cita completa", async () => {
    const last = (await collect("Consumimos -50 kWh de electricidad.")).at(-1);
    if (last?.type !== "result") throw new Error(`se esperaba result, llegó ${last?.type}`);
    expect(last.data.lines).toEqual([]);
    expect(last.data.unquantified[0]).toMatchObject({ quote: "-50 kWh de electricidad" });
    expect(last.data.validation.clarifyingQuestion).toMatch(/-50 kWh/);
  });

  it("regresión H1: el primer evento del stream dice quién interpreta (demo o IA)", async () => {
    const demoEvents = await collect("Gastamos 200 kWh de luz");
    expect(demoEvents[0]).toMatchObject({ type: "stage", stage: "extract", status: "running", mode: "demo" });
    // Sólo el primero: el resto de eventos no cambia.
    expect(demoEvents.slice(1).some((e) => "mode" in e)).toBe(false);

    const noData = await collect("hola, ¿cómo estás?");
    expect(noData[0]).toMatchObject({ mode: "demo" });

    vi.spyOn(console, "error").mockImplementation(() => {});
    const ai: Interpreter = {
      ...demoInterpreter,
      mode: "ai",
      async extract() {
        throw new InterpreterError("La IA tardó demasiado en responder.");
      },
    };
    expect((await collect("Gastamos 200 kWh de luz", ai))[0]).toMatchObject({ mode: "ai" });
  });

  it("regresión UI-2: ai_error lleva retryable (false para configuración, true para lo pasajero)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = (error: Error): Interpreter => ({
      ...demoInterpreter,
      mode: "ai",
      async extract() {
        throw error;
      },
    });
    const config = (await collect("200 kWh", failing(new InterpreterError("La clave de la IA no es válida.", { retryable: false })))).at(-1);
    expect(config).toEqual({ type: "error", code: "ai_error", message: "La clave de la IA no es válida.", retryable: false });

    const transient = (await collect("200 kWh", failing(new InterpreterError("La IA tardó demasiado.")))).at(-1);
    expect(transient).toMatchObject({ code: "ai_error", retryable: true });

    // Un fallo inesperado del intérprete de IA se trata como pasajero.
    const unknown = (await collect("200 kWh", failing(new Error("socket hang up")))).at(-1);
    expect(unknown).toMatchObject({ code: "ai_error", retryable: true });
  });
});
