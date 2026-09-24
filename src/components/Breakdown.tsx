import type { ReactNode } from "react";

import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORY_META } from "@/lib/categories";
import { formatKg, formatNumber, formatShare } from "@/lib/format";
import type { AnalysisResult } from "@/lib/types";

type BreakdownProps = {
  byCategory: AnalysisResult["byCategory"];
  equivalences: AnalysisResult["equivalences"];
};

/** Desglose por categoría (barra apilada + leyenda con valores) y equivalencias comprensibles. */
export function Breakdown({ byCategory, equivalences }: BreakdownProps) {
  const parts = byCategory.filter((part) => part.kg > 0).sort((a, b) => b.kg - a.kg);

  return (
    <section aria-labelledby="breakdown-title" className="flex flex-col gap-5">
      <h2
        id="breakdown-title"
        className="font-mono text-xs uppercase tracking-widest text-ink-soft"
      >
        ¿De dónde viene?
      </h2>

      {parts.length > 0 && (
        <>
          <div
            role="img"
            aria-label={`Reparto de la huella: ${parts
              .map((part) => `${CATEGORY_META[part.category].label} ${formatShare(part.share)}`)
              .join(", ")}`}
            className="flex h-4 w-full gap-0.5 overflow-hidden rounded-sm bg-paper"
          >
            {parts.map((part) => (
              <div
                key={part.category}
                title={`${CATEGORY_META[part.category].label}: ${formatKg(part.kg)} kg CO₂e (${formatShare(part.share)})`}
                className="h-full min-w-1 transition-[flex-grow] duration-200 first:rounded-l-sm last:rounded-r-sm"
                style={{ flexGrow: part.share, flexBasis: 0, backgroundColor: CATEGORY_META[part.category].color }}
              />
            ))}
          </div>

          <ul className="flex flex-col divide-y divide-dashed divide-ink/15">
            {parts.map((part) => {
              const meta = CATEGORY_META[part.category];
              return (
                <li key={part.category} className="flex items-center gap-3 py-2">
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: meta.color }}
                  />
                  <CategoryIcon category={part.category} className="h-5 w-5 shrink-0 text-ink-soft" />
                  <span className="flex-1 text-sm text-ink">{meta.label}</span>
                  <span className="font-mono text-sm tabular-nums text-ink-soft">
                    {formatKg(part.kg)} kg
                  </span>
                  <span className="w-12 text-right font-mono text-sm font-semibold tabular-nums text-ink">
                    {formatShare(part.share)}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="font-mono text-xs uppercase tracking-widest text-ink-soft">
          Para hacerse una idea
        </h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          <Equivalence
            icon={<CarIcon />}
            value={`≈ ${formatNumber(equivalences.carKm)} km`}
            label="en auto a gasolina"
          />
          <Equivalence
            icon={<TreeIcon />}
            value={`≈ ${formatNumber(equivalences.treeYears, 1)} árboles`}
            label="absorbiendo durante un año"
          />
        </ul>
      </div>
    </section>
  );
}

function Equivalence({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <li className="flex items-center gap-3 rounded-sm border border-dashed border-ink/20 bg-paper/60 px-3 py-3">
      <span aria-hidden="true" className="text-moss">
        {icon}
      </span>
      <p className="flex flex-col leading-tight">
        <span className="font-display text-xl font-medium tabular-nums text-ink">{value}</span>
        <span className="text-sm text-ink-soft">{label}</span>
      </p>
    </li>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 15.5v-3l2-4.5a1.5 1.5 0 0 1 1.4-1h10.2a1.5 1.5 0 0 1 1.4 1l2 4.5v3" />
      <path d="M3.5 15.5h17M3.5 12.5h17" />
      <circle cx="7.5" cy="16.5" r="1.8" />
      <circle cx="16.5" cy="16.5" r="1.8" />
    </svg>
  );
}

function TreeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21.5v-7" />
      <path d="M12 14.5 9 12M12 16.5l3-2.5" />
      <path d="M12 2.5c-3.5 0-6 2.7-6 6 0 3.1 2.3 5.5 6 5.5s6-2.4 6-5.5c0-3.3-2.5-6-6-6Z" />
    </svg>
  );
}
