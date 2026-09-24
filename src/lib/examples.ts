/** Textos de ejemplo de la portada (chips). También se usan en las pruebas del intérprete demo. */
export const EXAMPLES: { label: string; text: string }[] = [
  {
    label: "Reparto y luz",
    text: "Hoy usamos 5 camionetas de reparto durante 8 horas y gastamos 200 kWh de luz.",
  },
  {
    label: "Panadería: gas y luz",
    text: "Esta semana la panadería gastó 45 m³ de gas natural y 320 kWh de electricidad.",
  },
  {
    label: "Diésel y basura",
    text: "Cargamos 60 litros de diésel en el camión y botamos unos 25 kg de basura.",
  },
  {
    label: "Motos y local",
    text: "Dos motos hicieron 120 km cada una y el local consumió 80 kWh.",
  },
];

export const EXAMPLE_TEXTS: string[] = EXAMPLES.map((example) => example.text);
