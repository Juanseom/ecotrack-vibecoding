type LeafMarkProps = {
  className?: string;
};

/** Marca de EcoTrack AI: una hoja con nervaduras, trazada como en un cuaderno de campo. */
export function LeafMark({ className }: LeafMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M6 26C6 14 14 6 26 6c0 12-8 20-20 20Z"
        className="fill-moss"
      />
      <path
        d="M6 26 19.5 12.5M12 20v-4.6M15.6 16.4h4.6"
        fill="none"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="stroke-paper"
      />
      <circle cx="26" cy="6" r="2.2" className="fill-signal stroke-ink" strokeWidth="0.8" />
    </svg>
  );
}
