import { lineIdFor } from "@/lib/emissions/calculate";
import { KM_PER_MI, KWH_PER_MWH, L_PER_GAL } from "@/lib/emissions/factors";
import { formatAmount, formatNumber } from "@/lib/format";
import type { ExtractedItem } from "@/lib/schemas";
import type { ValidationIssue } from "@/lib/types";

/**
 * Validación determinista (sin IA): rangos sospechosos para un pequeño negocio
 * en un día o periodo corto, citas que no aparecen en el texto y valores negativos.
 * No bloquea el cálculo: sólo avisa, en el tono de Eco.
 */

export const LIMITS = {
  electricityKWh: 20_000,
  fuelL: 5_000,
  naturalGasM3: 20_000,
  wasteKg: 20_000,
  hoursPerVehicle: 24,
  vehicles: 200,
  kmPerVehicle: 10_000,
} as const;

/** Minúsculas, sin tildes y con espacios simples, para comparar citas. */
export function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[“”«»"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const VEHICLE_ACTIVITIES = new Set<ExtractedItem["activity"]>([
  "vehicle_delivery_van",
  "vehicle_car",
  "vehicle_motorcycle",
  "vehicle_truck",
]);

export function ruleCheck(items: ExtractedItem[], text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const normalizedText = normalizeForMatch(text);

  items.forEach((item, index) => {
    const lineId = lineIdFor(index, item);
    const warn = (message: string) => issues.push({ severity: "warning", message, lineId });
    const name = item.label.trim() || "un consumo";

    // 1. La cita debe salir del texto del usuario.
    const quote = normalizeForMatch(item.source_quote);
    if (!quote || !normalizedText.includes(quote)) {
      warn(
        item.source_quote.trim()
          ? `No encontramos «${item.source_quote.trim()}» en tu texto. Revisa que el dato de ${name} sea tuyo y no una suposición.`
          : `El dato de ${name} no trae la frase de tu texto de donde salió. Revísalo antes de confiar en él.`,
      );
    }

    // 2. Valores negativos.
    if (item.quantity !== null && item.quantity < 0) {
      warn(`La cantidad de ${name} es negativa (${formatAmount(item.quantity)}). Los consumos no pueden ser menores que cero.`);
    }
    if (item.vehicle_count !== null && item.vehicle_count < 0) {
      warn(`El número de vehículos en ${name} es negativo. Revisa ese dato.`);
    }

    // 3. Rangos sospechosos.
    if (item.vehicle_count !== null && item.vehicle_count > LIMITS.vehicles) {
      warn(
        `${formatNumber(item.vehicle_count)} vehículos es mucho para un negocio pequeño. ¿Seguro que no sobra un cero?`,
      );
    }

    const quantity = item.quantity;
    if (quantity === null || quantity <= 0 || item.unit === null) return;
    const unit = item.unit;

    if (item.activity === "electricity_grid") {
      const kWh = unit === "MWh" ? quantity * KWH_PER_MWH : unit === "kWh" ? quantity : null;
      if (kWh !== null && kWh > LIMITS.electricityKWh) {
        warn(
          `${formatNumber(kWh)} kWh de electricidad es muchísimo para un negocio pequeño en un día o una semana. ¿Revisas si la cifra es correcta o si es de todo el mes?`,
        );
      }
    }

    if (item.activity === "diesel" || item.activity === "gasoline" || item.activity === "lpg") {
      const liters = unit === "gal" ? quantity * L_PER_GAL : unit === "L" ? quantity : null;
      if (liters !== null && liters > LIMITS.fuelL) {
        warn(
          `${formatNumber(liters)} litros de combustible es una cantidad inusual para un negocio pequeño. ¿Puedes confirmarla?`,
        );
      }
    }

    if (item.activity === "natural_gas" && unit === "m3" && quantity > LIMITS.naturalGasM3) {
      warn(`${formatNumber(quantity)} m³ de gas natural parece demasiado. ¿Revisas la cifra?`);
    }

    if (item.activity === "waste_landfill") {
      const kg = unit === "t" ? quantity * 1000 : unit === "kg" ? quantity : null;
      if (kg !== null && kg > LIMITS.wasteKg) {
        warn(`${formatNumber(kg)} kg de residuos es muchísimo para un negocio pequeño. ¿Revisas la cifra?`);
      }
    }

    if (VEHICLE_ACTIVITIES.has(item.activity)) {
      const count = item.vehicle_count && item.vehicle_count > 0 ? item.vehicle_count : 1;
      const divisor = item.per_vehicle === false ? count : 1;
      const perVehicle = quantity / divisor;

      if (unit === "h" && perVehicle > LIMITS.hoursPerVehicle) {
        warn(
          `${formatAmount(perVehicle)} h de uso por vehículo supera las 24 horas de un día. ¿Era el total de varios días o de varios vehículos?`,
        );
      }
      const km = unit === "mi" ? perVehicle * KM_PER_MI : unit === "km" ? perVehicle : null;
      if (km !== null && km > LIMITS.kmPerVehicle) {
        warn(
          `${formatNumber(km)} km por vehículo es una distancia enorme para un periodo corto. ¿Puedes confirmarla?`,
        );
      }
    }
  });

  return issues;
}
