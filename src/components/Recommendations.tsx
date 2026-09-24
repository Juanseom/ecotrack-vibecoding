import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORY_META } from "@/lib/categories";
import type { Recommendation } from "@/lib/types";

type RecommendationsProps = {
  recommendations: Recommendation[];
};

/** Impacto como texto con un punto pequeño: tres niveles de "lleno" además del color. */
const IMPACT_DOT: Record<Recommendation["impact"], string> = {
  alto: "bg-moss",
  medio: "border-[1.5px] border-moss bg-moss/35",
  bajo: "border-[1.5px] border-ink-faint",
};

/** Tres acciones concretas, numeradas, con impacto y dificultad como etiquetas. */
export function Recommendations({ recommendations }: RecommendationsProps) {
  if (recommendations.length === 0) return null;

  return (
    <section aria-labelledby="recs-title" className="flex flex-col gap-3">
      <h2 id="recs-title" className="section-label">
        Qué puedes hacer
      </h2>
      <ol className="flex flex-col divide-y divide-dashed divide-ink/15">
        {recommendations.map((rec, index) => (
          <li key={rec.title} className="flex gap-4 py-4">
            <span
              aria-hidden="true"
              className="w-5 font-display text-2xl font-medium leading-none text-moss tabular-nums"
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <h3 className="text-base font-semibold leading-snug text-ink">{rec.title}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{rec.detail}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={`inline-block h-2 w-2 rounded-full ${IMPACT_DOT[rec.impact]}`}
                  />
                  Impacto {rec.impact}
                </span>
                <span>Dificultad {rec.effort}</span>
                <span className="inline-flex items-center gap-1">
                  <CategoryIcon category={rec.category} className="h-3.5 w-3.5" />
                  {CATEGORY_META[rec.category].label}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-ink-faint">
        Impacto cualitativo: no inventamos cifras de ahorro.
      </p>
    </section>
  );
}
