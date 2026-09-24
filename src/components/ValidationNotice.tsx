import type { AnalysisResult } from "@/lib/types";

type ValidationNoticeProps = {
  validation: AnalysisResult["validation"];
  onAnswer?: (question: string) => void;
};

/** Observaciones de la validación y, si hace falta, la única pregunta de aclaración. */
export function ValidationNotice({ validation, onAnswer }: ValidationNoticeProps) {
  const { issues, clarifyingQuestion } = validation;
  if (issues.length === 0 && !clarifyingQuestion) return null;

  return (
    <section aria-labelledby="validation-title" className="flex flex-col gap-3">
      <h2
        id="validation-title"
        className="font-mono text-xs uppercase tracking-widest text-ink-soft"
      >
        Revisión de tus datos
      </h2>

      {issues.length > 0 && (
        <ul className="flex flex-col gap-2">
          {issues.map((issue) => {
            const warning = issue.severity === "warning";
            return (
              <li
                key={issue.message}
                className={`flex gap-3 rounded-sm border-l-2 px-3 py-2 text-sm leading-relaxed text-ink ${
                  warning ? "border-clay bg-clay/10" : "border-lichen bg-lichen/20"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ${
                    warning ? "bg-clay-deep text-paper" : "bg-moss text-paper"
                  }`}
                >
                  {warning ? "!" : "i"}
                </span>
                <p>
                  <span className={`font-semibold ${warning ? "text-clay-deep" : "text-moss"}`}>
                    {warning ? "Ojo: " : "Nota: "}
                  </span>
                  {issue.message}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {clarifyingQuestion && (
        <div className="flex flex-col gap-3 rounded-sm border border-ink/15 bg-paper-deep/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="font-mono text-[0.7rem] uppercase tracking-widest text-ink-soft">
              Eco pregunta
            </p>
            <p className="font-display text-lg leading-snug text-ink">{clarifyingQuestion}</p>
          </div>
          {onAnswer && (
            <button
              type="button"
              onClick={() => onAnswer(clarifyingQuestion)}
              className="shrink-0 self-start rounded-sm border border-moss px-4 py-2 text-sm font-medium text-moss transition-colors hover:bg-moss hover:text-paper sm:self-center"
            >
              Responder
            </button>
          )}
        </div>
      )}
    </section>
  );
}
