import type { Category } from "@/lib/types";

/**
 * Metadatos de cada categoría. Colores derivados de la paleta (moss, signal, clay)
 * y validados como paleta categórica (CVD ΔE ≥ 8 en todos los pares sobre `paper`).
 * El color nunca va solo: siempre acompaña un ícono y el nombre.
 */
export const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  electricity: { label: "Electricidad", color: "#A3BD2C" },
  fuel: { label: "Combustibles", color: "#D2692F" },
  vehicle: { label: "Vehículos", color: "#0F6A3E" },
  heating_gas: { label: "Gas", color: "#3D72C7" },
  waste: { label: "Residuos", color: "#9A5C8C" },
};
