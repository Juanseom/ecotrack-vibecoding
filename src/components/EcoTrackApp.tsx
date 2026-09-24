"use client";

import { useEffect, useRef, useState } from "react";

import { AnalysisCard } from "@/components/AnalysisCard";
import { Breakdown } from "@/components/Breakdown";
import { CarbonReceipt } from "@/components/CarbonReceipt";
import { Composer } from "@/components/Composer";
import { ErrorState, type AnalysisError } from "@/components/ErrorState";
import { History } from "@/components/History";
import { HowItWorks } from "@/components/HowItWorks";
import { ModeBadge } from "@/components/ModeBadge";
import {
  initialPipeline,
  PipelineProgress,
  type PipelineState,
} from "@/components/PipelineProgress";
import { Recommendations } from "@/components/Recommendations";
import { ValidationNotice } from "@/components/ValidationNotice";
import { saveToHistory } from "@/lib/client/history";
import { MAX_INPUT_LENGTH, runAnalysis } from "@/lib/client/run-analysis";
import { formatDateTime } from "@/lib/format";
import type { AnalysisResult, StageId, StreamEvent } from "@/lib/types";

type Phase = "idle" | "processing" | "result" | "error";

/** Orquesta el flujo: idle → processing (pipeline) → result | error. */
export function EcoTrackApp() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stages, setStages] = useState<PipelineState>(() => initialPipeline());
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<AnalysisError | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cancela cualquier análisis en curso al desmontar.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Al empezar a procesar, asegura que el progreso del pipeline esté a la vista.
  useEffect(() => {
    if (phase !== "processing") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    progressRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [phase]);

  // Al llegar (o reabrir) un resultado, lleva la vista suavemente hacia él.
  useEffect(() => {
    if (phase !== "result" || !result) return;
    const node = resultRef.current;
    if (!node) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    node.focus({ preventScroll: true });
  }, [phase, result]);

  function handleEvent(event: StreamEvent) {
    switch (event.type) {
      case "stage":
        setStages((prev) => ({
          ...prev,
          [event.stage]: { status: event.status, detail: event.detail },
        }));
        break;
      case "result":
        setResult(event.data);
        setPhase("result");
        saveToHistory(event.data);
        break;
      case "error":
        setError(event);
        setPhase("error");
        setStages(markRunningAsError);
        break;
    }
  }

  async function analyze(input: string, mode: "auto" | "demo" = "auto") {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLastSubmitted(input);
    setError(null);
    setStages(initialPipeline());
    setPhase("processing");

    await runAnalysis(
      input,
      (event) => {
        if (!controller.signal.aborted) handleEvent(event);
      },
      { signal: controller.signal, mode },
    );
  }

  function openFromHistory(item: AnalysisResult) {
    abortRef.current?.abort();
    setError(null);
    setStages(initialPipeline("done"));
    setResult(item);
    setPhase("result");
  }

  function answerQuestion(question: string) {
    const base = (text.trim() || result?.input || "").trim();
    const next = `${base}\n\nSobre «${question}»: `.slice(0, MAX_INPUT_LENGTH);
    setText(next);
    const field = textareaRef.current;
    if (!field) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    field.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    field.focus({ preventScroll: true });
    // El valor nuevo se aplica en el próximo render; coloca el cursor al final.
    requestAnimationFrame(() => field.setSelectionRange(next.length, next.length));
  }

  const busy = phase === "processing";

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      <section aria-label="Escribe tu día" className="max-w-3xl">
        <Composer
          value={text}
          onChange={setText}
          onSubmit={analyze}
          busy={busy}
          textareaRef={textareaRef}
        />
      </section>

      {phase !== "idle" && (
        <div ref={progressRef} className="scroll-mb-6">
          <PipelineProgress stages={stages} />
        </div>
      )}

      {phase === "error" && error && (
        <div className="max-w-3xl">
          <ErrorState
            error={error}
            onRetry={() => analyze(lastSubmitted)}
            onRetryDemo={() => analyze(lastSubmitted, "demo")}
          />
        </div>
      )}

      {phase === "result" && result && (
        <div
          ref={resultRef}
          tabIndex={-1}
          aria-label="Resultado del análisis"
          role="region"
          className="flex scroll-mt-6 flex-col gap-6 outline-none animate-rise"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-ink/20 pb-4">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
              Tu recibo · {formatDateTime(result.createdAt)}
            </p>
            <ModeBadge mode={result.mode} model={result.model} />
          </div>

          <div className="grid items-start gap-10 lg:grid-cols-[440px_minmax(0,1fr)] lg:gap-12">
            <div className="mx-auto w-full max-w-[440px]">
              <CarbonReceipt result={result} />
            </div>
            <div className="flex min-w-0 flex-col gap-10">
              <AnalysisCard analysis={result.analysis} />
              <Breakdown byCategory={result.byCategory} equivalences={result.equivalences} />
              <ValidationNotice validation={result.validation} onAnswer={answerQuestion} />
              <Recommendations recommendations={result.recommendations} />
            </div>
          </div>
        </div>
      )}

      {phase === "idle" && <HowItWorks />}

      <div className="max-w-3xl">
        <History
          activeId={phase === "result" ? result?.id : undefined}
          onOpen={openFromHistory}
        />
      </div>
    </div>
  );
}

function markRunningAsError(prev: PipelineState): PipelineState {
  const next = { ...prev };
  for (const id of Object.keys(next) as StageId[]) {
    if (next[id].status === "running") next[id] = { status: "error" };
  }
  return next;
}
