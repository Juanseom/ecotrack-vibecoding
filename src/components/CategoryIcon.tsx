import type { ReactNode } from "react";

import type { Category } from "@/lib/types";

type CategoryIconProps = {
  category: Category;
  className?: string;
};

/** Íconos de línea simples (24×24, trazo de 1.6) para cada categoría de consumo. */
export function CategoryIcon({ category, className }: CategoryIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[category]}
    </svg>
  );
}

const PATHS: Record<Category, ReactNode> = {
  // Rayo
  electricity: <path d="M13 2.5 5.5 13.5H11l-1 8 7.5-11H12l1-8Z" />,
  // Surtidor de combustible
  fuel: (
    <>
      <path d="M4.5 20.5v-15a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15" />
      <path d="M3 20.5h12M7 8h4" />
      <path d="M13.5 10h1.5a2 2 0 0 1 2 2v4.5a1.5 1.5 0 0 0 3 0V9l-2.5-3" />
    </>
  ),
  // Camioneta
  vehicle: (
    <>
      <path d="M2.5 16.5v-9a1 1 0 0 1 1-1h10v10.5" />
      <path d="M13.5 9.5h4l3 3.5v3.5h-1.5" />
      <path d="M9.5 16.5h5.5" />
      <circle cx="7" cy="17" r="1.8" />
      <circle cx="17.5" cy="17" r="1.8" />
    </>
  ),
  // Llama de gas
  heating_gas: (
    <path d="M12 21.5c-3.6 0-6-2.4-6-5.7 0-3.9 3.4-5.6 4.2-10.3 2.8 1.8 4.3 4.3 4.3 6.8 1-.6 1.6-1.6 1.8-2.8 1.3 1.4 1.7 3.2 1.7 4.6 0 4.1-2.5 7.4-6 7.4Z" />
  ),
  // Bolsa de basura
  waste: (
    <>
      <path d="M4.5 7h15l-1.3 13a1.5 1.5 0 0 1-1.5 1.5H7.3A1.5 1.5 0 0 1 5.8 20L4.5 7Z" />
      <path d="M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7M10 11v6.5M14 11v6.5" />
    </>
  ),
};
