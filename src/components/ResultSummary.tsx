import { LeafMark } from "@/components/LeafMark";
import { hasTotal } from "@/lib/client/result-view";
import { formatKg, formatNumber } from "@/lib/format";
import type { AnalysisResult } from "@/lib/types";

type ResultSummaryProps = {
  result: AnalysisResult;
  /** Lleva al campo de texto para corregir el dato (sólo cuando no hay nada que sumar). */
  onCorrect?: () => void;
};

/**
 * Lo primero que se ve del resultado: el total grande y la frase de Eco con el hallazgo
 * principal. El detalle (recibo, desglose, supuestos) queda después, para quien lo quiera.
 * Si no hay nada que sumar, no finge un "0,0": lo dice e invita a corregir el dato.
 */
export function ResultSummary({ result, onCorrect }: ResultSummaryProps) {
  const { analysis, equivalences } = result;
  const withTotal = hasTotal(result);

  return (
    <section aria-labelledby="analysis-title" className="flex flex-col gap-4">
      <p className="section-label flex items-center gap-2">
        <LeafMark className="h-4 w-4" />
        {withTotal ? "Tu huella de hoy" : "Lectura de Eco"}
      </p>

      {withTotal && (
        <div className="flex flex-col gap-2">
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-display text-6xl font-medium leading-none tracking-tight text-ink tabular-nums sm:text-7xl">
              {formatKg(result.totalKg)}
            </span>
            <span className="font-mono text-base text-ink-soft">kg CO₂e</span>
          </p>
          <p className="max-w-prose text-sm leading-relaxed text-ink-soft">
            Una estimación. Es como recorrer{" "}
            <span className="whitespace-nowrap text-ink">
              ≈ {formatNumber(equivalences.carKm)} km
            </span>{" "}
            en auto a gasolina, o lo que absorben{" "}
            <span className="whitespace-nowrap text-ink">
              ≈ {formatNumber(equivalences.treeYears, 1)} árboles
            </span>{" "}
            en un año.
          </p>
        </div>
      )}

      <div className={`flex flex-col gap-2 ${withTotal ? "mt-2" : ""}`}>
        <h2
          id="analysis-title"
          className={`font-display font-medium leading-tight tracking-tight text-ink ${
            withTotal ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"
          }`}
        >
          {analysis.headline}
        </h2>
        <p className="max-w-prose text-base leading-relaxed text-ink-soft">{analysis.summary}</p>
      </div>

      {!withTotal && onCorrect && (
        <div>
          <button
            type="button"
            onClick={onCorrect}
            className="rounded-sm bg-moss px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink"
          >
            Corregir el dato
          </button>
        </div>
      )}

      <a
        href="#recibo"
        className="self-start rounded-sm text-sm text-moss underline decoration-moss/40 underline-offset-4 hover:decoration-moss lg:hidden"
      >
        Ver el recibo línea por línea <span aria-hidden="true">↓</span>
      </a>
    </section>
  );
}
