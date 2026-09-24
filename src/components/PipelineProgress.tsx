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

/** Las 4 etapas del pipeline, visibles mientras se procesa y después. */
export function PipelineProgress({ pipeline }: PipelineProgressProps) {
  return (
    <section aria-labelledby="pipeline-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="pipeline-title"
          className="font-mono text-xs uppercase tracking-widest text-ink-soft"
        >
          Lo que está haciendo Eco
        </h2>
        <p aria-live="polite" className="font-mono text-xs text-ink-soft">
          {pipelineHeadline(pipeline)}
        </p>
      </div>

      <ol
        className="grid gap-0 rounded-sm border border-ink/15 bg-paper/70 sm:grid-cols-4"
      >
        {STAGE_ORDER.map((id, index) => {
          const { status } = pipeline.stages[id];
          return (
            <li
              key={id}
              aria-current={status === "running" ? "step" : undefined}
              className={`relative flex items-center gap-3 border-ink/15 px-4 py-3 transition-colors duration-200 not-last:border-b sm:flex-col sm:items-start sm:gap-2 sm:not-last:border-r sm:not-last:border-b-0 ${
                status === "running" ? "bg-signal-soft" : ""
              }`}
            >
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
