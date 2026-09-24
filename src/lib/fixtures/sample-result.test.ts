import { describe, expect, it } from "vitest";

import { sampleResult } from "@/lib/fixtures/sample-result";

describe("fixture del resultado de ejemplo", () => {
  it("cada línea cumple cantidad × factor = kg CO₂e", () => {
    for (const line of sampleResult.lines) {
      expect(line.activityAmount * line.factor.value).toBeCloseTo(line.kgCO2e, 6);
    }
  });

  it("el total es la suma de las líneas (290 kg)", () => {
    const sum = sampleResult.lines.reduce((acc, line) => acc + line.kgCO2e, 0);
    expect(sampleResult.totalKg).toBeCloseTo(sum, 6);
    expect(sampleResult.totalKg).toBe(290);
  });

  it("el desglose por categoría suma el total y sus shares suman 1", () => {
    const kg = sampleResult.byCategory.reduce((acc, part) => acc + part.kg, 0);
    const share = sampleResult.byCategory.reduce((acc, part) => acc + part.share, 0);
    expect(kg).toBeCloseTo(sampleResult.totalKg, 6);
    expect(share).toBeCloseTo(1, 6);
  });

  it("las citas son literales del texto del usuario", () => {
    for (const line of sampleResult.lines) {
      expect(sampleResult.input).toContain(line.quote);
    }
  });

  it("las equivalencias usan 0,17 kg/km y 21 kg/árbol-año", () => {
    expect(Math.round(sampleResult.equivalences.carKm)).toBe(1706);
    expect(sampleResult.equivalences.treeYears).toBeCloseTo(13.8, 1);
  });
});
