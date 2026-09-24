import { describe, expect, it } from "vitest";

import type { ExtractedItem } from "@/lib/schemas";
import { normalizeForMatch, ruleCheck } from "@/lib/validation/rules";

function item(partial: Partial<ExtractedItem> & Pick<ExtractedItem, "activity">): ExtractedItem {
  return {
    label: "Consumo",
    quantity: null,
    unit: null,
    vehicle_count: null,
    per_vehicle: null,
    source_quote: "",
    notes: null,
    ...partial,
  };
}

describe("normalizeForMatch", () => {
  it("quita tildes, mayúsculas y espacios de más", () => {
    expect(normalizeForMatch("  Cargamos 60 litros de  DIÉSEL ")).toBe("cargamos 60 litros de diesel");
  });
});

describe("ruleCheck", () => {
  const text = "Hoy usamos 5 camionetas de reparto durante 8 horas y gastamos 200 kWh de luz.";

  it("no reporta nada con datos razonables y citas literales", () => {
    const issues = ruleCheck(
      [
        item({
          activity: "vehicle_delivery_van",
          quantity: 8,
          unit: "h",
          vehicle_count: 5,
          source_quote: "5 camionetas de reparto durante 8 horas",
        }),
        item({ activity: "electricity_grid", quantity: 200, unit: "kWh", source_quote: "200 kWh de luz" }),
      ],
      text,
    );
    expect(issues).toEqual([]);
  });

  it("la cita se compara sin tildes ni mayúsculas", () => {
    const issues = ruleCheck(
      [item({ activity: "diesel", quantity: 60, unit: "L", source_quote: "60 LITROS de diesel" })],
      "Cargamos 60 litros de diésel en el camión.",
    );
    expect(issues).toEqual([]);
  });

  it("avisa si la cita no aparece en el texto", () => {
    const issues = ruleCheck(
      [item({ activity: "diesel", label: "Diésel", quantity: 60, unit: "L", source_quote: "60 litros de diésel" })],
      text,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "warning", lineId: "line-1-diesel" });
    expect(issues[0].message).toMatch(/No encontramos «60 litros de diésel»/);
  });

  it("avisa si la cita está vacía", () => {
    const issues = ruleCheck([item({ activity: "diesel", quantity: 6, unit: "L" })], text);
    expect(issues[0].message).toMatch(/no trae la frase/);
  });

  it("avisa de valores negativos", () => {
    const issues = ruleCheck(
      [item({ activity: "electricity_grid", quantity: -20, unit: "kWh", source_quote: "200 kWh" })],
      text,
    );
    expect(issues.map((i) => i.message).join(" ")).toMatch(/negativa/);
  });

  it.each([
    ["electricidad > 20.000 kWh", item({ activity: "electricity_grid", quantity: 25, unit: "MWh" }), /kWh de electricidad/],
    ["combustible > 5.000 L", item({ activity: "diesel", quantity: 2000, unit: "gal" }), /litros de combustible/],
    ["más de 24 h por vehículo", item({ activity: "vehicle_car", quantity: 30, unit: "h", vehicle_count: 1 }), /24 horas/],
    ["más de 200 vehículos", item({ activity: "vehicle_motorcycle", quantity: 10, unit: "km", vehicle_count: 500 }), /500 vehículos/],
    ["más de 10.000 km por vehículo", item({ activity: "vehicle_truck", quantity: 12000, unit: "km" }), /km por vehículo/],
  ])("rango sospechoso: %s", (_name, input, pattern) => {
    const issues = ruleCheck([{ ...input, source_quote: "hoy" }], text);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].message).toMatch(pattern);
  });

  it("horas en total repartidas entre vehículos no disparan el límite de 24 h", () => {
    const issues = ruleCheck(
      [
        item({
          activity: "vehicle_delivery_van",
          quantity: 40,
          unit: "h",
          vehicle_count: 5,
          per_vehicle: false,
          source_quote: "hoy",
        }),
      ],
      text,
    );
    expect(issues).toEqual([]);
  });
});
