export type DataOrigin = "user" | "ai" | "assumption" | "factor";

const BADGES: Record<DataOrigin, { label: string; description: string; className: string }> = {
  user: {
    label: "Tú lo dijiste",
    description: "Cita literal de lo que escribiste",
    className: "border-moss/50 bg-lichen/35 text-ink",
  },
  ai: {
    label: "IA interpretó",
    description: "Cómo se leyó tu texto como un consumo medible",
    className: "border-ink/60 bg-signal text-ink",
  },
  assumption: {
    label: "Supuesto",
    description: "Algo que tuvimos que suponer porque no lo dijiste",
    className: "border-clay/70 border-dashed bg-clay/10 text-clay-deep",
  },
  factor: {
    label: "Factor referencial",
    description: "Factor de emisión aproximado de uso común, no medido para tu negocio",
    className: "border-ink/30 bg-paper-deep text-ink-soft",
  },
};

type DataBadgeProps = {
  origin: DataOrigin;
  className?: string;
};

/** Insignia de origen del dato: distingue lo dicho, lo interpretado, lo supuesto y lo referencial. */
export function DataBadge({ origin, className = "" }: DataBadgeProps) {
  const badge = BADGES[origin];
  return (
    <span
      title={badge.description}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-sm border px-1.5 py-px font-mono text-[0.625rem] font-medium uppercase leading-4 tracking-wider ${badge.className} ${className}`}
    >
      {badge.label}
    </span>
  );
}

export const DATA_ORIGINS: DataOrigin[] = ["user", "ai", "assumption", "factor"];
export const DATA_ORIGIN_DESCRIPTION: Record<DataOrigin, string> = {
  user: BADGES.user.description,
  ai: BADGES.ai.description,
  assumption: BADGES.assumption.description,
  factor: BADGES.factor.description,
};
