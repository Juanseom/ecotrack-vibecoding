import { formatKg, formatShare } from "@/lib/format";
import type { ExplainContext, Interpreter, ReviewResult } from "@/lib/interpreters/types";
import type { Activity, ExtractedItem, Extraction, Unit } from "@/lib/schemas";
import type { Category, Recommendation, ValidationIssue } from "@/lib/types";

/**
 * Intérprete por reglas (modo demo). Lee español coloquial con expresiones regulares
 * y un diccionario de sinónimos. No usa IA ni red: es determinista y rápido.
 * Funciona con frases simples ("5 camionetas durante 8 horas", "200kWh de luz");
 * lo que no entiende lo deja como "no cuantificable" en lugar de inventarlo.
 */

// ───────────────────────── Números y unidades ─────────────────────────

const L = "\\p{L}";
/** Evita que una palabra empiece o termine en medio de otra ("gas" en "gastamos"). */
const START = `(?<![${L}\\d])`;
const END = `(?![${L}\\d])`;

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  quince: 15,
  veinte: 20,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  cien: 100,
};

const NUMBER = `(?:\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:[.,]\\d+)?|${Object.keys(NUMBER_WORDS).join("|")})`;

/** Formas escritas de cada unidad (de la más larga a la más corta). */
const UNIT_FORMS: [Unit, string][] = [
  ["kWh", "kilovatios?(?:[\\s-]*horas?)?|kilowatts?(?:[\\s-]*horas?)?|kwh|kw\\s?h|kw/h"],
  ["MWh", "megavatios?(?:[\\s-]*horas?)?|mwh"],
  ["m3", "metros?\\s+c[uú]bicos?|mts?3|m3|m³"],
  ["km", "kil[oó]metros?|kms?"],
  ["kg", "kilogramos?|kilos?|kgs?"],
  ["L", "litros?|lts?|l"],
  ["gal", "galones|gal[oó]n|gal"],
  ["lb", "libras?|lbs?"],
  ["t", "toneladas?|ton|t"],
  ["mi", "millas?|mi"],
  ["h", "horas?|hrs?|h"],
];

/**
 * Signo menos pegado al número ("-50", "−50"). Como el signo va después de `START`, un guion
 * precedido de letra o dígito ("8-10 horas") no cuenta como signo, y uno separado por un
 * espacio ("luz - 50 kWh") es puntuación. Sin este grupo, el `-` quedaba fuera del match
 * y "-50 kWh" se leía como 50 kWh (iteración 6, F1).
 */
const SIGN = "([-−])?";

const QUANTITY_RE = new RegExp(
  `${START}${SIGN}(${NUMBER})\\s*(${UNIT_FORMS.map(([, forms]) => forms).join("|")})\\.?${END}`,
  "giu",
);
const UNIT_TESTS = UNIT_FORMS.map(([unit, forms]) => [unit, new RegExp(`^(?:${forms})$`, "iu")] as const);

