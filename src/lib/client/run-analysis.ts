import type { StreamEvent } from "@/lib/types";

/**
 * Punto único de entrada del análisis en el cliente.
 * Hace `POST /api/analyze` y lee la respuesta NDJSON (un `StreamEvent` por línea),
 * llamando a `onEvent` por cada evento a medida que llegan.
 */
export type AnalysisEventHandler = (event: StreamEvent) => void;

export interface RunAnalysisOptions {
  signal?: AbortSignal;
  /** "demo" fuerza el intérprete por reglas; "auto" (por defecto) usa la IA si está disponible. */
  mode?: "auto" | "demo";
}

/** Igual a `MAX_TEXT_LENGTH` de `schemas.ts` (no se importa para no llevar Zod al navegador). */
export const MAX_INPUT_LENGTH = 1000;

type ErrorEvent = Extract<StreamEvent, { type: "error" }>;

const NETWORK_ERROR: ErrorEvent = {
  type: "error",
  code: "network",
  message: "No pudimos conectar con EcoTrack. Revisa tu conexión e inténtalo de nuevo.",
};

export async function runAnalysis(
  text: string,
  onEvent: AnalysisEventHandler,
  { signal, mode = "auto" }: RunAnalysisOptions = {},
): Promise<void> {
  const input = text.trim();
  if (!input) {
    onEvent({
      type: "error",
      code: "empty_input",
      message: "Escribe algo sobre tu día para poder calcular tu huella.",
    });
    return;
  }

  let response: Response;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input, mode }),
      signal,
    });
  } catch (error) {
    if (isAbort(error, signal)) return; // cancelado por el usuario o por un nuevo envío
    onEvent(NETWORK_ERROR);
    return;
  }

  if (!response.ok) {
    onEvent(await errorFromResponse(response));
    return;
  }
  if (!response.body) {
    onEvent({ type: "error", code: "internal", message: "La respuesta llegó vacía." });
    return;
  }

  let finished = false;
  const emit = (line: string) => {
    const event = parseEvent(line);
    if (!event) return;
    if (event.type === "result" || event.type === "error") finished = true;
    onEvent(event);
  };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Las líneas pueden llegar partidas entre fragmentos: sólo procesamos las completas.
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        emit(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    emit(buffer);
  } catch (error) {
    if (isAbort(error, signal)) return;
    onEvent({ ...NETWORK_ERROR, message: "Se cortó la conexión mientras calculábamos." });
    return;
  }

  if (!finished && !signal?.aborted) {
    onEvent({
      type: "error",
      code: "internal",
      message: "La respuesta terminó antes de tiempo.",
    });
  }
}

function parseEvent(line: string): StreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const value: unknown = JSON.parse(trimmed);
    return isStreamEvent(value) ? value : null;
  } catch {
    return null;
  }
}

function isStreamEvent(value: unknown): value is StreamEvent {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return type === "stage" || type === "result" || type === "error";
}

async function errorFromResponse(response: Response): Promise<ErrorEvent> {
  try {
    const body: unknown = await response.json();
    if (isStreamEvent(body) && body.type === "error") return body;
  } catch {
    // Cuerpo no JSON: usamos un error genérico según el estado.
  }
  return response.status >= 500
    ? { type: "error", code: "internal", message: "Algo falló de nuestro lado." }
    : { type: "error", code: "bad_request", message: "No pudimos procesar tu texto." };
}

function isAbort(error: unknown, signal?: AbortSignal): boolean {
  return signal?.aborted === true || (error instanceof Error && error.name === "AbortError");
}
