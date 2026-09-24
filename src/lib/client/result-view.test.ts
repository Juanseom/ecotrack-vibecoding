import { describe, expect, it } from "vitest";

import { hasTotal } from "@/lib/client/result-view";

describe("hasTotal · cuándo mostrar el total y sus equivalencias", () => {
  it("con kg positivos hay total", () => {
    expect(hasTotal({ totalKg: 290 })).toBe(true);
    expect(hasTotal({ totalKg: 0.1 })).toBe(true);
  });

  it("con 0 (p. ej. sólo consumos no cuantificados) no hay nada que sumar", () => {
    expect(hasTotal({ totalKg: 0 })).toBe(false);
  });

  it("valores no válidos no se muestran como total", () => {
    expect(hasTotal({ totalKg: Number.NaN })).toBe(false);
    expect(hasTotal({ totalKg: -5 })).toBe(false);
  });
});
