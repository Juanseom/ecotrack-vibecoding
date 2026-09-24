import type { Activity } from "@/lib/schemas";
import type { Category, EmissionFactor } from "@/lib/types";

/**
 * Factores de emisión del MVP (Master Prompt §5).
 * Son REFERENCIALES y simplificados (aproximaciones de uso común DEFRA/IPCC/IEA):
 * sirven para estimar órdenes de magnitud, no para reportes oficiales.
 */

/** Velocidad urbana promedio para convertir horas de uso de un vehículo en km. */
export const URBAN_SPEED_KMH = 20;
/** Densidad aproximada del GLP: 1 L ≈ 0,51 kg. */
export const LPG_KG_PER_L = 0.51;
/** Equivalencia: 1 km en un automóvil promedio ≈ 0,17 kg CO₂e. */
export const CAR_KG_PER_KM = 0.17;
/** Equivalencia: un árbol absorbe ≈ 21 kg de CO₂ al año. */
export const TREE_KG_PER_YEAR = 21;

/** Conversiones de unidad usadas por el motor. */
export const KWH_PER_MWH = 1000;
export const L_PER_GAL = 3.785;
export const KG_PER_LB = 0.4536;
export const KG_PER_T = 1000;
export const KM_PER_MI = 1.609;

/** Actividades con factor (todo menos "other"). */
export type FactorActivity = Exclude<Activity, "other">;

/** Unidad base en la que se expresa cada factor. */
export type BaseUnit = "kWh" | "L" | "m3" | "kg" | "km";

export interface ActivityDefinition {
  category: Category;
  baseUnit: BaseUnit;
  /** Nombre corto de la actividad para textos: "diésel", "electricidad". */
  noun: string;
  /** Sólo vehículos: nombre singular y plural de la unidad ("camioneta", "camionetas"). */
  vehicle?: { one: string; many: string };
  factor: EmissionFactor;
}

export const ACTIVITY_DEFINITIONS: Record<FactorActivity, ActivityDefinition> = {
  electricity_grid: {
    category: "electricity",
    baseUnit: "kWh",
    noun: "electricidad",
    factor: {
      id: "electricity_grid",
      label: "Red eléctrica (promedio global aprox.)",
      value: 0.45,
      unit: "kg CO₂e/kWh",
      source: "Referencial · IEA (aprox.)",
    },
  },
  diesel: {
    category: "fuel",
    baseUnit: "L",
    noun: "diésel",
    factor: {
      id: "diesel",
      label: "Diésel (combustión)",
      value: 2.68,
      unit: "kg CO₂e/L",
      source: "Referencial · DEFRA (aprox.)",
    },
  },
  gasoline: {
    category: "fuel",
    baseUnit: "L",
    noun: "gasolina",
    factor: {
      id: "gasoline",
      label: "Gasolina (combustión)",
      value: 2.31,
      unit: "kg CO₂e/L",
      source: "Referencial · DEFRA (aprox.)",
    },
  },
  natural_gas: {
    category: "heating_gas",
    baseUnit: "m3",
    noun: "gas natural",
    factor: {
      id: "natural_gas",
      label: "Gas natural (combustión)",
      value: 2.0,
      unit: "kg CO₂e/m³",
      source: "Referencial · IPCC (aprox.)",
    },
  },
  lpg: {
    category: "heating_gas",
    baseUnit: "kg",
    noun: "GLP",
    factor: {
      id: "lpg",
      label: "GLP / gas propano (combustión)",
      value: 2.94,
      unit: "kg CO₂e/kg",
      source: "Referencial · IPCC (aprox.)",
    },
  },
  vehicle_delivery_van: {
    category: "vehicle",
    baseUnit: "km",
    noun: "camioneta de reparto",
    vehicle: { one: "camioneta", many: "camionetas" },
    factor: {
      id: "vehicle_delivery_van_diesel",
      label: "Camioneta de reparto diésel (por km)",
      value: 0.25,
      unit: "kg CO₂e/km",
      source: "Referencial · DEFRA (aprox.)",
    },
  },
  vehicle_car: {
    category: "vehicle",
    baseUnit: "km",
    noun: "automóvil",
    vehicle: { one: "auto", many: "autos" },
    factor: {
      id: "vehicle_car_gasoline",
      label: "Automóvil a gasolina (por km)",
      value: 0.17,
      unit: "kg CO₂e/km",
      source: "Referencial · DEFRA (aprox.)",
    },
  },
  vehicle_motorcycle: {
    category: "vehicle",
    baseUnit: "km",
    noun: "motocicleta",
    vehicle: { one: "moto", many: "motos" },
    factor: {
      id: "vehicle_motorcycle",
      label: "Motocicleta (por km)",
      value: 0.11,
      unit: "kg CO₂e/km",
      source: "Referencial · DEFRA (aprox.)",
    },
  },
  vehicle_truck: {
    category: "vehicle",
    baseUnit: "km",
    noun: "camión",
    vehicle: { one: "camión", many: "camiones" },
    factor: {
      id: "vehicle_truck",
      label: "Camión (por km)",
      value: 0.85,
      unit: "kg CO₂e/km",
      source: "Referencial · DEFRA (aprox.)",
    },
  },
  waste_landfill: {
    category: "waste",
    baseUnit: "kg",
    noun: "residuos",
    factor: {
      id: "waste_landfill",
      label: "Residuos mixtos a relleno sanitario",
      value: 0.45,
      unit: "kg CO₂e/kg",
      source: "Referencial · DEFRA (aprox.)",
    },
  },
};

/** Tabla plana de factores (para mostrar o documentar). */
export const EMISSION_FACTORS: EmissionFactor[] = Object.values(ACTIVITY_DEFINITIONS).map(
  (definition) => definition.factor,
);

export function isFactorActivity(activity: Activity): activity is FactorActivity {
  return activity !== "other";
}
