import { describe, expect, it } from "vitest";

import { calculate } from "@/lib/emissions/calculate";
import type { ExtractedItem } from "@/lib/schemas";

function item(partial: Partial<ExtractedItem> & Pick<ExtractedItem, "activity">): ExtractedItem {
  return {
    label: "Consumo",
    quantity: null,
    unit: null,
    vehicle_count: null,
    per_vehicle: null,
    source_quote: "cita",
    notes: null,
    ...partial,
  };
}

function single(i: ExtractedItem) {
  const result = calculate([i]);
  expect(result.lines).toHaveLength(1);
  return result.lines[0];
}

describe("calculate · factores por actividad", () => {
  const cases: [ExtractedItem, number, string, string][] = [
    [item({ activity: "electricity_grid", quantity: 100, unit: "kWh" }), 45, "electricity", "kWh"],
    [item({ activity: "diesel", quantity: 10, unit: "L" }), 26.8, "fuel", "L"],
    [item({ activity: "gasoline", quantity: 10, unit: "L" }), 23.1, "fuel", "L"],
    [item({ activity: "natural_gas", quantity: 10, unit: "m3" }), 20, "heating_gas", "m³"],
    [item({ activity: "lpg", quantity: 10, unit: "kg" }), 29.4, "heating_gas", "kg"],
    [item({ activity: "vehicle_delivery_van", quantity: 10, unit: "km" }), 2.5, "vehicle", "km"],
    [item({ activity: "vehicle_car", quantity: 10, unit: "km" }), 1.7, "vehicle", "km"],
    [item({ activity: "vehicle_motorcycle", quantity: 10, unit: "km" }), 1.1, "vehicle", "km"],
    [item({ activity: "vehicle_truck", quantity: 10, unit: "km" }), 8.5, "vehicle", "km"],
    [item({ activity: "waste_landfill", quantity: 10, unit: "kg" }), 4.5, "waste", "kg"],
  ];

  it.each(cases)("%# · %o", (input, kg, category, unit) => {
    const line = single(input);
    expect(line.kgCO2e).toBeCloseTo(kg, 6);
    expect(line.category).toBe(category);
    expect(line.activityUnit).toBe(unit);
    expect(line.factor.source).toMatch(/^Referencial · /);
    expect(line.quote).toBe("cita");
  });
});

describe("calculate · conversiones de unidad", () => {
  it("MWh → kWh", () => {
    const line = single(item({ activity: "electricity_grid", quantity: 1.5, unit: "MWh" }));
    expect(line.activityAmount).toBe(1500);
    expect(line.kgCO2e).toBeCloseTo(675);
    expect(line.steps).toEqual(["1,5 MWh × 1.000 = 1.500 kWh"]);
  });

  it("gal → L", () => {
    const line = single(item({ activity: "diesel", quantity: 10, unit: "gal" }));
    expect(line.activityAmount).toBeCloseTo(37.85);
    expect(line.kgCO2e).toBeCloseTo(37.85 * 2.68);
    expect(line.steps[0]).toBe("10 gal × 3,785 L/gal = 37,85 L");
  });

  it("lb → kg", () => {
    const line = single(item({ activity: "waste_landfill", quantity: 100, unit: "lb" }));
    expect(line.activityAmount).toBeCloseTo(45.36);
  });

  it("t → kg", () => {
    const line = single(item({ activity: "waste_landfill", quantity: 2, unit: "t" }));
    expect(line.activityAmount).toBe(2000);
    expect(line.kgCO2e).toBeCloseTo(900);
  });

  it("mi → km", () => {
    const line = single(item({ activity: "vehicle_car", quantity: 10, unit: "mi" }));
    expect(line.activityAmount).toBeCloseTo(16.09);
    expect(line.steps[0]).toBe("10 mi × 1,609 km/mi = 16,09 km");
  });

  it("GLP en litros → kg con densidad 0,51 (supuesto declarado)", () => {
    const line = single(item({ activity: "lpg", quantity: 20, unit: "L" }));
    expect(line.activityAmount).toBeCloseTo(10.2);
    expect(line.kgCO2e).toBeCloseTo(10.2 * 2.94);
    expect(line.assumptions.join(" ")).toMatch(/0,51 kg/);
  });

  it("guarda la precisión completa (no redondea)", () => {
    const line = single(item({ activity: "diesel", quantity: 1.23, unit: "L" }));
    expect(line.kgCO2e).toBeCloseTo(3.2964, 6);
  });
});

