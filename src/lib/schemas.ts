import { z } from "zod";

/**
 * Esquemas compartidos (Zod).
 *
 * `Extraction` es el formato que produce el intérprete: hoy el de reglas (modo demo),
 * en la iteración 4 Claude con salidas estructuradas. Por eso se mantiene simple:
 * objetos, enums, strings, números, booleanos y `nullable`, sin refinamientos.
 */

export const ACTIVITIES = [
  "electricity_grid",
  "diesel",
  "gasoline",
  "natural_gas",
  "lpg",
  "vehicle_delivery_van",
  "vehicle_car",
  "vehicle_motorcycle",
  "vehicle_truck",
  "waste_landfill",
  "other",
] as const;

export const UNITS = ["kWh", "MWh", "L", "gal", "m3", "kg", "lb", "t", "km", "mi", "h"] as const;

export const ActivitySchema = z.enum(ACTIVITIES);
export const UnitSchema = z.enum(UNITS);

export const ExtractedItemSchema = z.object({
  activity: ActivitySchema,
  /** Etiqueta corta en español: "Camionetas de reparto". */
  label: z.string(),
  /** Cantidad principal tal como la dijo el usuario. */
  quantity: z.number().nullable(),
  unit: UnitSchema.nullable(),
  /** Sólo vehículos. */
  vehicle_count: z.number().nullable(),
  /** true si la cantidad es por vehículo ("5 camionetas durante 8 horas" → true). */
  per_vehicle: z.boolean().nullable(),
  /** Fragmento LITERAL del texto del usuario. */
  source_quote: z.string(),
  notes: z.string().nullable(),
});

export const ExtractionSchema = z.object({
  items: z.array(ExtractedItemSchema),
  ignored: z.array(z.object({ quote: z.string(), reason: z.string() })),
});

export const MAX_TEXT_LENGTH = 1000;

export const AnalyzeRequestSchema = z.object({
  text: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
  mode: z.enum(["auto", "demo"]).optional(),
});

export type Activity = z.infer<typeof ActivitySchema>;
export type Unit = z.infer<typeof UnitSchema>;
export type ExtractedItem = z.infer<typeof ExtractedItemSchema>;
export type Extraction = z.infer<typeof ExtractionSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalysisMode = NonNullable<AnalyzeRequest["mode"]>;
