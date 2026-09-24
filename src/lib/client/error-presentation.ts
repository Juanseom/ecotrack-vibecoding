import type { StreamEvent } from "@/lib/types";

export type AnalysisError = Extract<StreamEvent, { type: "error" }>;

export interface ErrorPresentation {
  title: string;
  hint: string;
  /** Mostrar "Intentar de nuevo". */
  retry: boolean;
  /** Mostrar "Probar en modo demo". */
  demo: boolean;
  /** Qué acción va primero (y con el estilo principal). */
  primary: "retry" | "demo";
}

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
    hint: "Puedes intentarlo de nuevo en unos segundos o seguir con el modo demo, que no usa IA.",
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

/** Error de IA por configuración del servidor (clave, permisos, modelo): reintentar no sirve. */
const AI_CONFIG_COPY = {
  title: "La IA de Eco no está disponible",
  hint: "No es un problema de tu texto: la IA del servidor no está bien configurada. Mientras se revisa, puedes calcular tu huella con el modo demo, que lee tu texto con reglas.",
};

/**
 * Qué decir y qué acciones ofrecer para cada error.
 * - `ai_error` de configuración (`retryable: false`): sin reintentar; el modo demo va primero.
 * - `ai_error` pasajero: reintentar y, como alternativa, el modo demo.
 * - `network`: sólo reintentar (el modo demo también necesita red).
 * - El resto: reintentar.
 */
export function presentError(error: AnalysisError): ErrorPresentation {
  if (error.code === "ai_error") {
    return error.retryable === false
      ? { ...AI_CONFIG_COPY, retry: false, demo: true, primary: "demo" }
      : { ...COPY.ai_error, retry: true, demo: true, primary: "retry" };
  }
  return { ...COPY[error.code], retry: true, demo: false, primary: "retry" };
}
