import {
  pipelineHeadline,
  STAGE_ORDER,
  STAGE_TITLES,
  stageSubtitle,
  type PipelineState,
} from "@/lib/client/pipeline-state";
import type { StageStatus } from "@/lib/types";

const STATUS_TEXT: Record<StageStatus, string> = {
  pending: "pendiente",
  running: "en curso",
  done: "listo",
  skipped: "omitido",
  error: "con error",
};

type PipelineProgressProps = {
  pipeline: PipelineState;
};

/** Participios para la línea plegada: "Interpretado · Validado · Calculado · Explicado". */
const DONE_TITLES: Record<(typeof STAGE_ORDER)[number], string> = {
  extract: "Interpretado",
  validate: "Validado",
  calculate: "Calculado",
  explain: "Explicado",
};

/** ¿Terminó bien? Entonces el pipeline se pliega en una línea discreta. */
function isFolded(pipeline: PipelineState): boolean {
  return (
    pipeline.outcome === "result" && STAGE_ORDER.every((id) => pipeline.stages[id].status === "done")
  );
}

/**
 * Las 4 etapas del pipeline. Mientras trabaja (o si algo falla) se ven completas;
 * cuando termina bien se pliegan en una sola línea para no competir con el resultado.
 */
export function PipelineProgress({ pipeline }: PipelineProgressProps) {
  const folded = isFolded(pipeline);

  return (
    <section aria-labelledby="pipeline-title" className={`flex flex-col ${folded ? "" : "gap-3"}`}>
      {/* Mismo nodo en ambos modos: la región aria-live no se desmonta y anuncia el "Listo". */}
      <div className={folded ? "sr-only" : "flex flex-wrap items-baseline justify-between gap-2"}>
        <h2 id="pipeline-title" className="section-label">
          {folded ? "Lo que hizo Eco" : "Lo que está haciendo Eco"}
        </h2>
        <p aria-live="polite" className="font-mono text-xs text-ink-soft">
          {pipelineHeadline(pipeline)}
        </p>
      </div>

      {folded ? (
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.6875rem] text-ink-faint">
          {STAGE_ORDER.map((id, index) => (
            <li key={id} className="inline-flex items-center gap-2">
              {index === 0 ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-3 w-3 text-moss"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3.5 8.5 3 3 6-7" />
                </svg>
              ) : (
                <span aria-hidden="true" className="text-ink/30">
                  ·
                </span>
              )}
              <span>
                {DONE_TITLES[id]}
                <span className="sr-only">: {STATUS_TEXT.done}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ol className="grid gap-x-6 sm:grid-cols-4">
          {STAGE_ORDER.map((id, index) => {
            const { status } = pipeline.stages[id];
            return (
              <li
                key={id}
                aria-current={status === "running" ? "step" : undefined}
                className={`relative flex items-center gap-3 rounded-sm px-2 py-3 transition-colors duration-200 sm:flex-col sm:items-start sm:gap-2 ${
                  status === "running" ? "bg-signal-soft" : ""
                }`}
              >
                <span aria-hidden="true" className="dotted-rule absolute inset-x-2 top-0" />
                <StageMarker status={status} index={index} />
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      status === "pending" || status === "skipped" ? "text-ink-soft" : "text-ink"
                    }`}
                  >
                    {STAGE_TITLES[id]}
                    <span className="sr-only">: {STATUS_TEXT[status]}</span>
                  </p>
                  <p className="text-xs text-ink-soft">{stageSubtitle(id, pipeline)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function StageMarker({ status, index }: { status: StageStatus; index: number }) {
  const base =
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs";

  if (status === "done") {
    return (
      <span aria-hidden="true" className={`${base} bg-moss text-paper`}>
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3.5 8.5 3 3 6-7" />
        </svg>
      </span>
    );
  }
  if (status === "running") {
    return (
      <span
        aria-hidden="true"
        className={`${base} animate-stage-pulse border border-ink bg-signal font-semibold text-ink`}
      >
        {index + 1}
      </span>
    );
  }
  if (status === "error") {
    return (
      <span aria-hidden="true" className={`${base} bg-clay-deep font-semibold text-paper`}>
        !
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span aria-hidden="true" className={`${base} border border-dashed border-ink/40 text-ink-soft`}>
        –
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`${base} border border-ink/30 text-ink-soft`}>
      {index + 1}
    </span>
  );
}
