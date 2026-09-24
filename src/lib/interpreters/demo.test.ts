import { describe, expect, it } from "vitest";

import { EXAMPLE_TEXTS } from "@/lib/examples";
import { calculate } from "@/lib/emissions/calculate";
import {
  demoInterpreter,
  explainByRules,
  extractByRules,
  parseNumber,
  recommendByRules,
  reviewByRules,
} from "@/lib/interpreters/demo";
import type { ExplainContext } from "@/lib/interpreters/types";
import { ExtractionSchema } from "@/lib/schemas";
import { ruleCheck } from "@/lib/validation/rules";

const ENUNCIADO = "Hoy usamos 5 camionetas de reparto durante 8 horas y gastamos 200 kWh de luz.";

function run(text: string) {
  const extraction = extractByRules(text);
  const calc = calculate(extraction.items);
  return { extraction, calc };
}

function context(text: string): ExplainContext {
  const { extraction, calc } = run(text);
  return {
    text,
    lines: calc.lines,
    unquantified: calc.unquantified,
    totalKg: calc.totalKg,
    byCategory: calc.byCategory,
    issues: ruleCheck(extraction.items, text),
  };
}

describe("parseNumber", () => {
  it.each([
    ["200", 200],
    ["1.500", 1500],
    ["1,5", 1.5],
    ["2.500,75", 2500.75],
    ["1.5", 1.5],
    ["dos", 2],
    ["Cinco", 5],
    ["diez", 10],
  ])("%s → %d", (raw, value) => {
    expect(parseNumber(raw)).toBe(value);
  });
});

describe("intérprete demo · extracción de los textos de ejemplo", () => {
  it("todos los ejemplos producen un esquema válido y citas literales", () => {
    for (const text of [ENUNCIADO, ...EXAMPLE_TEXTS]) {
      const { extraction } = run(text);
      expect(() => ExtractionSchema.parse(extraction)).not.toThrow();
      for (const item of extraction.items) expect(text).toContain(item.source_quote);
      expect(ruleCheck(extraction.items, text).filter((i) => i.severity === "warning")).toEqual([]);
    }
  });

  it("caso del enunciado: 5 camionetas × 8 h + 200 kWh de luz = 290 kg", () => {
    const { extraction, calc } = run(ENUNCIADO);
    expect(extraction.items).toEqual([
      expect.objectContaining({
        activity: "vehicle_delivery_van",
        quantity: 8,
        unit: "h",
        vehicle_count: 5,
        source_quote: "5 camionetas de reparto durante 8 horas",
      }),
      expect.objectContaining({
        activity: "electricity_grid",
        quantity: 200,
        unit: "kWh",
        source_quote: "200 kWh de luz",
      }),
    ]);
    expect(calc.totalKg).toBeCloseTo(290);
    expect(calc.lines[0].activityAmount).toBe(800);
  });

  it("panadería: 45 m³ de gas natural y 320 kWh de electricidad", () => {
    const { extraction, calc } = run(EXAMPLE_TEXTS[1]);
    expect(extraction.items.map((i) => [i.activity, i.quantity, i.unit])).toEqual([
      ["natural_gas", 45, "m3"],
      ["electricity_grid", 320, "kWh"],
    ]);
    expect(calc.totalKg).toBeCloseTo(90 + 144);
  });

  it("diésel y basura: el camión no se cuenta dos veces", () => {
    const { extraction, calc } = run(EXAMPLE_TEXTS[2]);
    expect(extraction.items.map((i) => [i.activity, i.quantity, i.unit])).toEqual([
      ["diesel", 60, "L"],
      ["waste_landfill", 25, "kg"],
    ]);
    expect(extraction.ignored).toEqual([expect.objectContaining({ quote: "camión" })]);
    expect(calc.totalKg).toBeCloseTo(60 * 2.68 + 25 * 0.45);
  });

  it("motos y local: número en palabras, 'cada una' y kWh sin palabra clave", () => {
    const { extraction, calc } = run(EXAMPLE_TEXTS[3]);
    expect(extraction.items).toEqual([
      expect.objectContaining({
        activity: "vehicle_motorcycle",
        quantity: 120,
        unit: "km",
        vehicle_count: 2,
        per_vehicle: true,
      }),
      expect.objectContaining({ activity: "electricity_grid", quantity: 80, unit: "kWh" }),
    ]);
    expect(calc.totalKg).toBeCloseTo(240 * 0.11 + 80 * 0.45);
  });

  it("texto sin datos: no extrae nada", () => {
    expect(extractByRules("hola, ¿cómo estás?")).toEqual({ items: [], ignored: [] });
  });

  it("sinónimos, unidades pegadas, miles y 'en total'", () => {
    const text =
      "Gastamos 1.500kWh, 10 galones de ACPM, la pipeta de gas y tres carros recorrieron 40 km en total. También usamos las furgonetas.";
    const { extraction } = run(text);
    expect(extraction.items.map((i) => [i.activity, i.quantity, i.unit])).toEqual([
      ["electricity_grid", 1500, "kWh"],
      ["diesel", 10, "gal"],
      ["lpg", null, null],
      ["vehicle_car", 40, "km"],
      ["vehicle_delivery_van", null, null],
    ]);
    expect(extraction.items[3]).toMatchObject({ vehicle_count: 3, per_vehicle: false });
  });

  it("reconoce gasolina, propano en kg, residuos y energía", () => {
    const { extraction } = run(
      "Echamos 30 litros de gasolina; usamos 20 kg de gas propano. Desechos: 3 toneladas de residuos, y la energía fue de 2 MWh",
    );
    expect(extraction.items.map((i) => [i.activity, i.quantity, i.unit])).toEqual([
      ["gasoline", 30, "L"],
      ["lpg", 20, "kg"],
      ["waste_landfill", 3, "t"],
      ["electricity_grid", 2, "MWh"],
    ]);
  });

  it("no confunde 'gastamos' con gas ni 'van' (verbo) con camionetas", () => {
    const { extraction } = run("Las motos van al centro y gastamos 12 kWh");
    expect(extraction.items.map((i) => i.activity)).toEqual(["vehicle_motorcycle", "electricity_grid"]);
  });
});

