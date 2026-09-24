"use client";

import { useId, useState, type FormEvent, type KeyboardEvent, type Ref } from "react";

import { MAX_INPUT_LENGTH } from "@/lib/client/run-analysis";
import { EXAMPLES } from "@/lib/examples";
import { formatNumber } from "@/lib/format";

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
  busy: boolean;
  textareaRef?: Ref<HTMLTextAreaElement>;
};

/** La hoja de cuaderno donde el usuario escribe su día. */
export function Composer({ value, onChange, onSubmit, busy, textareaRef }: ComposerProps) {
  const id = useId();
  const [showEmptyHint, setShowEmptyHint] = useState(false);
  const fieldId = `${id}-field`;
  const hintId = `${id}-hint`;
  const counterId = `${id}-counter`;
  const emptyId = `${id}-empty`;

  function submit() {
    if (busy) return;
    if (!value.trim()) {
      setShowEmptyHint(true);
      return;
    }
    setShowEmptyHint(false);
    onSubmit(value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  }

  function handleChange(next: string) {
    if (showEmptyHint && next.trim()) setShowEmptyHint(false);
    onChange(next);
  }

  const nearLimit = value.length > MAX_INPUT_LENGTH * 0.9;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-3">
        <label
          htmlFor={fieldId}
          className="font-mono text-xs uppercase tracking-widest text-ink-soft"
        >
          Hoy, en mi negocio…
        </label>

        <div className="relative rounded-sm border border-ink/15 bg-paper-deep/60 shadow-[0_1px_0_rgb(22_36_28/0.06),0_12px_30px_-18px_rgb(22_36_28/0.35)] transition-colors focus-within:border-moss/60 has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-3 has-[textarea:focus-visible]:outline-moss">
          <textarea
            ref={textareaRef}
            id={fieldId}
            name="day"
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy}
            maxLength={MAX_INPUT_LENGTH}
            rows={5}
            spellCheck
            placeholder="Hoy usamos 5 camionetas de reparto durante 8 horas y gastamos 200 kWh de luz."
            aria-describedby={`${hintId} ${counterId}${showEmptyHint ? ` ${emptyId}` : ""}`}
            aria-invalid={showEmptyHint || undefined}
            className="notebook-lines notebook-field block min-h-56 w-full resize-y rounded-sm bg-transparent py-6 pl-16 pr-5 text-lg leading-8 text-ink outline-none placeholder:italic placeholder:text-ink-soft disabled:cursor-progress disabled:text-ink-soft sm:pr-8"
          />
          <p
            id={counterId}
            className={`pointer-events-none absolute bottom-2 right-3 font-mono text-[0.7rem] tabular-nums ${
              nearLimit ? "text-clay-deep" : "text-ink-soft"
            }`}
          >
            <span className="sr-only">Caracteres usados: </span>
            {formatNumber(value.length)} / {formatNumber(MAX_INPUT_LENGTH)}
          </p>
        </div>

        <p id={hintId} className="text-sm leading-relaxed text-ink-soft">
          Escribe con tus palabras: cantidades y unidades ayudan (kWh, litros, km, horas, kg).
        </p>

        {showEmptyHint && (
          <p
            id={emptyId}
            role="alert"
            className="flex items-start gap-2 rounded-sm border-l-2 border-clay bg-clay/10 px-3 py-2 text-sm text-ink"
          >
            <span aria-hidden="true" className="font-mono text-clay-deep">
              ✎
            </span>
            Cuéntanos al menos una cosa de tu día, por ejemplo: “gastamos 200 kWh de luz”. O
            prueba uno de los ejemplos de abajo.
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-2" disabled={busy}>
        <legend className="mb-2 font-mono text-[0.7rem] uppercase tracking-widest text-ink-soft">
          ¿Sin ideas? Prueba un ejemplo
        </legend>
        <ul className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <li key={example.label}>
              <button
                type="button"
                onClick={() => {
                  handleChange(example.text);
                  document.getElementById(fieldId)?.focus();
                }}
                title={example.text}
                aria-label={`Usar ejemplo: ${example.text}`}
                className="rounded-full border border-dashed border-ink/30 bg-paper px-3 py-1.5 text-sm text-ink transition-colors hover:border-moss hover:bg-lichen/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {example.label}
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="submit"
          disabled={busy}
          aria-disabled={busy}
          className="inline-flex items-center gap-2 rounded-sm bg-moss px-5 py-3 text-base font-medium text-paper shadow-[0_2px_0_rgb(22_36_28/0.35)] transition-[background-color,transform] hover:bg-ink active:translate-y-px disabled:cursor-progress disabled:bg-moss/85"
        >
          {busy ? "Calculando…" : "Calcular mi huella"}
          <span aria-hidden="true">→</span>
        </button>
        <p className="font-mono text-xs text-ink-soft">
          o pulsa{" "}
          <kbd className="rounded-sm border border-ink/25 bg-paper px-1.5 py-0.5 font-mono text-[0.7rem] text-ink">
            Ctrl
          </kbd>{" "}
          /{" "}
          <kbd className="rounded-sm border border-ink/25 bg-paper px-1.5 py-0.5 font-mono text-[0.7rem] text-ink">
            ⌘
          </kbd>{" "}
          +{" "}
          <kbd className="rounded-sm border border-ink/25 bg-paper px-1.5 py-0.5 font-mono text-[0.7rem] text-ink">
            Enter
          </kbd>
        </p>
      </div>
    </form>
  );
}
