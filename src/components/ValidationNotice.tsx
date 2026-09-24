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
      <h2 id="validation-title" className="section-label">
        Revisión de tus datos
      </h2>

      {issues.length > 0 && (
        <ul className="flex flex-col gap-2">
          {issues.map((issue) => {
            const warning = issue.severity === "warning";
            return (
              <li
                key={issue.message}
                className="flex gap-3 text-sm leading-relaxed text-ink"
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[0.7rem] font-semibold ${
                    warning ? "border-clay-deep text-clay-deep" : "border-moss/60 text-moss"
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
        <div className="mt-1 flex flex-col gap-3 border-l-2 border-moss pl-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="section-label">Eco pregunta</p>
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
