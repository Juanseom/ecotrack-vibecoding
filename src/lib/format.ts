/** Formato numérico y de fechas en español de Colombia (es-CO): 1.706 · 13,8 · 69 %. */
const LOCALE = "es-CO";

const cache = new Map<string, Intl.NumberFormat>();

function numberFormat(min: number, max: number): Intl.NumberFormat {
  const key = `${min}-${max}`;
  let nf = cache.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
      useGrouping: "always",
    });
    cache.set(key, nf);
  }
  return nf;
}

/** Número con decimales fijos opcionales: formatNumber(1705.9) → "1.706". */
export function formatNumber(value: number, decimals = 0): string {
  return numberFormat(decimals, decimals).format(value);
}

/** Número con hasta `max` decimales, sin ceros sobrantes: formatAmount(0.25) → "0,25". */
export function formatAmount(value: number, max = 2): string {
  return numberFormat(0, max).format(value);
}

/** kg CO₂e con un decimal: formatKg(290) → "290,0". */
export function formatKg(value: number): string {
  return formatNumber(value, 1);
}

/** Porcentaje entero a partir de una fracción 0..1: formatShare(0.6897) → "69 %". */
export function formatShare(share: number): string {
  return `${formatNumber(share * 100)} %`;
}

const dateTime = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const shortDate = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatShortDate(iso: string): string {
  return shortDate.format(new Date(iso));
}

/** Número corto de recibo a partir del id: "demo-7f3a21c4" → "7F3A-21C4". */
export function receiptNumber(id: string): string {
  const clean = id.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase().padStart(8, "0");
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

/** Primeras palabras de un texto para listas compactas. */
export function firstWords(text: string, count = 8): string {
  const words = text.trim().split(/\s+/);
  return words.length <= count ? words.join(" ") : `${words.slice(0, count).join(" ")}…`;
}
