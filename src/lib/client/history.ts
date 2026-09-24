import type { AnalysisResult } from "@/lib/types";

/**
 * Historial local ("Tus días anteriores"): últimos análisis en localStorage.
 * Todas las lecturas/escrituras van en try/catch: sin almacenamiento, la app sigue funcionando.
 */
export const HISTORY_KEY = "ecotrack:history";
export const HISTORY_LIMIT = 10;

const EMPTY: AnalysisResult[] = [];
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedList: AnalysisResult[] = EMPTY;

/** Añade un resultado al inicio, sin duplicados por id, con máximo `HISTORY_LIMIT`. */
export function addToHistory(list: AnalysisResult[], result: AnalysisResult): AnalysisResult[] {
  return [result, ...list.filter((item) => item.id !== result.id)].slice(0, HISTORY_LIMIT);
}

/** Interpreta el valor guardado; descarta cualquier cosa con forma inesperada. */
export function parseHistory(raw: string | null): AnalysisResult[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    return data.filter(isResultLike).slice(0, HISTORY_LIMIT);
  } catch {
    return EMPTY;
  }
}

function isResultLike(value: unknown): value is AnalysisResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<AnalysisResult>;
  return (
    typeof v.id === "string" &&
    typeof v.createdAt === "string" &&
    typeof v.input === "string" &&
    typeof v.totalKg === "number" &&
    Array.isArray(v.lines) &&
    Array.isArray(v.byCategory) &&
    Array.isArray(v.recommendations)
  );
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(HISTORY_KEY);
  } catch {
    return null;
  }
}

function write(list: AnalysisResult[]): void {
  try {
    if (list.length === 0) window.localStorage.removeItem(HISTORY_KEY);
    else window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // Almacenamiento lleno o bloqueado: el historial es una comodidad, no es crítico.
  }
  listeners.forEach((listener) => listener());
}

// --- API para useSyncExternalStore ---------------------------------------------------

export function subscribeHistory(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === HISTORY_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Devuelve siempre la misma referencia mientras el valor guardado no cambie. */
export function getHistorySnapshot(): AnalysisResult[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parseHistory(raw);
  }
  return cachedList;
}

export function getHistoryServerSnapshot(): AnalysisResult[] {
  return EMPTY;
}

export function saveToHistory(result: AnalysisResult): void {
  write(addToHistory(getHistorySnapshot(), result));
}

export function clearHistory(): void {
  write(EMPTY);
}
