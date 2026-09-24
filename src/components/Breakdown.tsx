import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORY_META } from "@/lib/categories";
import { formatKg, formatShare } from "@/lib/format";
import type { AnalysisResult } from "@/lib/types";

type BreakdownProps = {
  byCategory: AnalysisResult["byCategory"];
};

/**
 * Desglose por categoría: una barra apilada fina y una leyenda con ícono, nombre, kg y %.
 * El color nunca va solo (ícono + nombre + cifra) y los tramos se separan con 2 px de aire.
 */
export function Breakdown({ byCategory }: BreakdownProps) {
  const parts = byCategory.filter((part) => part.kg > 0).sort((a, b) => b.kg - a.kg);
  if (parts.length === 0) return null;

  return (
    <section aria-labelledby="breakdown-title" className="flex flex-col gap-4">
      <h2 id="breakdown-title" className="section-label">
        ¿De dónde viene?
      </h2>

      <div
        role="img"
        aria-label={`Reparto de la huella: ${parts
          .map((part) => `${CATEGORY_META[part.category].label} ${formatShare(part.share)}`)
          .join(", ")}`}
        className="flex h-2.5 w-full gap-0.5"
      >
        {parts.map((part) => (
          <div
            key={part.category}
            title={`${CATEGORY_META[part.category].label}: ${formatKg(part.kg)} kg CO₂e (${formatShare(part.share)})`}
            className="h-full min-w-1 transition-[flex-grow] duration-200 first:rounded-l-full last:rounded-r-full"
            style={{ flexGrow: part.share, flexBasis: 0, backgroundColor: CATEGORY_META[part.category].color }}
          />
        ))}
      </div>

      <ul className="flex flex-col">
        {parts.map((part) => {
          const meta = CATEGORY_META[part.category];
          return (
            <li key={part.category} className="flex items-center gap-3 py-1.5">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              <CategoryIcon category={part.category} className="h-4 w-4 shrink-0 text-ink-faint" />
              <span className="flex-1 text-sm text-ink">{meta.label}</span>
              <span className="font-mono text-sm tabular-nums text-ink-soft">
                {formatKg(part.kg)} kg
              </span>
              <span className="w-12 text-right font-mono text-sm tabular-nums text-ink">
                {formatShare(part.share)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
