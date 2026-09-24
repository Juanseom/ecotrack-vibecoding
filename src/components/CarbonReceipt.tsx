import { DataBadge, DATA_ORIGINS } from "@/components/DataBadge";
import { dataOriginCopy } from "@/lib/data-origin";
import { LeafMark } from "@/components/LeafMark";
import { formatAmount, formatDateTime, formatKg, receiptNumber } from "@/lib/format";
import type { AnalysisResult, ReceiptLine } from "@/lib/types";

type CarbonReceiptProps = {
  result: AnalysisResult;
};

/**
 * El recibo de carbono: la pieza central. Cada línea deja ver de dónde sale cada dato
 * (lo que dijiste, lo que se interpretó, lo supuesto y el factor) y la operación exacta.
 */
export function CarbonReceipt({ result }: CarbonReceiptProps) {
  return (
    <article
      aria-labelledby="receipt-title"
      className="relative w-full drop-shadow-[0_10px_18px_rgb(22_36_28/0.16)]"
    >
      <div className="receipt-paper px-5 pb-10 pt-10 font-mono text-[0.8125rem] leading-relaxed text-ink sm:px-7">
        {/* Encabezado */}
        <header className="flex flex-col items-center gap-1 text-center">
          <p className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.25em] text-ink-soft">
            <LeafMark className="h-4 w-4" />
            EcoTrack AI
          </p>
          <h2
            id="receipt-title"
            className="text-lg font-semibold uppercase tracking-[0.2em] text-ink"
          >
            Recibo de carbono
          </h2>
          <p className="text-[0.7rem] uppercase tracking-widest text-ink-soft">
            Cuaderno de campo · kg CO₂e
          </p>
        </header>

        <Rule />

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-xs">
          <dt className="text-ink-soft">Fecha</dt>
          <dd className="text-right tabular-nums">{formatDateTime(result.createdAt)}</dd>
          <dt className="text-ink-soft">Recibo Nº</dt>
          <dd className="text-right tabular-nums">{receiptNumber(result.id)}</dd>
          <dt className="text-ink-soft">Lectura</dt>
          <dd className="text-right">{result.mode === "ai" ? "IA · Claude" : "Modo demo"}</dd>
        </dl>

        <Rule />

        <section aria-label="Tu día" className="flex flex-col gap-1">
          <p className="text-[0.7rem] uppercase tracking-widest text-ink-soft">Tu día</p>
          <p className="font-sans text-sm italic leading-relaxed text-ink">“{result.input}”</p>
        </section>

        <Rule />

        {/* Clave de lectura */}
        <details className="group text-xs">
          <summary className="cursor-pointer list-none rounded-sm text-ink-soft [&::-webkit-details-marker]:hidden hover:text-ink">
            <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">
              ›
            </span>{" "}
            Cómo leer este recibo
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {DATA_ORIGINS.map((origin) => (
              <li key={origin} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <DataBadge origin={origin} mode={result.mode} />
                <span className="font-sans text-ink-soft">{dataOriginCopy(origin, result.mode).description}</span>
              </li>
            ))}
          </ul>
        </details>

        <Rule />

        {/* Líneas */}
        <ol aria-label="Consumos calculados" className="flex flex-col">
          {result.lines.map((line, index) => (
            <li key={line.id} className="flex flex-col">
              {index > 0 && <Rule />}
              <ReceiptLineItem line={line} index={index} mode={result.mode} />
            </li>
          ))}
        </ol>

        {result.unquantified.length > 0 && (
          <>
            <Rule />
            <section aria-labelledby="unquantified-title" className="flex flex-col gap-2">
              <h3
                id="unquantified-title"
                className="text-xs font-semibold uppercase tracking-widest text-ink"
              >
                No cuantificado
              </h3>
              <p className="font-sans text-xs text-ink-soft">
                Lo mencionaste, pero no podemos calcularlo sin inventar ni cambiar tus datos.
              </p>
              <ul className="flex flex-col gap-2">
                {result.unquantified.map((item) => (
                  <li key={`${item.label}-${item.quote}`} className="flex flex-col gap-1">
                    <p className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold uppercase">{item.label}</span>
                      <span className="shrink-0 text-ink-soft">— kg</span>
                    </p>
                    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <DataBadge origin="user" mode={result.mode} />
                      <q className="font-sans italic">{item.quote}</q>
                    </p>
                    <p className="font-sans text-xs text-ink-soft">{item.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {/* Total */}
        <div aria-hidden="true" className="mt-5 border-t-[3px] border-double border-ink/60" />
        <section
          aria-label="Total estimado"
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-4"
        >
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-widest text-ink-soft">Total estimado</p>
            <p className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-medium tabular-nums leading-none tracking-tight text-ink">
                {formatKg(result.totalKg)}
              </span>
              <span className="text-sm">kg CO₂e</span>
            </p>
            <p className="text-xs text-ink-soft">
              ≈ {formatAmount(result.totalKg / 1000, 2)} toneladas de CO₂ equivalente
            </p>
          </div>
          <span className="pointer-events-none mr-1 rotate-[-9deg] select-none rounded-sm border-2 border-clay-deep/85 px-2 py-0.5 text-xs font-bold uppercase tracking-[0.2em] text-clay-deep outline-1 outline-offset-2 outline-clay-deep/50 [outline-style:solid]">
            Estimación
          </span>
        </section>

        <Rule />

        <footer className="flex flex-col items-center gap-3 text-center">
          <p className="font-sans text-xs leading-relaxed text-ink-soft">
            Estimación con factores referenciales y simplificados. No es una medición ni una
            auditoría.
          </p>
          <div aria-hidden="true" className="barcode h-9 w-44 opacity-80" />
          <p className="text-[0.7rem] uppercase tracking-widest text-ink-soft">
            Gracias por medir · Eco
          </p>
        </footer>
      </div>
    </article>
  );
}

function ReceiptLineItem({
  line,
  index,
  mode,
}: {
  line: ReceiptLine;
  index: number;
  mode: AnalysisResult["mode"];
}) {
  return (
    <div className="flex flex-col gap-2 py-1">
      <p className="flex items-baseline justify-between gap-3">
        <span className="font-semibold uppercase">
          <span className="text-ink-soft">{String(index + 1).padStart(2, "0")} </span>
          {line.label}
        </span>
        <span className="shrink-0 font-semibold tabular-nums">{formatKg(line.kgCO2e)} kg</span>
      </p>

      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <DataBadge origin="user" mode={mode} />
        <q className="font-sans italic">{line.quote}</q>
      </p>

      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <DataBadge origin="ai" mode={mode} />
        <span>{line.interpreted}</span>
      </p>

      {line.steps.length > 0 && (
        <ul aria-label="Pasos del cálculo" className="flex flex-col pl-1 text-ink-soft">
          {line.steps.map((step) => (
            <li key={step} className="tabular-nums">
              <span aria-hidden="true">↳ </span>
              {step}
            </li>
          ))}
        </ul>
      )}

      {line.assumptions.map((assumption) => (
        <p key={assumption} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <DataBadge origin="assumption" mode={mode} />
          <span className="font-sans text-xs">{assumption}</span>
        </p>
      ))}

      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <DataBadge origin="factor" mode={mode} />
        <span className="font-sans text-xs text-ink-soft">
          {line.factor.label} · {line.factor.source}
        </span>
      </p>

      {/* La operación: cantidad × factor = resultado */}
      <p className="mt-1 flex flex-wrap items-baseline justify-end gap-x-2 rounded-sm bg-paper-deep/60 px-2 py-1 tabular-nums">
        <span>
          {formatAmount(line.activityAmount)} {line.activityUnit} × {formatAmount(line.factor.value, 3)}{" "}
          {line.factor.unit}
        </span>
        <span className="font-semibold">= {formatKg(line.kgCO2e)} kg CO₂e</span>
      </p>
    </div>
  );
}

function Rule() {
  return <div aria-hidden="true" className="receipt-rule my-4" />;
}