describe("intérprete demo · revisión", () => {
  it("con horas pregunta por los km reales y declara el supuesto de 20 km/h", () => {
    const extraction = extractByRules(ENUNCIADO);
    const review = reviewByRules(ENUNCIADO, extraction);
    expect(review.issues).toEqual([expect.objectContaining({ severity: "info", message: expect.stringMatching(/20 km\/h/) })]);
    expect(review.clarifyingQuestion).toMatch(/kilómetros recorrió cada camioneta/);
  });

  it("vehículos sin distancia: la pregunta pide horas o km", () => {
    const text = "Hoy salieron 3 camionetas";
    const review = reviewByRules(text, extractByRules(text));
    expect(review.clarifyingQuestion).toMatch(/kilómetros recorrieron/);
  });

  it("sin nada que preguntar devuelve null", () => {
    const review = reviewByRules(EXAMPLE_TEXTS[1], extractByRules(EXAMPLE_TEXTS[1]));
    expect(review).toEqual({ issues: [], clarifyingQuestion: null, discard: [] });
  });
});

describe("intérprete demo · análisis y recomendaciones", () => {
  it("el enunciado destaca el reparto (~69 %)", () => {
    const analysis = explainByRules(context(ENUNCIADO));
    expect(analysis.headline).toBe("Los vehículos son el 69 % de tu huella.");
    expect(analysis.summary).toMatch(/estimación/);
  });

  it("recomienda 3 acciones: 2 de la categoría dominante y 1 de la segunda", () => {
    const recs = recommendByRules(context(ENUNCIADO));
    expect(recs).toHaveLength(3);
    expect(recs.map((r) => r.category)).toEqual(["vehicle", "vehicle", "electricity"]);
    expect(recs[0].impact).toBe("alto");
    for (const rec of recs) expect(`${rec.title} ${rec.detail}`).not.toMatch(/\d+\s*%/);
  });

  it("con una sola categoría, 3 recomendaciones de esa categoría", () => {
    const recs = recommendByRules(context("Gastamos 200 kWh de luz"));
    expect(recs.map((r) => r.category)).toEqual(["electricity", "electricity", "electricity"]);
  });

  it("sin líneas calculadas: análisis que invita a dar cantidades y sin recomendaciones", () => {
    const ctx = context("Hoy salieron 3 camionetas");
    expect(explainByRules(ctx).headline).toMatch(/Todavía no/);
    expect(recommendByRules(ctx)).toEqual([]);
  });

  it("cumple el contrato Interpreter", async () => {
    expect(demoInterpreter.mode).toBe("demo");
    const extraction = await demoInterpreter.extract(ENUNCIADO);
    expect(extraction.items).toHaveLength(2);
    const ctx = context(ENUNCIADO);
    const [analysis, recs] = await Promise.all([demoInterpreter.explain(ctx), demoInterpreter.recommend(ctx)]);
    expect(analysis.headline).toBeTruthy();
    expect(recs).toHaveLength(3);
  });
});
