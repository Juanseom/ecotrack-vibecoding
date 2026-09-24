import type { AnalysisResult } from "@/lib/types";

/**
 * Resultado de ejemplo fijo (iteración 2). Reproduce el caso del Master Prompt §11.
 * Desde la iteración 3 la interfaz ya no lo usa: sólo sirve para pruebas e historias.
 */
export const SAMPLE_INPUT =
  "Hoy usamos 5 camionetas de reparto durante 8 horas y gastamos 200 kWh de luz.";

export const sampleResult: AnalysisResult = {
  id: "demo-7f3a21c4",
  createdAt: "2026-09-24T18:30:00.000Z",
  input: SAMPLE_INPUT,
  mode: "demo",
  lines: [
    {
      id: "line-electricity",
      category: "electricity",
      label: "Electricidad de la red",
      quote: "200 kWh de luz",
      interpreted: "200 kWh de electricidad",
      steps: [],
      activityAmount: 200,
      activityUnit: "kWh",
      factor: {
        id: "electricity_grid",
        label: "Red eléctrica (promedio global aprox.)",
        value: 0.45,
        unit: "kg CO₂e/kWh",
        source: "Referencial · IEA (aprox.)",
      },
      kgCO2e: 90,
      assumptions: [],
    },
    {
      id: "line-vans",
      category: "vehicle",
      label: "Camionetas de reparto (diésel)",
      quote: "5 camionetas de reparto durante 8 horas",
      interpreted: "5 camionetas × 8 h",
      steps: ["8 h × 20 km/h = 160 km por camioneta", "160 km × 5 = 800 km"],
      activityAmount: 800,
      activityUnit: "km",
      factor: {
        id: "vehicle_delivery_van_diesel",
        label: "Camioneta de reparto diésel (por km)",
        value: 0.25,
        unit: "kg CO₂e/km",
        source: "Referencial · DEFRA (aprox.)",
      },
      kgCO2e: 200,
      assumptions: [
        "Velocidad urbana promedio de 20 km/h (diste horas, no kilómetros)",
        "Las 8 horas son por camioneta",
      ],
    },
  ],
  unquantified: [],
  totalKg: 290,
  byCategory: [
    { category: "vehicle", kg: 200, share: 200 / 290 },
    { category: "electricity", kg: 90, share: 90 / 290 },
  ],
  equivalences: {
    carKm: 290 / 0.17, // ≈ 1.706 km
    treeYears: 290 / 21, // ≈ 13,8 árboles-año
  },
  validation: {
    status: "ok",
    issues: [
      {
        severity: "info",
        message:
          "Convertimos las horas de reparto en kilómetros suponiendo 20 km/h en ciudad. Si tus rutas son más rápidas o más lentas, el resultado cambia.",
        lineId: "line-vans",
      },
    ],
    clarifyingQuestion:
      "¿Sabes cuántos kilómetros recorrió cada camioneta hoy? Con ese dato el cálculo del reparto sería más preciso.",
  },
  analysis: {
    headline: "El reparto es casi el 70 % de tu huella de hoy.",
    summary:
      "Las 5 camionetas suman unos 200 kg CO₂e; la luz, 90 kg. La mayor oportunidad está en las rutas: menos kilómetros recorridos se notan de inmediato. Recuerda que es una estimación con factores referenciales, no una medición.",
  },
  recommendations: [
    {
      title: "Agrupa las entregas por zona",
      detail:
        "Planea las rutas del día para que cada camioneta cubra un sector y no se crucen. Menos kilómetros vacíos es menos diésel.",
      category: "vehicle",
      impact: "alto",
      effort: "media",
    },
    {
      title: "Apaga equipos al cerrar",
      detail:
        "Revisa qué queda encendido fuera del horario (neveras a medio llenar, luces, cargadores) y desconéctalo o prográmalo.",
      category: "electricity",
      impact: "medio",
      effort: "fácil",
    },
    {
      title: "Cuida llantas y evita el ralentí",
      detail:
        "Llantas bien infladas y motores apagados mientras se carga o se espera reducen el consumo de cada camioneta.",
      category: "vehicle",
      impact: "medio",
      effort: "fácil",
    },
  ],
};