export function parseNumber(raw: string): number | null {
  const token = raw.trim().toLowerCase();
  if (token in NUMBER_WORDS) return NUMBER_WORDS[token];
  let normalized = token;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(token)) {
    normalized = token.replace(/\./g, "").replace(",", "."); // 1.500,5 → 1500.5
  } else {
    normalized = token.replace(",", "."); // 1,5 → 1.5
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Número con su signo, si lo trae: nunca se descarta un "-" que escribió el usuario. */
function signedNumber(sign: string | undefined, raw: string): number | null {
  const value = parseNumber(raw);
  if (value === null) return null;
  return sign ? -value : value;
}

function unitFromToken(token: string): Unit | null {
  const clean = token.trim();
  for (const [unit, test] of UNIT_TESTS) if (test.test(clean)) return unit;
  return null;
}

// ───────────────────────── Diccionario de sinónimos ─────────────────────────

type KeywordKind =
  | "vehicle_delivery_van"
  | "vehicle_motorcycle"
  | "vehicle_car"
  | "vehicle_truck"
  | "diesel"
  | "gasoline"
  | "natural_gas"
  | "lpg"
  | "gas"
  | "electricity_grid"
  | "waste_landfill";

/** Orden importa: lo más específico primero ("gas natural" antes que "gas"). */
const KEYWORDS: [KeywordKind, string][] = [
  ["vehicle_delivery_van", "camionetas?(?:\\s+de\\s+reparto)?|furgonetas?|furgones|furg[oó]n|vans|van(?=\\s+de\\s+reparto)"],
  ["vehicle_motorcycle", "motocicletas?|motos?"],
  ["vehicle_truck", "camiones|cami[oó]n|volquetas?|tractomulas?"],
  ["vehicle_car", "autom[oó]viles|autom[oó]vil|carros?|autos?|coches?"],
  ["diesel", "di[eé]sel|acpm|gas[oó]leo|gasoil"],
  ["gasoline", "gasolina|nafta|bencina"],
  ["natural_gas", "gas\\s+natural|gas\\s+domiciliario|gas\\s+de\\s+red"],
  ["lpg", "gas\\s+propano|propano|glp|gas\\s+licuado|pipetas?(?:\\s+de\\s+gas)?|cilindros?\\s+de\\s+gas|bombonas?(?:\\s+de\\s+gas)?"],
  ["gas", "gas"],
  ["electricity_grid", "energ[ií]a\\s+el[eé]ctrica|electricidad|energ[ií]a|luz"],
  ["waste_landfill", "basuras?|residuos?|desechos?|desperdicios?"],
];

const KEYWORD_RE = new RegExp(
  KEYWORDS.map(([, forms], i) => `${START}(?<k${i}>${forms})${END}`).join("|"),
  "giu",
);

const VEHICLE_KINDS = new Set<KeywordKind>([
  "vehicle_delivery_van",
  "vehicle_motorcycle",
  "vehicle_car",
  "vehicle_truck",
]);
const LIQUID_FUELS = new Set<KeywordKind>(["diesel", "gasoline", "lpg"]);

const PER_VEHICLE_RE = new RegExp(
  `${START}(?:cada\\s+un[oa]|c/u|por\\s+(?:cada\\s+)?(?:camioneta|moto|motocicleta|veh[ií]culo|carro|auto|cami[oó]n|furgoneta))${END}|${START}cada\\s+(?:camioneta|moto|motocicleta|veh[ií]culo|carro|auto|cami[oó]n|furgoneta)${END}`,
  "iu",
);
const IN_TOTAL_RE = new RegExp(`${START}(?:en\\s+total|entre\\s+tod[oa]s|en\\s+conjunto|sumad[oa]s)${END}`, "iu");

/**
 * Palabras que indican que la frase habla de un consumo ("usamos", "gastamos", "el consumo"…).
 * Un número sin unidad sólo merece aviso si está junto a una de ellas (iteración 6, UI-5):
 * "usamos 100 de eso" sí; "mi huella es 0" o "somos 3 empleados" no.
 */
const CONSUMPTION_WORD_RE = new RegExp(
  `${START}(?:consum${L}*|gast${L}*|us(?:amos|aron|an|a|ó|é|o|ar|ado|ada)|utiliz${L}*|recorr${L}*|carg(?:amos|aron|ó|é|ar)|tanque${L}*|echamos|echaron|bot(?:amos|aron|ó|é|ar)|quem(?:amos|aron|ó|é|ar))${END}`,
  "iu",
);

/** Separa el texto en cláusulas: puntuación y conectores ("y", "pero", "además"…). */
const CLAUSE_SEPARATOR_RE =
  /(?<!\d)[,.](?!\d)|[,.](?=\s|$)|[;:!?¡¿\n]|\s(?:y|e|pero|adem[aá]s|tambi[eé]n|luego|mientras\s+que)\s/giu;

// ───────────────────────── Extracción ─────────────────────────

interface Span {
  start: number;
  end: number;
}
interface Keyword extends Span {
  kind: KeywordKind;
  text: string;
  plural: boolean;
}
interface Quantity extends Span {
  value: number;
  unit: Unit;
}
interface Clause {
  text: string;
  start: number;
}

function splitClauses(text: string): Clause[] {
  const clauses: Clause[] = [];
  let cursor = 0;
  const push = (end: number) => {
    const raw = text.slice(cursor, end);
    const leading = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed) clauses.push({ text: trimmed, start: cursor + leading });
  };
  for (const match of text.matchAll(CLAUSE_SEPARATOR_RE)) {
    push(match.index);
    cursor = match.index + match[0].length;
  }
  push(text.length);
  return clauses;
}

