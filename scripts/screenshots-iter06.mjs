// Capturas y comprobaciones del "después" de la iteración 6 (debugging) con Playwright.
// Uso: node scripts/screenshots-iter06.mjs --base http://127.0.0.1:3200 --base-badkey http://127.0.0.1:3201
//        [--out docs/evidence/screenshots]
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const BASE = opt("base");
const BASE_BADKEY = opt("base-badkey");
if (!BASE || !BASE_BADKEY) throw new Error("--base y --base-badkey son obligatorios");
const OUT = path.resolve(opt("out", "docs/evidence/screenshots"));
fs.mkdirSync(OUT, { recursive: true });

const T01 = "Hoy usamos 5 camionetas de reparto durante 8 horas y gastamos 200 kWh de luz.";
const T07 = "Hola, hoy vendimos muchas empanadas y los clientes estaban felices.";
const T08A = "Consumimos -50 kWh de electricidad.";
const SUBMIT = process.platform === "darwin" ? "Meta+Enter" : "Control+Enter";
const RESULT = '[role="region"][aria-label="Resultado del análisis"]';
const ERROR = '[role="alert"][aria-labelledby="error-title"]';
const PIPELINE = 'section[aria-labelledby="pipeline-title"]';

const cached = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? (fs.existsSync(cached) ? cached : undefined),
});

const clean = (text) => text.replace(/\s+/g, " ").trim();

/** Encabezado del pipeline, estado de cada etapa y, si hay, el error con sus botones. */
async function probe(page) {
  const pipeline = page.locator(PIPELINE);
  const alert = page.locator(ERROR);
  const hasAlert = (await alert.count()) > 0;
  return {
    headline: clean(await pipeline.locator("p[aria-live]").innerText()),
    stages: (await pipeline.locator("ol > li").allInnerTexts()).map(clean),
    alert: hasAlert ? clean(await alert.innerText()) : null,
    buttons: hasAlert ? await alert.getByRole("button").allInnerTexts() : [],
  };
}

async function scenario(name, { base = BASE, width = 1440 }, run) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  const entry = { name };
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    Object.assign(entry, await run(page, context));
  } catch (error) {
    entry.error = String(error).split("\n")[0];
  }
  entry.consoleErrors = consoleErrors;
  await context.close();
  console.log(`### ${name}\n${JSON.stringify(entry, null, 1)}`);
  return entry;
}

async function submit(page, text) {
  await page.getByRole("textbox").first().fill(text);
  await page.getByRole("textbox").first().press(SUBMIT);
}

async function shot(page, file) {
  await page.waitForTimeout(900); // deja terminar animaciones y scroll suave
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  return path.relative(process.cwd(), path.join(OUT, file));
}

// UI-1 · no_data: el encabezado ya no dice "Listo".
await scenario("UI-1 · sin datos", {}, async (page) => {
  await submit(page, T07);
  await page.waitForSelector(ERROR, { timeout: 30000 });
  return { ...(await probe(page)), screenshot: await shot(page, "06-ui1-sin-datos.png") };
});

// UI-2 · clave inválida: sin "Intentar de nuevo", modo demo como acción principal (y funciona).
await scenario("UI-2 · clave inválida", { base: BASE_BADKEY }, async (page) => {
  await submit(page, T01);
  await page.waitForSelector(ERROR, { timeout: 60000 });
  const before = await probe(page);
  const screenshot = await shot(page, "06-ui2-clave-invalida.png");
  await page.locator(ERROR).getByRole("button", { name: "Probar en modo demo" }).click();
  const demoWorks = await page
    .waitForSelector(RESULT, { timeout: 30000 })
    .then(async () => /Modo demo/i.test(await page.locator(RESULT).innerText()))
    .catch(() => false);
  return { ...before, screenshot, demoRetryShowsDemoResult: demoWorks };
});

// UI-3 · sin red: sólo "Intentar de nuevo" y la primera etapa en error.
await scenario("UI-3 · sin conexión", {}, async (page, context) => {
  await page.getByRole("textbox").first().fill(T01);
  await context.setOffline(true);
  await page.getByRole("textbox").first().press(SUBMIT);
  await page.waitForSelector(ERROR, { timeout: 15000 });
  return { ...(await probe(page)), screenshot: await shot(page, "06-ui3-sin-conexion.png") };
});

// H1 · recibo en modo demo: "Eco interpretó (reglas)" y "Eco lee tu texto (reglas)".
await scenario("H1 · recibo modo demo", {}, async (page) => {
  await submit(page, T01);
  await page.waitForSelector(RESULT, { timeout: 30000 });
  const receipt = page.locator('article[aria-labelledby="receipt-title"]');
  const text = await receipt.innerText();
  return {
    ...(await probe(page)),
    receiptSaysAi: /IA interpret/i.test(text),
    receiptSaysRules: /Eco interpretó \(reglas\)/i.test(text),
    screenshot: await shot(page, "06-h1-recibo-demo.png"),
  };
});

// F1 · negativo: "No cuantificado" con la cita completa y la razón.
await scenario("F1 · valor negativo", {}, async (page) => {
  await submit(page, T08A);
  await page.waitForSelector(RESULT, { timeout: 30000 });
  const unquantified = page.locator('section[aria-labelledby="unquantified-title"]');
  return {
    ...(await probe(page)),
    unquantified: (await unquantified.count()) ? clean(await unquantified.innerText()) : null,
    screenshot: await shot(page, "06-f1-negativo.png"),
  };
});

await browser.close();
