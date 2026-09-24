import type { StreamEvent } from "@/lib/types";

export type AnalysisError = Extract<StreamEvent, { type: "error" }>;

const COPY: Record<AnalysisError["code"], { title: string; hint: string }> = {
  empty_input: {
    title: "Nos falta tu día",
    hint: "Escribe al menos un consumo, por ejemplo “gastamos 200 kWh de luz”.",
  },
  no_data: {
    title: "No encontramos consumos para calcular",
    hint: "Prueba con cantidades y unidades: kWh de luz, litros de diésel, km recorridos o kg de basura.",
  },
  ai_error: {
    title: "Eco no pudo leer tu texto esta vez",
    hint: "Suele ser algo pasajero. Inténtalo de nuevo en unos segundos.",
  },
  bad_request: {
    title: "Algo en el texto no pudimos procesarlo",
    hint: "Revisa que no pase de 1.000 caracteres e inténtalo otra vez.",
  },
  network: {
    title: "Se cortó la conexión",
    hint: "Revisa tu internet y vuelve a intentarlo. Tu texto sigue ahí.",
  },
  internal: {
    title: "Algo falló de nuestro lado",
    hint: "No es tu culpa. Inténtalo de nuevo; si sigue pasando, vuelve en un rato.",
  },
};

type ErrorStateProps = {
  error: AnalysisError;
  onRetry: () => void;
};

/** Error en lenguaje humano, siempre con una acción para seguir. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const copy = COPY[error.code];
  return (
    <section
      role="alert"
      aria-labelledby="error-title"
      className="flex flex-col gap-3 rounded-sm border border-clay/60 border-l-4 bg-clay/10 p-5"
    >
      <p className="font-mono text-xs uppercase tracking-widest text-clay-deep">No pudimos terminar</p>
      <h2 id="error-title" className="font-display text-2xl font-medium leading-tight text-ink">
        {copy.title}
      </h2>
      <p className="text-sm leading-relaxed text-ink">{copy.hint}</p>
      {error.message && error.message !== copy.title && (
        <p className="font-mono text-xs text-ink-soft">Detalle: {error.message}</p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="self-start rounded-sm bg-moss px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink"
      >
        Intentar de nuevo
      </button>
    </section>
  );
}
