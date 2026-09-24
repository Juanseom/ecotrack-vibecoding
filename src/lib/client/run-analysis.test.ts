import { describe, expect, it } from "vitest";

import { runAnalysis } from "@/lib/client/run-analysis";
import type { StreamEvent } from "@/lib/types";

describe("runAnalysis (simulado)", () => {
  it("recorre las 4 etapas en orden y termina con un resultado", async () => {
    const events: StreamEvent[] = [];
    await runAnalysis("Hoy gastamos 200 kWh de luz", (e) => events.push(e), { stageDelayMs: 0 });

    const stages = events.filter((e) => e.type === "stage").map((e) => `${e.stage}:${e.status}`);
    expect(stages).toEqual([
      "extract:running",
      "extract:done",
      "validate:running",
      "validate:done",
      "calculate:running",
      "calculate:done",
      "explain:running",
      "explain:done",
    ]);
    const last = events.at(-1);
    expect(last?.type).toBe("result");
  });

  it("rechaza el texto vacío con un error empty_input", async () => {
    const events: StreamEvent[] = [];
    await runAnalysis("   ", (e) => events.push(e));
    expect(events).toEqual([expect.objectContaining({ type: "error", code: "empty_input" })]);
  });

  it("se detiene en silencio si se cancela", async () => {
    const events: StreamEvent[] = [];
    const controller = new AbortController();
    const run = runAnalysis("200 kWh", (e) => events.push(e), {
      signal: controller.signal,
      stageDelayMs: 50,
    });
    controller.abort();
    await run;
    expect(events.some((e) => e.type === "result" || e.type === "error")).toBe(false);
  });
});
