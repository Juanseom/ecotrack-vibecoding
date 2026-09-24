import {
  CAR_KG_PER_KM,
  EMISSION_FACTORS,
  KG_PER_LB,
  KG_PER_T,
  KM_PER_MI,
  KWH_PER_MWH,
  L_PER_GAL,
  LPG_KG_PER_L,
  TREE_KG_PER_YEAR,
  URBAN_SPEED_KMH,
} from "@/lib/emissions/factors";
import { formatAmount, formatNumber } from "@/lib/format";

/**
 * "Cómo calculamos": transparencia sin ruido. Plegada por defecto; lee los factores y
 * supuestos directamente del motor de cálculo (`src/lib/emissions/factors.ts`), así que
 * lo que se muestra es exactamente lo que se usa.
 */
export function Methodology() {
  const assumptions = [
    `Si nos das horas de uso de un vehículo, las pasamos a km suponiendo ${formatAmount(URBAN_SPEED_KMH)} km/h (velocidad urbana promedio).`,
    `GLP en litros: 1 L ≈ ${formatAmount(LPG_KG_PER_L)} kg.`,
    `Unidades: 1 MWh = ${formatNumber(KWH_PER_MWH)} kWh · 1 galón = ${formatAmount(L_PER_GAL, 3)} L · 1 lb = ${formatAmount(KG_PER_LB, 4)} kg · 1 t = ${formatNumber(KG_PER_T)} kg · 1 milla = ${formatAmount(KM_PER_MI, 3)} km.`,
    `Para hacerse una idea: 1 km en auto a gasolina ≈ ${formatAmount(CAR_KG_PER_KM)} kg CO₂e, y un árbol absorbe ≈ ${formatAmount(TREE_KG_PER_YEAR)} kg de CO₂ al año.`,
  ];

  return (
    <section aria-labelledby="method-title" className="max-w-3xl">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden="true"
            className="font-mono text-xs text-ink-faint transition-transform group-open:rotate-90"
          >
            ›
          </span>
          <h2 id="method-title" className="section-label">
            Cómo calculamos
          </h2>
        </summary>

        <div className="mt-4 flex flex-col gap-5 text-sm leading-relaxed text-ink-soft">
          <p className="max-w-prose">
            Cada línea del recibo es <span className="font-mono text-ink">cantidad × factor = kg CO₂e</span>.
            Eco sólo convierte tu texto en cantidades; la multiplicación la hace siempre nuestro
            código, con estos factores referenciales: aproximaciones de uso común, no medidas de
            tu negocio.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <caption className="sr-only">Factores de emisión referenciales</caption>
              <thead>
                <tr className="border-b border-dashed border-ink/25 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-faint">
                  <th scope="col" className="py-2 pr-4 font-normal">Actividad</th>
                  <th scope="col" className="py-2 pr-4 text-right font-normal">Factor</th>
                  <th scope="col" className="py-2 pr-4 font-normal">Unidad</th>
                  <th scope="col" className="py-2 font-normal">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-ink/10">
                {EMISSION_FACTORS.map((factor) => (
                  <tr key={factor.id}>
                    <th scope="row" className="py-2 pr-4 font-normal text-ink">
                      {factor.label}
                    </th>
                    <td className="py-2 pr-4 text-right font-mono tabular-nums text-ink">
                      {formatAmount(factor.value, 3)}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-4 font-mono">{factor.unit}</td>
                    <td className="py-2">{factor.source.replace(/^Referencial · /, "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="section-label">Supuestos</h3>
            <ul className="flex flex-col gap-1.5">
              {assumptions.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="text-ink-faint">
                    –
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </section>
  );
}
