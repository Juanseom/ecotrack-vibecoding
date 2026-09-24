import { describe, expect, it } from "vitest";

import { DATA_ORIGINS, dataOriginCopy } from "@/lib/data-origin";

describe("regresión H1 · insignia de origen del dato según quién interpretó", () => {
  it("modo IA: «IA interpretó»", () => {
    expect(dataOriginCopy("ai", "ai").label).toBe("IA interpretó");
  });

  it("modo demo: «Eco interpretó (reglas)», sin atribuirlo a la IA", () => {
    const copy = dataOriginCopy("ai", "demo");
    expect(copy.label).toBe("Eco interpretó (reglas)");
    expect(copy.label).not.toMatch(/\bIA\b/);
    expect(copy.description).toMatch(/reglas/);
    expect(copy.description).not.toMatch(/\bla IA\b/);
  });

  it("el resto de insignias no dependen del modo", () => {
    for (const origin of DATA_ORIGINS.filter((o) => o !== "ai")) {
      expect(dataOriginCopy(origin, "demo")).toEqual(dataOriginCopy(origin, "ai"));
    }
    expect(dataOriginCopy("user", "demo").label).toBe("Tú lo dijiste");
  });
});
