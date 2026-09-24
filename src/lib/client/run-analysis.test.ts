import { afterEach, describe, expect, it, vi } from "vitest";

import { runAnalysis } from "@/lib/client/run-analysis";
import { sampleResult } from "@/lib/fixtures/sample-result";
import type { StreamEvent } from "@/lib/types";

const STAGE_EVENTS: StreamEvent[] = [
  { type: "stage", stage: "extract", status: "running" },
  { type: "stage", stage: "extract", status: "done", detail: "Encontré 2 consumos" },
  { type: "stage", stage: "validate", status: "running" },
  { type: "stage", stage: "validate", status: "done" },
  { type: "stage", stage: "calculate", status: "running" },
  { type: "stage", stage: "calculate", status: "done" },
  { type: "stage", stage: "explain", status: "running" },
  { type: "stage", stage: "explain", status: "done" },
];

/** Respuesta NDJSON cuyo cuerpo llega en los fragmentos dados (para probar líneas partidas). */
function ndjsonResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}

function mockFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runAnalysis", () => {
  it("envía el texto y el modo, y emite cada evento del NDJSON en orden (con líneas partidas)", async () => {
    const events: StreamEvent[] = [...STAGE_EVENTS, { type: "result", data: sampleResult }];
    const body = events.map((e) => `${JSON.stringify(e)}\n`).join("");
    // Parte el cuerpo en fragmentos de 37 bytes para que las líneas lleguen cortadas.
    const chunks = body.match(/[\s\S]{1,37}/g) ?? [];
    const fetchMock = mockFetch(async () => ndjsonResponse(chunks));

    const received: StreamEvent[] = [];
    await runAnalysis("  Hoy gastamos 200 kWh de luz  ", (e) => received.push(e), { mode: "demo" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/analyze");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ text: "Hoy gastamos 200 kWh de luz", mode: "demo" });

    expect(received).toEqual(events);
  });

  it("procesa la última línea aunque no termine en salto de línea", async () => {
    mockFetch(async () =>
      ndjsonResponse([JSON.stringify({ type: "result", data: sampleResult })]),
    );
    const received: StreamEvent[] = [];
    await runAnalysis("200 kWh", (e) => received.push(e));
    expect(received).toEqual([{ type: "result", data: sampleResult }]);
  });

  it("rechaza el texto vacío con un error empty_input sin llamar a la API", async () => {
    const fetchMock = mockFetch(async () => ndjsonResponse([]));
    const received: StreamEvent[] = [];
    await runAnalysis("   ", (e) => received.push(e));
    expect(received).toEqual([expect.objectContaining({ type: "error", code: "empty_input" })]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("un fallo de red (TypeError de fetch) se reporta como error network", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    const received: StreamEvent[] = [];
    await runAnalysis("200 kWh", (e) => received.push(e));
    expect(received).toEqual([
      { type: "error", code: "network", message: expect.stringMatching(/No pudimos conectar/) },
    ]);
  });

  it("reenvía el evento de error de una respuesta no-OK con cuerpo JSON", async () => {
    const error: StreamEvent = { type: "error", code: "empty_input", message: "Escribe algo." };
    mockFetch(async () => Response.json(error, { status: 400 }));
    const received: StreamEvent[] = [];
    await runAnalysis("hola", (e) => received.push(e));
    expect(received).toEqual([error]);
  });

  it("respuesta no-OK sin JSON → error genérico según el estado", async () => {
    mockFetch(async () => new Response("Bad gateway", { status: 502 }));
    const received: StreamEvent[] = [];
    await runAnalysis("hola", (e) => received.push(e));
    expect(received).toEqual([expect.objectContaining({ type: "error", code: "internal" })]);
  });

  it("si el stream termina sin resultado ni error, avisa con un error", async () => {
    mockFetch(async () => ndjsonResponse([`${JSON.stringify(STAGE_EVENTS[0])}\n`]));
    const received: StreamEvent[] = [];
    await runAnalysis("200 kWh", (e) => received.push(e));
    expect(received.at(-1)).toMatchObject({ type: "error", code: "internal" });
  });

  it("se detiene en silencio si se cancela", async () => {
    mockFetch(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("The operation was aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );
    const controller = new AbortController();
    const received: StreamEvent[] = [];
    const run = runAnalysis("200 kWh", (e) => received.push(e), { signal: controller.signal });
    controller.abort();
    await run;
    expect(received).toEqual([]);
  });
});
