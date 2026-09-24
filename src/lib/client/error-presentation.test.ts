import { describe, expect, it } from "vitest";

import { presentError, type AnalysisError } from "@/lib/client/error-presentation";

const error = (code: AnalysisError["code"], extra: Partial<AnalysisError> = {}): AnalysisError => ({
  type: "error",
  code,
  message: "detalle",
  ...extra,
});

describe("regresión UI-2 · errores de IA de configuración", () => {
  it("clave inválida (retryable: false): no sugiere reintentar y ofrece directamente el modo demo", () => {
    const view = presentError(error("ai_error", { retryable: false }));
    expect(view.retry).toBe(false);
    expect(view.demo).toBe(true);
    expect(view.primary).toBe("demo");
    expect(`${view.title} ${view.hint}`).not.toMatch(/pasajero|de nuevo|en unos segundos/i);
    expect(view.hint).toMatch(/modo demo/);
  });

  it("error de IA transitorio (retryable true o ausente): reintentar + modo demo", () => {
    for (const retryable of [true, undefined]) {
      const view = presentError(error("ai_error", { retryable }));
      expect(view).toMatchObject({ retry: true, demo: true, primary: "retry" });
    }
  });
});

describe("regresión UI-3 · sin red", () => {
  it("sólo «Intentar de nuevo»: el modo demo también necesita red", () => {
    const view = presentError(error("network"));
    expect(view).toMatchObject({ retry: true, demo: false, primary: "retry" });
  });
});

describe("presentError · resto de códigos", () => {
  it.each(["empty_input", "no_data", "bad_request", "internal"] as const)("%s: reintentar, sin modo demo", (code) => {
    const view = presentError(error(code));
    expect(view).toMatchObject({ retry: true, demo: false });
    expect(view.title).toBeTruthy();
    expect(view.hint).toBeTruthy();
  });
});
