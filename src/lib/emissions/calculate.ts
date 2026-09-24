import {
  ACTIVITY_DEFINITIONS,
  CAR_KG_PER_KM,
  isFactorActivity,
  KG_PER_LB,
  KG_PER_T,
  KM_PER_MI,
  KWH_PER_MWH,
  L_PER_GAL,
  LPG_KG_PER_L,
  TREE_KG_PER_YEAR,
  URBAN_SPEED_KMH,
  type ActivityDefinition,
  type BaseUnit,
} from "@/lib/emissions/factors";
import { formatAmount } from "@/lib/format";
import type { ExtractedItem, Unit } from "@/lib/schemas";
import type { AnalysisResult, ReceiptLine, UnquantifiedItem } from "@/lib/types";

/**
 * Motor de cálculo determinista: `cantidad × factor = kg CO₂e`.
 * Función pura, sin E/S. La IA (o el intérprete demo) sólo entrega `ExtractedItem`s;
 * aquí se convierten unidades, se declaran supuestos y se aplican los factores.
 * Los kg se guardan con toda su precisión; el redondeo es sólo al mostrar.
 */

export interface CalculationResult {
  lines: ReceiptLine[];
  unquantified: UnquantifiedItem[];
  totalKg: number;
  byCategory: AnalysisResult["byCategory"];
  equivalences: AnalysisResult["equivalences"];
}

/** Id estable de la línea que produce el ítem en la posición `index`. */
export function lineIdFor(index: number, item: Pick<ExtractedItem, "activity">): string {
  return `line-${index + 1}-${item.activity}`;
}

/** Unidad legible: "m3" → "m³". */
export function unitLabel(unit: Unit | BaseUnit): string {
  return unit === "m3" ? "m³" : unit;
}

export function calculate(items: ExtractedItem[]): CalculationResult {
  const lines: ReceiptLine[] = [];
  const unquantified: UnquantifiedItem[] = [];

  items.forEach((item, index) => {
    const outcome = calculateItem(item, index);
    if (outcome.kind === "line") lines.push(outcome.line);
    else unquantified.push(outcome.item);
  });

  const totalKg = lines.reduce((sum, line) => sum + line.kgCO2e, 0);

  const kgByCategory = new Map<ReceiptLine["category"], number>();
  for (const line of lines) {
    kgByCategory.set(line.category, (kgByCategory.get(line.category) ?? 0) + line.kgCO2e);
  }
  const byCategory = [...kgByCategory.entries()]
    .map(([category, kg]) => ({ category, kg, share: totalKg > 0 ? kg / totalKg : 0 }))
    .sort((a, b) => b.kg - a.kg);

  return {
    lines,
    unquantified,
    totalKg,
    byCategory,
    equivalences: {
      carKm: totalKg / CAR_KG_PER_KM,
      treeYears: totalKg / TREE_KG_PER_YEAR,
    },
  };
}

type ItemOutcome = { kind: "line"; line: ReceiptLine } | { kind: "unquantified"; item: UnquantifiedItem };

function calculateItem(item: ExtractedItem, index: number): ItemOutcome {
  const label = item.label.trim() || "Consumo";
  const skip = (reason: string): ItemOutcome => ({
    kind: "unquantified",
    item: { label, quote: item.source_quote, reason },
  });

  if (!isFactorActivity(item.activity)) {
    // Si el intérprete explicó por qué no lo pudo clasificar, esa es la razón más útil.
    return skip(
      item.notes?.trim() || "Todavía no tenemos un factor de emisión para este tipo de consumo.",
    );
  }
  const definition = ACTIVITY_DEFINITIONS[item.activity];
  const conversion = definition.vehicle
    ? vehicleActivity(item, definition)
    : plainActivity(item, definition);

  if ("reason" in conversion) return skip(conversion.reason);

  const kgCO2e = conversion.amount * definition.factor.value;
  return {
    kind: "line",
    line: {
      id: lineIdFor(index, item),
      category: definition.category,
      label,
      quote: item.source_quote,
      interpreted: conversion.interpreted,
      steps: conversion.steps,
      activityAmount: conversion.amount,
      activityUnit: unitLabel(definition.baseUnit),
      factor: definition.factor,
      kgCO2e,
      assumptions: conversion.assumptions,
    },
  };
}

interface Conversion {
  amount: number;
  interpreted: string;
  steps: string[];
  assumptions: string[];
}

type ConversionOutcome = Conversion | { reason: string };

const EXPECTED_UNITS: Record<BaseUnit, string> = {
  kWh: "kWh o MWh",
  L: "litros o galones",
  m3: "m³",
  kg: "kg, libras o toneladas",
  km: "km, millas u horas de uso",
};

function checkQuantity(item: ExtractedItem, definition: ActivityDefinition): string | null {
  const expected =
    definition.baseUnit === "kg" && item.activity === "lpg"
      ? "kg o litros"
      : EXPECTED_UNITS[definition.baseUnit];
  if (item.quantity === null || !Number.isFinite(item.quantity)) {
    return definition.vehicle
      ? "Faltan horas o km recorridos; no inventamos la distancia."
      : `Falta la cantidad (en ${expected}); no la inventamos.`;
  }
  if (item.quantity < 0) {
    // Nunca se calcula ni se "corrige" un negativo (p. ej. con su valor absoluto): se deja fuera.
    return `Escribiste ${formatAmount(item.quantity)}${item.unit ? ` ${unitLabel(item.unit)}` : ""}: un consumo no puede ser negativo, así que no lo calculamos. Revisa la cifra.`;
  }
  if (item.quantity === 0) return "La cantidad debe ser mayor que cero para poder calcular.";
  if (item.unit === null) return `Falta la unidad: ¿son ${expected}?`;
  return null;
}

