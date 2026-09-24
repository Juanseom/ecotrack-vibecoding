import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/analyze/route";
import type { StreamEvent } from "@/lib/types";

function post(body: unknown, raw = false): Promise<Response> {
  return POST(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw ? String(body) : JSON.stringify(body),
    }),
  );
}

async function readNdjson(response: Response): Promise<StreamEvent[]> {
  const text = await response.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StreamEvent);
}

// Sin clave: la ruta debe usar el modo demo y no llamar nunca a la API real.
beforeAll(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "");
});
afterAll(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/analyze", () => {
  it("responde NDJSON en streaming con las etapas y el resultado", async () => {
    const response = await post({ text: "Dos motos hicieron 120 km cada una y el local consumió 80 kWh." });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/x-ndjson; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-store");

    const events = await readNdjson(response);
    const last = events.at(-1);
    expect(last?.type).toBe("result");
    if (last?.type === "result") expect(last.data.totalKg).toBeCloseTo(62.4);
  });

  it("texto vacío → 400 empty_input", async () => {
    const response = await post({ text: "   " });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ type: "error", code: "empty_input" });
  });

  // Iteración 6 · F2: esta prueba esperaba `empty_input` para `{}` y fijaba el error.
  // Una petición sin `text` (o con un `text` que no es string) es una petición mal formada.
  it("sin campo text → 400 bad_request", async () => {
    const response = await post({});
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ type: "error", code: "bad_request" });
  });

  it.each([[{ text: 5 }], [{ text: null }], [{ text: ["hola"] }], [null]])(
    "regresión F2: %j → 400 bad_request (no empty_input)",
    async (body) => {
      const response = await post(body);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ type: "error", code: "bad_request" });
    },
  );

  it("regresión F2: sólo un string vacío o de espacios es empty_input", async () => {
    for (const text of ["", " \n\t "]) {
      const response = await post({ text });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ type: "error", code: "empty_input" });
    }
  });

  it("texto demasiado largo → 400 bad_request", async () => {
    const response = await post({ text: "a".repeat(1001) });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ type: "error", code: "bad_request" });
  });

  it("JSON inválido → 400 bad_request", async () => {
    const response = await post("{no es json", true);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ type: "error", code: "bad_request" });
  });

  it("modo inválido → 400 bad_request", async () => {
    const response = await post({ text: "200 kWh", mode: "turbo" });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ type: "error", code: "bad_request" });
  });

  it("texto sin datos → evento no_data en el stream", async () => {
    const events = await readNdjson(await post({ text: "hola, ¿cómo estás?" }));
    expect(events.at(-1)).toMatchObject({ type: "error", code: "no_data" });
  });

  it("exporta la configuración de segmento para Node.js y 60 s", async () => {
    const route = await import("@/app/api/analyze/route");
    expect(route.runtime).toBe("nodejs");
    expect(route.maxDuration).toBe(60);
  });

  it("sin ANTHROPIC_API_KEY el resultado es de modo demo", async () => {
    const events = await readNdjson(await post({ text: "Gastamos 200 kWh de luz" }));
    const last = events.at(-1);
    expect(last?.type).toBe("result");
    if (last?.type === "result") {
      expect(last.data.mode).toBe("demo");
      expect(last.data.model).toBeUndefined();
    }
  });
});