function findKeywords(clause: string): Keyword[] {
  const found: Keyword[] = [];
  for (const match of clause.matchAll(KEYWORD_RE)) {
    const index = Object.entries(match.groups ?? {}).find(([, value]) => value !== undefined)?.[0];
    if (!index) continue;
    const kind = KEYWORDS[Number(index.slice(1))][0];
    const word = match[0];
    const head = word.split(/\s+/)[0].toLowerCase();
    found.push({
      kind,
      text: word,
      start: match.index,
      end: match.index + word.length,
      plural: /(s|es)$/.test(head) && !/^(gas|glp|di[eé]sel|luz|acpm)$/.test(head),
    });
  }
  return found;
}

function findQuantities(clause: string): Quantity[] {
  const found: Quantity[] = [];
  for (const match of clause.matchAll(QUANTITY_RE)) {
    const value = signedNumber(match[1], match[2]);
    const unit = unitFromToken(match[3]);
    if (value === null || unit === null) continue;
    found.push({ value, unit, start: match.index, end: match.index + match[0].length });
  }
  return found;
}

/** Número justo antes de la palabra del vehículo: "5 camionetas", "Dos motos". */
function countBefore(clause: string, keyword: Keyword): (Span & { value: number }) | null {
  const before = clause.slice(0, keyword.start);
  const match = new RegExp(`${START}${SIGN}(${NUMBER})\\s+$`, "iu").exec(before);
  if (!match) return null;
  const value = signedNumber(match[1], match[2]);
  return value === null ? null : { value, start: match.index, end: keyword.start };
}

const UNIT_GROUP: Record<Unit, "energy" | "liquid" | "volume" | "mass" | "distance"> = {
  kWh: "energy",
  MWh: "energy",
  L: "liquid",
  gal: "liquid",
  m3: "volume",
  kg: "mass",
  lb: "mass",
  t: "mass",
  km: "distance",
  mi: "distance",
  h: "distance",
};

const LABELS: Record<Exclude<Activity, "other">, string> = {
  electricity_grid: "Electricidad de la red",
  diesel: "Diésel",
  gasoline: "Gasolina",
  natural_gas: "Gas natural",
  lpg: "Gas propano (GLP)",
  vehicle_delivery_van: "Camionetas de reparto (diésel)",
  vehicle_car: "Autos (gasolina)",
  vehicle_motorcycle: "Motos",
  vehicle_truck: "Camiones",
  waste_landfill: "Residuos a relleno sanitario",
};

const SINGULAR_LABELS: Partial<Record<Activity, string>> = {
  vehicle_delivery_van: "Camioneta de reparto (diésel)",
  vehicle_car: "Auto (gasolina)",
  vehicle_motorcycle: "Moto",
  vehicle_truck: "Camión",
};

function labelFor(activity: Activity, count: number | null = null): string {
  if (activity === "other") return "Consumo sin identificar";
  if (count === 1 && SINGULAR_LABELS[activity]) return SINGULAR_LABELS[activity]!;
  return LABELS[activity];
}

function quoteOf(clause: Clause, spans: (Span | null | undefined)[]): string {
  const valid = spans.filter((s): s is Span => Boolean(s));
  if (valid.length === 0) return clause.text;
  const start = Math.min(...valid.map((s) => s.start));
  const end = Math.max(...valid.map((s) => s.end));
  return clause.text.slice(start, end).trim();
}

