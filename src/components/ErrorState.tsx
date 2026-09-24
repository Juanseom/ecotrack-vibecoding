import { presentError, type AnalysisError } from "@/lib/client/error-presentation";

export type { AnalysisError } from "@/lib/client/error-presentation";

type ErrorStateProps = {
  error: AnalysisError;
  onRetry: () => void;
  /** Reintenta con el intérprete por reglas (se ofrece sólo si falló la IA). */
  onRetryDemo?: () => void;
};

const PRIMARY =
  "rounded-sm bg-moss px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink";
const SECONDARY =
  "rounded-sm border border-dashed border-ink/40 bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-moss hover:bg-lichen/25";

/** Error en lenguaje humano, siempre con una acción para seguir. */
export function ErrorState({ error, onRetry, onRetryDemo }: ErrorStateProps) {
  const view = presentError(error);
  const offerDemo = Boolean(onRetryDemo) && view.demo;
  // Nunca dejamos al usuario sin ninguna acción.
  const offerRetry = view.retry || !offerDemo;
  const demoFirst = offerDemo && view.primary === "demo";

  const retryButton = offerRetry && (
    <button type="button" onClick={onRetry} className={demoFirst ? SECONDARY : PRIMARY}>
      Intentar de nuevo
    </button>
  );
  const demoButton = offerDemo && (
    <button type="button" onClick={onRetryDemo} className={demoFirst ? PRIMARY : SECONDARY}>
      Probar en modo demo
    </button>
  );

  return (
    <section
      role="alert"
      aria-labelledby="error-title"
      className="flex flex-col gap-3 rounded-sm border border-clay/60 border-l-4 bg-clay/10 p-5"
    >
      <p className="font-mono text-xs uppercase tracking-widest text-clay-deep">No pudimos terminar</p>
      <h2 id="error-title" className="font-display text-2xl font-medium leading-tight text-ink">
        {view.title}
      </h2>
      <p className="text-sm leading-relaxed text-ink">{view.hint}</p>
      {error.message && error.message !== view.title && (
        <p className="font-mono text-xs text-ink-soft">Detalle: {error.message}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {demoFirst ? (
          <>
            {demoButton}
            {retryButton}
          </>
        ) : (
          <>
            {retryButton}
            {demoButton}
          </>
        )}
      </div>
    </section>
  );
}
