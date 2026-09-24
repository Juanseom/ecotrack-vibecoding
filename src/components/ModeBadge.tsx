import type { AnalysisResult } from "@/lib/types";

type ModeBadgeProps = {
  mode: AnalysisResult["mode"];
  model?: string;
};

/** Indica quién interpretó el texto: Claude o el analizador por reglas del modo demo. */
export function ModeBadge({ mode, model }: ModeBadgeProps) {
  const isAi = mode === "ai";
  return (
    <details className="group relative inline-block">
      <summary
        className={`inline-flex cursor-pointer list-none items-center gap-2 rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider [&::-webkit-details-marker]:hidden ${
          isAi ? "border-moss/50 text-moss" : "border-dashed border-ink/35 text-ink-soft"
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${isAi ? "bg-moss" : "border border-dashed border-ink-soft"}`}
        />
        {isAi ? "IA · Claude" : "Modo demo · interpretación simulada"}
        <span aria-hidden="true" className="text-ink-soft group-open:rotate-180">
          ▾
        </span>
        <span className="sr-only">(ver explicación)</span>
      </summary>
      <div className="absolute left-0 z-10 mt-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-sm border border-ink/15 bg-receipt p-3 text-sm leading-relaxed text-ink shadow-[0_12px_30px_-12px_rgb(22_36_28/0.35)]">
        {isAi ? (
          <p>
            Claude{model ? ` (${model})` : ""} leyó tu texto, revisó los datos y redactó la lectura.
            Los kg CO₂e los calcula siempre nuestro código con factores referenciales, nunca la IA.
          </p>
        ) : (
          <p>
            Sin clave de IA configurada: un intérprete por reglas lee tu texto. Los cálculos son
            los mismos. Funciona mejor con frases simples, con cantidades y unidades.
          </p>
        )}
      </div>
    </details>
  );
}
