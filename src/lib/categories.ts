import type { Category } from "@/lib/types";

/**
 * Metadatos de cada categoría. Paleta de verdes, musgos y tierras (iteración 7), sin el
 * lima `signal` (reservado para lo que "está vivo") ni el `clay` (reservado a advertencias).
 * Validada como paleta categórica sobre `paper` (#F4F1E8), todos los pares:
 * visión normal ΔE ≥ 15,5; daltonismo ΔE ≥ 7,1 (banda mínima 6–8, válida sólo con
 * codificación secundaria). Por eso el color nunca va solo: siempre lo acompañan el
 * ícono, el nombre y la cifra, y la barra separa los tramos con un hueco de 2 px.
 */
export const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  vehicle: { label: "Vehículos", color: "#1C754D" }, // bosque
  electricity: { label: "Electricidad", color: "#88923F" }, // musgo oliva
  heating_gas: { label: "Gas", color: "#59C7A6" }, // salvia
  fuel: { label: "Combustibles", color: "#E4A35E" }, // ocre
  waste: { label: "Residuos", color: "#833F13" }, // corteza
};