/** Electricidad, combustibles, gas y residuos: convierte a la unidad base del factor. */
function plainActivity(item: ExtractedItem, definition: ActivityDefinition): ConversionOutcome {
  const problem = checkQuantity(item, definition);
  if (problem) return { reason: problem };
  const quantity = item.quantity as number;
  const unit = item.unit as Unit;

  const steps: string[] = [];
  const assumptions: string[] = [];
  const base = definition.baseUnit;
  const q = formatAmount(quantity);
  let amount: number | null = null;

  if (unit === base) {
    amount = quantity;
  } else if (base === "kWh" && unit === "MWh") {
    amount = quantity * KWH_PER_MWH;
    steps.push(`${q} MWh × 1.000 = ${formatAmount(amount)} kWh`);
  } else if (base === "L" && unit === "gal") {
    amount = quantity * L_PER_GAL;
    steps.push(`${q} gal × ${formatAmount(L_PER_GAL, 3)} L/gal = ${formatAmount(amount)} L`);
  } else if (base === "kg" && unit === "lb") {
    amount = quantity * KG_PER_LB;
    steps.push(`${q} lb × ${formatAmount(KG_PER_LB, 4)} kg/lb = ${formatAmount(amount)} kg`);
  } else if (base === "kg" && unit === "t") {
    amount = quantity * KG_PER_T;
    steps.push(`${q} t × 1.000 = ${formatAmount(amount)} kg`);
  } else if (item.activity === "lpg" && (unit === "L" || unit === "gal")) {
    let liters = quantity;
    if (unit === "gal") {
      liters = quantity * L_PER_GAL;
      steps.push(`${q} gal × ${formatAmount(L_PER_GAL, 3)} L/gal = ${formatAmount(liters)} L`);
    }
    amount = liters * LPG_KG_PER_L;
    steps.push(
      `${formatAmount(liters)} L × ${formatAmount(LPG_KG_PER_L)} kg/L = ${formatAmount(amount)} kg de GLP`,
    );
    assumptions.push(`Densidad del GLP de ${formatAmount(LPG_KG_PER_L)} kg por litro`);
  }

  if (amount === null) {
    return {
      reason: `No sabemos convertir ${unitLabel(unit)} para ${definition.noun}: necesitamos ${
        item.activity === "lpg" ? "kg o litros" : EXPECTED_UNITS[base]
      }.`,
    };
  }

  return {
    amount,
    interpreted: `${q} ${unitLabel(unit)} de ${definition.noun}`,
    steps,
    assumptions,
  };
}

/** Vehículos: distancia (km, millas u horas × 20 km/h) por vehículo o en total. */
function vehicleActivity(item: ExtractedItem, definition: ActivityDefinition): ConversionOutcome {
  const names = definition.vehicle!;
  const problem = checkQuantity(item, definition);
  if (problem) return { reason: problem };
  const quantity = item.quantity as number;
  const unit = item.unit as Unit;
  if (unit !== "km" && unit !== "mi" && unit !== "h") {
    return {
      reason: `Para ${names.many} necesitamos km, millas u horas de uso (dijiste ${unitLabel(unit)}).`,
    };
  }

  // Un número de vehículos imposible (negativo, cero o no finito) no se reemplaza por 1: se deja fuera.
  if (item.vehicle_count !== null && !(Number.isFinite(item.vehicle_count) && item.vehicle_count > 0)) {
    return {
      reason: `El número de vehículos (${formatAmount(item.vehicle_count)}) tiene que ser mayor que cero para poder calcular. Revisa la cifra.`,
    };
  }
  const count = item.vehicle_count;
  const several = count !== null && count > 1;
  // Por vehículo si lo dijo, o si no lo aclaró y hay más de un vehículo (supuesto declarado).
  const perVehicle = several && item.per_vehicle !== false;

  const steps: string[] = [];
  const assumptions: string[] = [];
  const q = formatAmount(quantity);
  const suffix = perVehicle ? ` por ${names.one}` : "";

  let km = quantity;
  if (unit === "h") {
    km = quantity * URBAN_SPEED_KMH;
    steps.push(`${q} h × ${URBAN_SPEED_KMH} km/h = ${formatAmount(km)} km${suffix}`);
    assumptions.push(
      `Velocidad urbana promedio de ${URBAN_SPEED_KMH} km/h (diste horas, no kilómetros)`,
    );
  } else if (unit === "mi") {
    km = quantity * KM_PER_MI;
    steps.push(`${q} mi × ${formatAmount(KM_PER_MI, 3)} km/mi = ${formatAmount(km)} km${suffix}`);
  }

  let amount = km;
  if (perVehicle && count !== null) {
    amount = km * count;
    steps.push(`${formatAmount(km)} km × ${formatAmount(count)} = ${formatAmount(amount)} km`);
    if (item.per_vehicle === null) {
      const unitWords = unit === "h" ? "horas" : unit === "mi" ? "millas" : "km";
      const article = unit === "h" || unit === "mi" ? "Las" : "Los";
      assumptions.push(`${article} ${q} ${unitWords} son por ${names.one} (no dijiste “en total”)`);
    }
  }

  const who =
    count === null
      ? names.one
      : `${formatAmount(count)} ${count === 1 ? names.one : names.many}`;
  const interpreted =
    several && !perVehicle
      ? `${who}, ${q} ${unit} en total`
      : count === null
        ? `${q} ${unit} en ${names.one}`
        : `${who} × ${q} ${unit}`;

  return { amount, interpreted, steps, assumptions };
}