describe("calculate · vehículos", () => {
  it("horas → km a 20 km/h, declarado como supuesto", () => {
    const line = single(
      item({ activity: "vehicle_car", quantity: 2, unit: "h", vehicle_count: 1 }),
    );
    expect(line.activityAmount).toBe(40);
    expect(line.steps).toEqual(["2 h × 20 km/h = 40 km"]);
    expect(line.assumptions[0]).toMatch(/20 km\/h/);
  });

  it("per_vehicle true multiplica por el número de vehículos sin supuesto extra", () => {
    const line = single(
      item({
        activity: "vehicle_motorcycle",
        quantity: 120,
        unit: "km",
        vehicle_count: 2,
        per_vehicle: true,
      }),
    );
    expect(line.activityAmount).toBe(240);
    expect(line.kgCO2e).toBeCloseTo(26.4);
    expect(line.assumptions).toEqual([]);
    expect(line.interpreted).toBe("2 motos × 120 km");
  });

  it("per_vehicle false toma la cantidad como total", () => {
    const line = single(
      item({
        activity: "vehicle_delivery_van",
        quantity: 300,
        unit: "km",
        vehicle_count: 3,
        per_vehicle: false,
      }),
    );
    expect(line.activityAmount).toBe(300);
    expect(line.interpreted).toMatch(/en total/);
  });

  it("per_vehicle null con varios vehículos asume por vehículo y lo declara", () => {
    const line = single(
      item({ activity: "vehicle_delivery_van", quantity: 50, unit: "km", vehicle_count: 4 }),
    );
    expect(line.activityAmount).toBe(200);
    expect(line.assumptions.some((a) => a.includes("por camioneta"))).toBe(true);
  });

  it("per_vehicle null con un solo vehículo no multiplica", () => {
    const line = single(item({ activity: "vehicle_truck", quantity: 50, unit: "km" }));
    expect(line.activityAmount).toBe(50);
    expect(line.assumptions).toEqual([]);
  });

  it("vehículos sin horas ni km → no cuantificable, sin inventar distancia", () => {
    const result = calculate([
      item({ activity: "vehicle_delivery_van", label: "Camionetas", vehicle_count: 3 }),
    ]);
    expect(result.lines).toEqual([]);
    expect(result.unquantified).toHaveLength(1);
    expect(result.unquantified[0].reason).toMatch(/Faltan horas o km/);
    expect(result.totalKg).toBe(0);
  });

  it("unidad incompatible con un vehículo → no cuantificable", () => {
    const result = calculate([item({ activity: "vehicle_car", quantity: 10, unit: "kg" })]);
    expect(result.lines).toEqual([]);
    expect(result.unquantified[0].reason).toMatch(/km, millas u horas/);
  });
});

describe("calculate · casos no cuantificables", () => {
  it("actividad other", () => {
    const result = calculate([item({ activity: "other", label: "Agua", quantity: 5, unit: "m3" })]);
    expect(result.unquantified).toEqual([
      { label: "Agua", quote: "cita", reason: expect.stringMatching(/factor/) },
    ]);
  });

  it("cantidad faltante", () => {
    const result = calculate([item({ activity: "electricity_grid", unit: "kWh" })]);
    expect(result.unquantified[0].reason).toMatch(/Falta la cantidad/);
  });

  it("cantidad cero o negativa", () => {
    const result = calculate([
      item({ activity: "diesel", quantity: 0, unit: "L" }),
      item({ activity: "diesel", quantity: -5, unit: "L" }),
    ]);
    expect(result.lines).toEqual([]);
    expect(result.unquantified).toHaveLength(2);
    expect(result.unquantified[0].reason).toMatch(/mayor que cero/);
  });

  it("unidad faltante", () => {
    const result = calculate([item({ activity: "diesel", quantity: 20 })]);
    expect(result.unquantified[0].reason).toMatch(/Falta la unidad/);
  });

  it("unidad incompatible con la actividad", () => {
    const result = calculate([item({ activity: "electricity_grid", quantity: 20, unit: "L" })]);
    expect(result.unquantified[0].reason).toMatch(/No sabemos convertir/);
  });
});

describe("calculate · totales, desglose y equivalencias", () => {
  it("suma el total, ordena byCategory de mayor a menor y calcula shares", () => {
    const result = calculate([
      item({ activity: "waste_landfill", quantity: 10, unit: "kg" }), // 4,5
      item({ activity: "diesel", quantity: 10, unit: "L" }), // 26,8
      item({ activity: "gasoline", quantity: 10, unit: "L" }), // 23,1
      item({ activity: "electricity_grid", quantity: 100, unit: "kWh" }), // 45
    ]);
    expect(result.totalKg).toBeCloseTo(99.4);
    expect(result.byCategory.map((c) => c.category)).toEqual(["fuel", "electricity", "waste"]);
    expect(result.byCategory[0].kg).toBeCloseTo(49.9);
    const shareSum = result.byCategory.reduce((s, c) => s + c.share, 0);
    expect(shareSum).toBeCloseTo(1);
    expect(result.equivalences.carKm).toBeCloseTo(99.4 / 0.17);
    expect(result.equivalences.treeYears).toBeCloseTo(99.4 / 21);
  });

  it("sin líneas: total 0 y sin desglose", () => {
    const result = calculate([]);
    expect(result.totalKg).toBe(0);
    expect(result.byCategory).toEqual([]);
    expect(result.equivalences).toEqual({ carKm: 0, treeYears: 0 });
  });

  it("caso del Master Prompt §11: 5 camionetas × 8 h + 200 kWh = 290 kg", () => {
    const result = calculate([
      item({
        activity: "vehicle_delivery_van",
        label: "Camionetas de reparto",
        quantity: 8,
        unit: "h",
        vehicle_count: 5,
        per_vehicle: null,
        source_quote: "5 camionetas de reparto durante 8 horas",
      }),
      item({
        activity: "electricity_grid",
        label: "Electricidad de la red",
        quantity: 200,
        unit: "kWh",
        source_quote: "200 kWh de luz",
      }),
    ]);

    const [vans, power] = result.lines;
    expect(vans.steps).toEqual(["8 h × 20 km/h = 160 km por camioneta", "160 km × 5 = 800 km"]);
    expect(vans.activityAmount).toBe(800);
    expect(vans.kgCO2e).toBeCloseTo(200);
    expect(vans.interpreted).toBe("5 camionetas × 8 h");
    expect(vans.assumptions).toHaveLength(2);
    expect(power.kgCO2e).toBeCloseTo(90);
    expect(power.interpreted).toBe("200 kWh de electricidad");

    expect(result.totalKg).toBeCloseTo(290);
    expect(result.byCategory[0]).toMatchObject({ category: "vehicle" });
    expect(result.byCategory[0].share).toBeCloseTo(200 / 290);
    expect(result.equivalences.carKm).toBeCloseTo(290 / 0.17);
    expect(result.equivalences.treeYears).toBeCloseTo(290 / 21);
  });
});
