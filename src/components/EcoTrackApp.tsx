"use client";

import { useEffect, useRef, useState } from "react";

import { Breakdown } from "@/components/Breakdown";
import { CarbonReceipt } from "@/components/CarbonReceipt";
import { Composer } from "@/components/Composer";
import { ErrorState, type AnalysisError } from "@/components/ErrorState";
import { History } from "@/components/History";
import { HowItWorks } from "@/components/HowItWorks";
import { ModeBadge } from "@/components/ModeBadge";
import { PipelineProgress } from "@/components/PipelineProgress";
import { Recommendations } from "@/components/Recommendations";
import { ResultSummary } from "@/components/ResultSummary";
import { ValidationNotice } from "@/components/ValidationNotice";
import { saveToHistory } from "@/lib/client/history";
import { hasTotal } from "@/lib/client/result-view";
import {
  pipelineForResult,
  pipelineReducer,
  startPipeline,
  type PipelineState,
} from "@/lib/client/pipeline-state";
import { MAX_INPUT_LENGTH, runAnalysis } from "@/lib/client/run-analysis";
import { formatDateTime } from "@/lib/format";
import type { AnalysisResult, StreamEvent } from "@/lib/types";

type Phase = "idle" | "processing" | "result" | "error";

/** Orquesta el flujo: idle → processing (pipeline) → result | error. */
export function EcoTrackApp() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [pipeline, setPipeline] = useState<PipelineState>(() => startPipeline());
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
    // El indicador del pipeline (etapas, desenlace y modo) se deriva de todos los eventos.
    setPipeline((prev) => pipelineReducer(prev, event));
    switch (event.type) {
      case "result":
        setResult(event.data);
        setPhase("result");
        saveToHistory(event.data);
        break;
      case "error":
        setError(event);
        setPhase("error");
        break;
    }
  }

  async function analyze(input: string, mode: "auto" | "demo" = "auto") {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLastSubmitted(input);
    setError(null);
    setPipeline(startPipeline());
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
    setPipeline(pipelineForResult(item));
    setResult(item);
    setPhase("result");
  }

  function answerQuestion(question: string) {
    const base = (text.trim() || result?.input || "").trim();
    focusComposer(`${base}\n\nSobre «${question}»: `.slice(0, MAX_INPUT_LENGTH));
  }

  /** Total 0: vuelve al texto (el que se envió) para corregir el dato. */
  function correctInput() {
    focusComposer((text.trim() || result?.input || "").trim());
  }

  function focusComposer(next: string) {
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
        <div className="flex flex-col gap-6">
          <div ref={progressRef} className="scroll-mb-6">
            <PipelineProgress pipeline={pipeline} />
          </div>

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
              className="flex scroll-mt-6 flex-col gap-8 outline-none animate-rise"
            >
              <div className="flex flex-col gap-3">
                <div aria-hidden="true" className="dotted-rule" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="section-label">Tu recibo · {formatDateTime(result.createdAt)}</p>
                  <ModeBadge mode={result.mode} model={result.model} />
                </div>
              </div>

              {/*
               * Orden del DOM = orden en el celular: primero el número y la frase de Eco,
               * luego lo que se puede hacer y, al final, el recibo con todo el detalle.
               * En escritorio el recibo vuelve a la columna izquierda.
               */}
              <div className="grid items-start gap-12 lg:grid-cols-[440px_minmax(0,1fr)] lg:gap-14">
                <div className="flex min-w-0 flex-col gap-10 lg:col-start-2 lg:row-start-1">
                  <ResultSummary
                    result={result}
                    // Si Eco ya pregunta algo, su botón «Responder» es la acción: no duplicamos.
                    onCorrect={result.validation.clarifyingQuestion ? undefined : correctInput}
                  />
                  <ValidationNotice validation={result.validation} onAnswer={answerQuestion} />
                  {hasTotal(result) && <Breakdown byCategory={result.byCategory} />}
                  <Recommendations recommendations={result.recommendations} />
                </div>
                <div
                  id="recibo"
                  className="mx-auto w-full max-w-[440px] scroll-mt-6 lg:col-start-1 lg:row-start-1"
                >
                  <CarbonReceipt result={result} />
                </div>
              </div>
            </div>
          )}
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
