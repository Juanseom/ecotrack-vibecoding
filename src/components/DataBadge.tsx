import { dataOriginCopy, type DataOrigin, type InterpreterMode } from "@/lib/data-origin";

export { DATA_ORIGINS, type DataOrigin } from "@/lib/data-origin";

const STYLES: Record<DataOrigin, string> = {
  user: "border-moss/50 bg-lichen/35 text-ink",
  ai: "border-ink/60 bg-signal text-ink",
  assumption: "border-clay/70 border-dashed bg-clay/10 text-clay-deep",
  factor: "border-ink/30 bg-paper-deep text-ink-soft",
};

/** En modo demo la insignia de "interpretado" no usa el acento de IA. */
const DEMO_INTERPRETED_STYLE = "border-ink/50 border-dashed bg-paper text-ink";

type DataBadgeProps = {
  origin: DataOrigin;
  /** Quién interpretó el texto (Claude o el parser por reglas): cambia la insignia "interpretado". */
  mode: InterpreterMode;
  className?: string;
};

/** Insignia de origen del dato: distingue lo dicho, lo interpretado, lo supuesto y lo referencial. */
export function DataBadge({ origin, mode, className = "" }: DataBadgeProps) {
  const copy = dataOriginCopy(origin, mode);
  const style = origin === "ai" && mode === "demo" ? DEMO_INTERPRETED_STYLE : STYLES[origin];
  return (
    <span
      title={copy.description}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-sm border px-1.5 py-px font-mono text-[0.625rem] font-medium uppercase leading-4 tracking-wider ${style} ${className}`}
    >
      {copy.label}
    </span>
  );
}