function blankItem(activity: Activity, source_quote: string): ExtractedItem {
  return {
    activity,
    label: labelFor(activity),
    quantity: null,
    unit: null,
    vehicle_count: null,
    per_vehicle: null,
    source_quote,
    notes: null,
  };
}

function extractClause(clause: Clause, extraction: Extraction): void {
  const keywords = findKeywords(clause.text);
  const quantities = findQuantities(clause.text);
  if (keywords.length === 0 && quantities.length === 0) {
    if (/\d/.test(clause.text) && CONSUMPTION_WORD_RE.test(clause.text)) {
      extraction.ignored.push({
        quote: clause.text,
        reason: "Vimos un número, pero no reconocimos un consumo con unidad.",
      });
    }
    return;
  }

  const vehicleKw = keywords.find((k) => VEHICLE_KINDS.has(k.kind));
  const fuelKw = keywords.find((k) => LIQUID_FUELS.has(k.kind));
  const gasKw = keywords.find((k) => k.kind === "natural_gas" || k.kind === "gas" || k.kind === "lpg");
  const elecKw = keywords.find((k) => k.kind === "electricity_grid");
  const wasteKw = keywords.find((k) => k.kind === "waste_landfill");

  const used = new Set<Keyword>();
  const items: ExtractedItem[] = [];
  const vehicleQuantities: Quantity[] = [];
  let hasFuelLiters = false;

  const add = (activity: Activity, q: Quantity, kw: Keyword | undefined, notes: string | null = null) => {
    if (kw) used.add(kw);
    items.push({
      ...blankItem(activity, quoteOf(clause, [q, kw])),
      quantity: q.value,
      unit: q.unit,
      notes,
    });
  };

  for (const q of quantities) {
    switch (UNIT_GROUP[q.unit]) {
      case "energy":
        add("electricity_grid", q, elecKw);
        break;
      case "liquid":
        if (fuelKw) {
          hasFuelLiters = fuelKw.kind !== "lpg";
          add(fuelKw.kind as Activity, q, fuelKw);
        } else if (gasKw) {
          add("lpg", q, gasKw);
        } else {
          add("other", q, undefined, "No dijiste de qué combustible son estos litros (¿diésel, gasolina, gas?).");
        }
        break;
      case "volume":
        if (gasKw) add(gasKw.kind === "lpg" ? "lpg" : "natural_gas", q, gasKw);
        else add("other", q, undefined, "No sabemos a qué corresponden estos m³ (¿gas natural? ¿agua?).");
        break;
      case "mass":
        if (wasteKw) add("waste_landfill", q, wasteKw);
        else if (gasKw && gasKw.kind !== "natural_gas") add("lpg", q, gasKw);
        else add("other", q, undefined, "No sabemos a qué corresponden estos kilos (¿basura? ¿gas?).");
        break;
      case "distance":
        if (vehicleKw) vehicleQuantities.push(q);
        else add("other", q, undefined, "No dijiste qué vehículo hizo este recorrido (¿camioneta, moto, carro, camión?).");
        break;
    }
  }

  if (vehicleKw) {
    const count = countBefore(clause.text, vehicleKw);
    const vehicleCount = count?.value ?? (vehicleKw.plural ? null : 1);
    const perVehicleMatch = PER_VEHICLE_RE.exec(clause.text);
    const totalMatch = IN_TOTAL_RE.exec(clause.text);
    const perVehicle = perVehicleMatch ? true : totalMatch ? false : null;
    const modifier = perVehicleMatch ?? totalMatch;
    const modifierSpan = modifier ? { start: modifier.index, end: modifier.index + modifier[0].length } : null;

    // Preferimos distancia real (km, millas) sobre horas.
    const distance =
      vehicleQuantities.find((q) => q.unit !== "h") ?? vehicleQuantities[0] ?? null;

    if (distance) {
      used.add(vehicleKw);
      items.unshift({
        ...blankItem(vehicleKw.kind as Activity, quoteOf(clause, [count, vehicleKw, distance, modifierSpan])),
        label: labelFor(vehicleKw.kind as Activity, vehicleCount),
        quantity: distance.value,
        unit: distance.unit,
        vehicle_count: vehicleCount,
        per_vehicle: perVehicle,
      });
      for (const q of vehicleQuantities) {
        if (q === distance) continue;
        extraction.ignored.push({
          quote: clause.text.slice(q.start, q.end),
          reason: "Ya usamos la distancia en km; no sumamos también las horas.",
        });
      }
    } else if (hasFuelLiters) {
      used.add(vehicleKw);
      extraction.ignored.push({
        quote: vehicleKw.text,
        reason: "Es el vehículo donde se usó el combustible; contamos los litros, no la distancia.",
      });
    } else {
      used.add(vehicleKw);
      items.unshift({
        ...blankItem(vehicleKw.kind as Activity, quoteOf(clause, [count, vehicleKw])),
        label: labelFor(vehicleKw.kind as Activity, vehicleCount),
        vehicle_count: vehicleCount,
        per_vehicle: perVehicle,
      });
    }
  }

  // Palabras clave sin cantidad: se mencionan pero no se pueden calcular sin inventar.
  for (const kw of keywords) {
    if (used.has(kw) || VEHICLE_KINDS.has(kw.kind)) continue;
    if (items.some((item) => item.activity === resolveKind(kw.kind))) continue;
    used.add(kw);
    items.push(blankItem(resolveKind(kw.kind), kw.text));
  }

  extraction.items.push(...items);
}

