import type { AnalysisResult } from "@/lib/types";

/**
 * Textos de las insignias de origen del dato (§9.2: distinguir siempre de dónde sale cada dato).
 * La de "interpretado" depende de quién leyó el texto: Claude (modo IA) o el parser por
 * reglas (modo demo). En modo demo no se puede decir "IA interpretó".
 */

export type DataOrigin = "user" | "ai" | "assumption" | "factor";
export type InterpreterMode = AnalysisResult["mode"];

export const DATA_ORIGINS: DataOrigin[] = ["user", "ai", "assumption", "factor"];

const COPY: Record<Exclude<DataOrigin, "ai">, { label: string; description: string }> = {
  user: { label: "Tú lo dijiste", description: "Cita literal de lo que escribiste" },
  assumption: { label: "Supuesto", description: "Algo que tuvimos que suponer porque no lo dijiste" },
  factor: {
    label: "Factor referencial",
    description: "Factor de emisión aproximado de uso común, no medido para tu negocio",
  },
};

const INTERPRETED: Record<InterpreterMode, { label: string; description: string }> = {
  ai: { label: "IA interpretó", description: "Cómo la IA leyó tu texto como un consumo medible" },
  demo: {
    label: "Eco interpretó (reglas)",
    description: "Cómo el intérprete por reglas del modo demo (sin IA) leyó tu texto como un consumo medible",
  },
};

export function dataOriginCopy(origin: DataOrigin, mode: InterpreterMode): { label: string; description: string } {
  return origin === "ai" ? INTERPRETED[mode] : COPY[origin];
}
