import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORY_META } from "@/lib/categories";
import type { Recommendation } from "@/lib/types";

type RecommendationsProps = {
  recommendations: Recommendation[];
};

const IMPACT_STYLE: Record<Recommendation["impact"], string> = {
  alto: "border-clay/70 bg-clay/10 text-clay-deep",
  medio: "border-moss/50 bg-lichen/30 text-moss",
  bajo: "border-ink/25 bg-paper text-ink-soft",
};

/** Tres acciones concretas, numeradas, con impacto y dificultad como etiquetas. */
export function Recommendations({ recommendations }: RecommendationsProps) {
  if (recommendations.length === 0) return null;

  return (
    <section aria-labelledby="recs-title" className="flex flex-col gap-3">
      <h2 id="recs-title" className="font-mono text-xs uppercase tracking-widest text-ink-soft">
        Qué puedes hacer
      </h2>
      <ol className="flex flex-col divide-y divide-dashed divide-ink/20 border-y border-dashed border-ink/20">
        {recommendations.map((rec, index) => (
          <li key={rec.title} className="flex gap-4 py-4">
            <span
              aria-hidden="true"
              className="font-display text-3xl font-medium leading-none text-moss tabular-nums"
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <h3 className="text-base font-semibold leading-snug text-ink">{rec.title}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{rec.detail}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[0.7rem] uppercase tracking-wider">
                <span className={`rounded-sm border px-1.5 py-px ${IMPACT_STYLE[rec.impact]}`}>
                  Impacto {rec.impact}
                </span>
                <span className="rounded-sm border border-ink/25 bg-paper px-1.5 py-px text-ink-soft">
                  Dificultad {rec.effort}
                </span>
                <span className="inline-flex items-center gap-1 text-ink-soft normal-case tracking-normal">
                  <CategoryIcon category={rec.category} className="h-3.5 w-3.5" />
                  {CATEGORY_META[rec.category].label}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-ink-soft">
        Impacto cualitativo: no inventamos cifras de ahorro.
      </p>
    </section>
  );
}
