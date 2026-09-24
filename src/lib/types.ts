export type Category = "electricity" | "fuel" | "vehicle" | "heating_gas" | "waste";
export type StageId = "extract" | "validate" | "calculate" | "explain";
export type StageStatus = "pending" | "running" | "done" | "skipped" | "error";

export interface EmissionFactor {
  id: string;            // p. ej. "electricity_grid"
  label: string;         // "Red eléctrica (promedio global aprox.)"
  value: number;         // 0.45
  unit: string;          // "kg CO₂e/kWh"
  source: string;        // "Referencial · IEA (aprox.)"
}

export interface ReceiptLine {
  id: string;
  category: Category;
  label: string;                 // "Camionetas de reparto (diésel)"
  quote: string;                 // cita literal del texto del usuario
  interpreted: string;           // "5 camionetas × 8 h"
  steps: string[];               // ["8 h × 20 km/h = 160 km por camioneta", "160 km × 5 = 800 km"]
  activityAmount: number;        // 800
  activityUnit: string;          // "km"
  factor: EmissionFactor;
  kgCO2e: number;                // 200
  assumptions: string[];         // ["Velocidad urbana promedio de 20 km/h"]
}

export interface UnquantifiedItem { label: string; quote: string; reason: string; }

export interface ValidationIssue { severity: "info" | "warning"; message: string; lineId?: string; }

export interface Recommendation {
  title: string;
  detail: string;
  category: Category;
  impact: "alto" | "medio" | "bajo";
  effort: "fácil" | "media" | "difícil";
}

export interface AnalysisResult {
  id: string;
  createdAt: string;             // ISO
  input: string;
  mode: "ai" | "demo";
  model?: string;
  lines: ReceiptLine[];
  unquantified: UnquantifiedItem[];
  totalKg: number;
  byCategory: { category: Category; kg: number; share: number }[]; // share 0..1
  equivalences: { carKm: number; treeYears: number };
  validation: { status: "ok" | "warnings"; issues: ValidationIssue[]; clarifyingQuestion: string | null };
  analysis: { headline: string; summary: string };
  recommendations: Recommendation[];
}

export type StreamEvent =
  | { type: "stage"; stage: StageId; status: StageStatus; detail?: string }
  | { type: "result"; data: AnalysisResult }
  | { type: "error"; code: "empty_input" | "no_data" | "ai_error" | "bad_request" | "network" | "internal"; message: string };
