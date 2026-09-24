"use client";

import { useState, useSyncExternalStore } from "react";

import {
  clearHistory,
  getHistoryServerSnapshot,
  getHistorySnapshot,
  subscribeHistory,
} from "@/lib/client/history";
import { hasTotal } from "@/lib/client/result-view";
import { firstWords, formatKg, formatShortDate } from "@/lib/format";
import type { AnalysisResult } from "@/lib/types";

type HistoryProps = {
  activeId?: string;
  onOpen: (result: AnalysisResult) => void;
};

/** "Tus días anteriores": los últimos análisis guardados en este navegador. */
export function History({ activeId, onOpen }: HistoryProps) {
  const items = useSyncExternalStore(subscribeHistory, getHistorySnapshot, getHistoryServerSnapshot);
  const [confirming, setConfirming] = useState(false);

  return (
    <section aria-labelledby="history-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="history-title" className="section-label">
          Tus días anteriores
        </h2>
        {items.length > 0 &&
          (confirming ? (
            <p className="flex items-center gap-2 text-xs text-ink-soft">
              ¿Borrar todo?
              <button
                type="button"
                onClick={() => {
                  clearHistory();
                  setConfirming(false);
                }}
                className="rounded-sm font-semibold text-clay-deep underline underline-offset-2"
              >
                Sí, borrar
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-sm text-ink underline underline-offset-2"
              >
                Cancelar
              </button>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-sm text-xs text-ink-soft underline underline-offset-2 hover:text-clay-deep"
            >
              Borrar historial
            </button>
          ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Aún no hay días guardados. Cada cálculo se guarda aquí, sólo en este navegador.
        </p>
      ) : (
        <ul className="-mx-3 flex flex-col divide-y divide-dashed divide-ink/15">
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  aria-current={active ? "true" : undefined}
                  className={`grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-3 rounded-sm px-3 py-2.5 text-left transition-colors hover:bg-paper-deep/60 ${
                    active ? "bg-lichen/20" : ""
                  }`}
                >
                  <span className="whitespace-nowrap font-mono text-xs text-ink-soft">
                    {formatShortDate(item.createdAt)}
                  </span>
                  <span className="truncate text-sm text-ink">{firstWords(item.input)}</span>
                  <span className="font-mono text-sm tabular-nums text-ink">
                    {hasTotal(item) ? `${formatKg(item.totalKg)} kg` : "sin total"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
