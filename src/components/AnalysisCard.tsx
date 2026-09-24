import { LeafMark } from "@/components/LeafMark";
import type { AnalysisResult } from "@/lib/types";

type AnalysisCardProps = {
  analysis: AnalysisResult["analysis"];
};

/** "Lectura de Eco": la conclusión en una frase y el porqué en palabras simples. */
export function AnalysisCard({ analysis }: AnalysisCardProps) {
  return (
    <section aria-labelledby="analysis-title" className="flex flex-col gap-3">
      <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ink-soft">
        <LeafMark className="h-4 w-4" />
        Lectura de Eco
      </p>
      <h2
        id="analysis-title"
        className="font-display text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl"
      >
        {analysis.headline}
      </h2>
      <p className="max-w-prose text-base leading-relaxed text-ink-soft">{analysis.summary}</p>
    </section>
  );
}