/** "gas" a secas sin unidad: no sabemos si es natural o propano; lo tratamos como natural. */
function resolveKind(kind: KeywordKind): Activity {
  return kind === "gas" ? "natural_gas" : kind;
}

export function extractByRules(text: string): Extraction {
  const extraction: Extraction = { items: [], ignored: [] };
  for (const clause of splitClauses(text)) extractClause(clause, extraction);
  // Una mención sin cantidad ("los desechos") sobra si el mismo consumo ya tiene cantidad.
  extraction.items = extraction.items.filter(
    (item) =>
      item.quantity !== null ||
      !extraction.items.some((other) => other.activity === item.activity && other.quantity !== null),
  );
  return extraction;
}

// ───────────────────────── Revisión ─────────────────────────

const VEHICLE_NOUN: Partial<
  Record<Activity, { one: string; many: string; the: string; theOne: string }>
> = {
  vehicle_delivery_van: { one: "camioneta", many: "camionetas", the: "las camionetas", theOne: "la camioneta" },
  vehicle_motorcycle: { one: "moto", many: "motos", the: "las motos", theOne: "la moto" },
  vehicle_car: { one: "carro", many: "carros", the: "los carros", theOne: "el carro" },
  vehicle_truck: { one: "camión", many: "camiones", the: "los camiones", theOne: "el camión" },
};

const isVehicle = (activity: Activity) => activity.startsWith("vehicle_");

/**
 * Pregunta por la cantidad con la concordancia correcta (iteración 6, UI-4): antes era
 * "¿Cuánto ${label}…", que daba "¿Cuánto electricidad de la red usaron?".
 */
const AMOUNT_QUESTION: Partial<Record<Activity, { ask: string; units: string }>> = {
  electricity_grid: { ask: "¿Cuánta electricidad usaron", units: "kWh" },
  diesel: { ask: "¿Cuánto diésel usaron", units: "litros o galones" },
  gasoline: { ask: "¿Cuánta gasolina usaron", units: "litros o galones" },
  natural_gas: { ask: "¿Cuánto gas natural usaron", units: "m³" },
  lpg: { ask: "¿Cuánto gas propano (GLP) usaron", units: "kg o litros" },
  waste_landfill: { ask: "¿Cuánta basura botaron", units: "kg o toneladas" },
};

