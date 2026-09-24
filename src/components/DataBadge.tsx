import { dataOriginCopy, type DataOrigin, type InterpreterMode } from "@/lib/data-origin";

export { DATA_ORIGINS, type DataOrigin } from "@/lib/data-origin";

/**
 * Marca de cada origen: un punto pequeño que varía en forma además de en color, para que
 * no dependa sólo del color (lleno = lo dijiste, anillo = interpretado, rombo = supuesto,
 * cuadrado = factor). El texto siempre acompaña.
 */
const MARKS: Record<DataOrigin, string> = {
  user: "rounded-full bg-moss",
  ai: "rounded-full border-[1.5px] border-moss",
  assumption: "rotate-45 rounded-[1px] bg-clay-deep",
  factor: "rounded-[1px] border-[1.5px] border-ink-faint",
};

/** En modo demo el anillo de "interpretado" va punteado: no lo leyó la IA. */
const DEMO_INTERPRETED_MARK = "rounded-full border-[1.5px] border-dashed border-ink-faint";

type DataBadgeProps = {
  origin: DataOrigin;
  /** Quién interpretó el texto (Claude o el parser por reglas): cambia la insignia "interpretado". */
  mode: InterpreterMode;
  className?: string;
};

/**
 * Insignia de origen del dato, en voz baja: punto + texto corto, sin caja.
 * Distingue lo dicho, lo interpretado, lo supuesto y lo referencial.
 */
export function DataBadge({ origin, mode, className = "" }: DataBadgeProps) {
  const copy = dataOriginCopy(origin, mode);
  const mark = origin === "ai" && mode === "demo" ? DEMO_INTERPRETED_MARK : MARKS[origin];
  return (
    <span
      title={copy.description}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-sans text-[0.6875rem] leading-4 ${
        origin === "assumption" ? "text-clay-deep" : "text-ink-faint"
      } ${className}`}
    >
      <span aria-hidden="true" className={`inline-block h-[7px] w-[7px] shrink-0 ${mark}`} />
      {copy.label}
    </span>
  );
}