export function reviewByRules(_text: string, extraction: Extraction): ReviewResult {
  const issues: ValidationIssue[] = [];
  const questions: string[] = [];
  const { items } = extraction;

  for (const item of items) {
    const noun = VEHICLE_NOUN[item.activity];
    if (noun && item.quantity === null) {
      const several = item.vehicle_count === null || item.vehicle_count > 1;
      questions.push(
        several
          ? `¿Cuántos kilómetros recorrieron (o cuántas horas trabajaron) ${noun.the}? Sin ese dato no calculamos su huella.`
          : `¿Cuántos kilómetros recorrió (o cuántas horas trabajó) ${noun.theOne}? Sin ese dato no calculamos su huella.`,
      );
    }
  }

  for (const item of items) {
    if (item.activity === "other") {
      questions.push(
        `¿Qué es «${item.source_quote}»? ${item.notes ?? "Dinos qué consumo es para poder calcularlo."}`,
      );
    } else if (!isVehicle(item.activity) && item.quantity === null) {
      const q = AMOUNT_QUESTION[item.activity];
      questions.push(
        q
          ? `${q.ask}? Con la cantidad y su unidad (${q.units}) lo sumamos al recibo.`
          : `¿Qué cantidad de «${item.source_quote}» usaron? Con la cantidad y su unidad lo sumamos al recibo.`,
      );
    } else if (item.quantity !== null && item.quantity < 0) {
      const q = AMOUNT_QUESTION[item.activity];
      questions.push(
        `${q ? q.ask : "¿Qué cantidad usaron"} en realidad? Escribiste «${item.source_quote}» y un consumo no puede ser negativo, así que no lo sumamos.`,
      );
    } else if (item.quantity !== null && item.unit === null) {
      questions.push(`¿En qué unidad está «${item.source_quote}»?`);
    }
  }

  for (const item of items) {
    const noun = VEHICLE_NOUN[item.activity];
    if (noun && item.unit === "h" && item.quantity !== null) {
      issues.push({
        severity: "info",
        message: `Convertimos las horas de ${noun.many} en kilómetros suponiendo 20 km/h en ciudad. Si tus rutas son más rápidas o más lentas, el resultado cambia.`,
      });
      const several = item.vehicle_count !== null && item.vehicle_count > 1;
      questions.push(
        several
          ? `¿Sabes cuántos kilómetros recorrió cada ${noun.one}? Con ese dato el cálculo sería más preciso.`
          : `¿Sabes cuántos kilómetros recorrió? Con ese dato el cálculo sería más preciso.`,
      );
    }
  }

  const hasFuel = items.some((i) => i.activity === "diesel" || i.activity === "gasoline");
  const hasDistance = items.some((i) => isVehicle(i.activity) && i.quantity !== null);
  if (hasFuel && hasDistance) {
    issues.push({
      severity: "warning",
      message:
        "Contamos el combustible y también los recorridos. Si ese combustible es de esos mismos vehículos, lo estaríamos sumando dos veces.",
    });
  }

  for (const ignored of extraction.ignored) {
    issues.push({ severity: "info", message: `No sumamos «${ignored.quote}»: ${lowerFirst(ignored.reason)}` });
  }

  return { issues, clarifyingQuestion: questions[0] ?? null, discard: [] };
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

// ───────────────────────── Análisis ─────────────────────────

const CATEGORY_SUBJECT: Record<Category, { subject: string; plural: boolean; why: string }> = {
  vehicle: {
    subject: "Los vehículos",
    plural: true,
    why: "Cada kilómetro quema combustible, así que la mayor oportunidad está en las rutas: menos kilómetros se notan de inmediato.",
  },
  electricity: {
    subject: "La electricidad",
    plural: false,
    why: "La luz pesa porque la red eléctrica todavía usa combustibles fósiles; los equipos que pasan todo el día encendidos suelen ser la clave.",
  },
  fuel: {
    subject: "El combustible",
    plural: false,
    why: "Cada litro quemado libera su carbono completo; el mantenimiento y la forma de conducir cambian cuánto se gasta.",
  },
  heating_gas: {
    subject: "El gas",
    plural: false,
    why: "Hornos, estufas y calentadores queman gas todo el tiempo que están prendidos, así que el uso eficiente de la llama se nota.",
  },
  waste: {
    subject: "La basura",
    plural: false,
    why: "En el relleno sanitario los residuos orgánicos se descomponen y liberan metano; separar y reducir ayuda.",
  },
};

const ESTIMATE_NOTE = "Recuerda que es una estimación con factores referenciales, no una medición.";

export function explainByRules(ctx: ExplainContext): { headline: string; summary: string } {
  const pending = ctx.unquantified.length;
  const pendingNote =
    pending > 0
      ? `Dejamos fuera ${pending === 1 ? "un consumo" : `${pending} consumos`} que no pudimos calcular con lo que escribiste: ${ctx.unquantified
          .map((u) => u.label.replace(/\s*\(.*\)$/, "").toLowerCase())
          .join(", ")}.`
      : null;

  if (ctx.lines.length === 0) {
    return {
      headline: "Todavía no podemos sumar tu huella.",
      summary: [
        pendingNote ?? "No encontramos cantidades para calcular.",
        "Cuéntanos cuánto usaste (kWh, litros, km, horas o kg) y lo calculamos al instante.",
      ].join(" "),
    };
  }

  const top = ctx.byCategory[0];
  const meta = CATEGORY_SUBJECT[top.category];
  const headline =
    ctx.byCategory.length === 1
      ? `${meta.subject} ${meta.plural ? "son" : "es"} toda tu huella: ${formatKg(ctx.totalKg)} kg CO₂e.`
      : `${meta.subject} ${meta.plural ? "son" : "es"} el ${formatShare(top.share)} de tu huella.`;

  const parts = ctx.lines
    .slice()
    .sort((a, b) => b.kgCO2e - a.kgCO2e)
    .slice(0, 3)
    .map((line) => `${line.label.replace(/\s*\(.*\)$/, "").toLowerCase()} ${formatKg(line.kgCO2e)} kg`);
  const breakdown = `En total, unos ${formatKg(ctx.totalKg)} kg CO₂e: ${parts.join("; ")}.`;

  return {
    headline,
    summary: [breakdown, meta.why, pendingNote, ESTIMATE_NOTE].filter(Boolean).join(" "),
  };
}

// ───────────────────────── Recomendaciones ─────────────────────────

type RecTemplate = Omit<Recommendation, "category">;

const RECOMMENDATIONS: Record<Category, RecTemplate[]> = {
  vehicle: [
    {
      title: "Agrupa las entregas por zona",
      detail:
        "Planea las rutas del día para que cada vehículo cubra un sector y no se crucen. Menos kilómetros vacíos es menos combustible.",
      impact: "alto",
      effort: "media",
    },
    {
      title: "Cuida llantas y evita el ralentí",
      detail:
        "Llantas bien infladas y motores apagados mientras se carga o se espera reducen el consumo de cada vehículo.",
      impact: "medio",
      effort: "fácil",
    },
    {
      title: "Anota los kilómetros reales",
      detail:
        "Mira el odómetro al salir y al volver. Sabrás qué rutas pesan más y el cálculo dejará de depender de supuestos.",
      impact: "bajo",
      effort: "fácil",
    },
  ],
  electricity: [
    {
      title: "Apaga equipos al cerrar",
      detail:
        "Revisa qué queda encendido fuera del horario (luces, cargadores, equipos en espera) y desconéctalo o prográmalo.",
      impact: "medio",
      effort: "fácil",
    },
    {
      title: "Revisa neveras y congeladores",
      detail:
        "Limpia los serpentines, revisa los empaques de las puertas y no las abras de más: son los equipos que más trabajan todo el día.",
      impact: "medio",
      effort: "media",
    },
    {
      title: "Cambia a iluminación LED",
      detail: "Reemplaza bombillos y tubos fluorescentes por LED, empezando por los que pasan más horas encendidos.",
      impact: "bajo",
      effort: "fácil",
    },
  ],
  fuel: [
    {
      title: "Mantén el motor al día",
      detail:
        "Cambios de aceite, filtros y afinación a tiempo hacen que cada litro rinda más. Pide la revisión en el próximo mantenimiento.",
      impact: "medio",
      effort: "media",
    },
    {
      title: "Conduce suave y sin ralentí",
      detail:
        "Acelerar y frenar con calma y apagar el motor en esperas largas reduce el consumo sin cambiar de vehículo.",
      impact: "medio",
      effort: "fácil",
    },
    {
      title: "Registra cada tanqueo",
      detail: "Anota litros y kilometraje en cada carga para detectar a tiempo un vehículo que empieza a gastar de más.",
      impact: "bajo",
      effort: "fácil",
    },
  ],
  heating_gas: [
    {
      title: "Revisa quemadores y posibles fugas",
      detail:
        "Una llama azul y pareja indica buena combustión; si es amarilla o hay olor a gas, pide mantenimiento de estufas y hornos.",
      impact: "medio",
      effort: "media",
    },
    {
      title: "Aprovecha el calor del horno",
      detail:
        "Hornea en tandas seguidas en lugar de prender y apagar, y no precalientes más tiempo del necesario.",
      impact: "medio",
      effort: "fácil",
    },
    {
      title: "Tapa ollas y ajusta la llama",
      detail: "Cocinar con tapa y con la llama del tamaño de la olla usa menos gas para el mismo resultado.",
      impact: "bajo",
      effort: "fácil",
    },
  ],
  waste: [
    {
      title: "Separa los residuos orgánicos",
      detail:
        "Los restos de comida en el relleno generan metano. Sepáralos y entrégalos a un gestor de compostaje o a una huerta cercana.",
      impact: "medio",
      effort: "media",
    },
    {
      title: "Reduce el desperdicio de producto",
      detail:
        "Ajusta la producción a lo que realmente se vende y dona o aprovecha los excedentes antes de que se vuelvan basura.",
      impact: "medio",
      effort: "media",
    },
    {
      title: "Recicla cartón y plástico",
      detail: "Deja el material limpio y separado para un reciclador de tu zona; lo que se recicla no llega al relleno.",
      impact: "bajo",
      effort: "fácil",
    },
  ],
};

export function recommendByRules(ctx: ExplainContext): Recommendation[] {
  if (ctx.byCategory.length === 0) return [];
  const [first, second] = ctx.byCategory;
  const picks: Recommendation[] = [];
  const take = (category: Category, count: number) => {
    for (const template of RECOMMENDATIONS[category]) {
      if (picks.length >= 3 || count === 0) break;
      if (picks.some((p) => p.title === template.title)) continue;
      picks.push({ ...template, category });
      count--;
    }
  };

  take(first.category, second ? 2 : 3);
  if (second) take(second.category, 1);
  if (picks.length < 3) take(first.category, 3 - picks.length);

  return picks.map((rec) => {
    const share = ctx.byCategory.find((c) => c.category === rec.category)?.share ?? 0;
    // Si la categoría pesa poco en tu huella, el impacto de actuar ahí también es bajo.
    return share < 0.2 ? { ...rec, impact: "bajo" } : rec;
  });
}

// ───────────────────────── Intérprete ─────────────────────────

export const demoInterpreter: Interpreter = {
  mode: "demo",
  async extract(text) {
    return extractByRules(text);
  },
  async review(text, extraction) {
    return reviewByRules(text, extraction);
  },
  async explain(ctx) {
    return explainByRules(ctx);
  },
  async recommend(ctx) {
    return recommendByRules(ctx);
  },
};

