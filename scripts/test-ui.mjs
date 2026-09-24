// Pruebas de interfaz (iteración 5) con Playwright: capturas 05-*.png y comprobaciones.
// Uso: node scripts/test-ui.mjs --base http://127.0.0.1:3200 --base-badkey http://127.0.0.1:3201
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
const SUBMIT = process.platform === "darwin" ? "Meta+Enter" : "Control+Enter";
const RESULT = '[role="region"][aria-label="Resultado del análisis"]';
const ERROR = '[role="alert"][aria-labelledby="error-title"]';

const cached = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? (fs.existsSync(cached) ? cached : undefined),
});

const report = { executedAt: new Date().toISOString(), scenarios: [] };

/** Abre un contexto nuevo, registra la consola y ejecuta el escenario. */
async function scenario(name, { width, base = BASE }, run) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));
  const entry = { name, width, base, consoleErrors };
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    Object.assign(entry, await run(page, context));
  } catch (error) {
    entry.error = String(error).split("\n")[0];
  }
  entry.scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth).catch(() => null);
  entry.horizontalOverflow = entry.scrollWidth !== null ? entry.scrollWidth > width : null;
  report.scenarios.push(entry);
  await context.close();
  console.log(
    `${name.padEnd(28)} ${entry.error ? `ERROR ${entry.error}` : "ok"} · scrollWidth ${entry.scrollWidth}/${width} · consola: ${consoleErrors.length} error(es)`,
  );
  return entry;
}

async function submit(page, text) {
  await page.getByRole("textbox").first().fill(text);
  await page.getByRole("textbox").first().press(SUBMIT);
}

const shot = async (page, file) => {
  await page.waitForTimeout(900); // deja terminar animaciones y scroll suave
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  return path.relative(process.cwd(), path.join(OUT, file));
};

// Estado vacío en móvil
await scenario("vacío · móvil 390", { width: 390 }, async (page) => ({
  screenshot: await shot(page, "05-vacio-mobile.png"),
}));

// T01 escritorio + persistencia del historial tras recargar
await scenario("T01 · escritorio 1440", { width: 1440 }, async (page) => {
  await submit(page, T01);
  await page.waitForSelector(RESULT, { timeout: 30000 });
  const total = (await page.locator(RESULT).innerText()).match(/290/) !== null;
  const screenshot = await shot(page, "05-t01-desktop.png");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("ecotrack:history") ?? "[]").length);
  await page.reload({ waitUntil: "networkidle" });
  const history = page.locator('section[aria-labelledby="history-title"]');
  const historyText = (await history.innerText()).replace(/\s+/g, " ");
  const storedAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("ecotrack:history") ?? "[]").length);
  // Reabre el primer elemento del historial.
  const firstItem = history.getByRole("button").filter({ hasNotText: /borrar/i }).first();
  let reopened = false;
  if ((await firstItem.count()) > 0) {
    await firstItem.click();
    reopened = await page.locator(RESULT).isVisible({ timeout: 5000 }).catch(() => false);
  }
  return {
    screenshot,
    shows290: total,
    history: { storedBeforeReload: stored, storedAfterReload: storedAfter, historyText: historyText.slice(0, 200), reopened },
  };
});

// T01 móvil
await scenario("T01 · móvil 390", { width: 390 }, async (page) => {
  await submit(page, T01);
  await page.waitForSelector(RESULT, { timeout: 30000 });
  return { screenshot: await shot(page, "05-t01-mobile.png") };
});

// T07 sin datos
await scenario("T07 · sin datos 1440", { width: 1440 }, async (page) => {
  await submit(page, T07);
  await page.waitForSelector(ERROR, { timeout: 30000 });
  const text = (await page.locator(ERROR).innerText()).replace(/\s+/g, " ");
  return { screenshot: await shot(page, "05-t07-sin-datos.png"), alertText: text };
});

// T09 error de IA (servidor con clave inválida) + botón «Probar en modo demo»
await scenario("T09 · error IA 1440", { width: 1440, base: BASE_BADKEY }, async (page) => {
  await submit(page, T01);
  await page.waitForSelector(ERROR, { timeout: 60000 });
  const alert = page.locator(ERROR);
  const text = (await alert.innerText()).replace(/\s+/g, " ");
  const demoButton = await alert.getByRole("button", { name: "Probar en modo demo" }).count();
  const screenshot = await shot(page, "05-t09-error-ia.png");
  let demoWorks = null;
  if (demoButton) {
    await alert.getByRole("button", { name: "Probar en modo demo" }).click();
    demoWorks = await page
      .waitForSelector(RESULT, { timeout: 30000 })
      .then(async () => /demo/i.test(await page.locator(RESULT).innerText()))
      .catch(() => false);
  }
  return { screenshot, alertText: text, demoButton: demoButton > 0, demoRetryShowsDemoResult: demoWorks };
});

// T09 móvil (overflow con mensaje de error largo)
await scenario("T09 · error IA 390", { width: 390, base: BASE_BADKEY }, async (page) => {
  await submit(page, T01);
  await page.waitForSelector(ERROR, { timeout: 60000 });
  return {};
});

// T10 sin conexión
await scenario("T10 · sin conexión 1440", { width: 1440 }, async (page, context) => {
  await page.getByRole("textbox").first().fill(T01);
  await context.setOffline(true);
  await page.getByRole("textbox").first().press(SUBMIT);
  await page.waitForSelector(ERROR, { timeout: 15000 });
  const alert = page.locator(ERROR);
  const text = (await alert.innerText()).replace(/\s+/g, " ");
  const retry = await alert.getByRole("button", { name: "Intentar de nuevo" }).count();
  const screenshot = await shot(page, "05-t10-sin-conexion.png");
  // Vuelve la red y reintenta.
  await context.setOffline(false);
  await alert.getByRole("button", { name: "Intentar de nuevo" }).click();
  const recovered = await page
    .waitForSelector(RESULT, { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  return { screenshot, alertText: text, retryButton: retry > 0, recoveredAfterRetry: recovered };
});

// T10 móvil
await scenario("T10 · sin conexión 390", { width: 390 }, async (page, context) => {
  await page.getByRole("textbox").first().fill(T01);
  await context.setOffline(true);
  await page.getByRole("textbox").first().press(SUBMIT);
  await page.waitForSelector(ERROR, { timeout: 15000 });
  return {};
});

await browser.close();
const outFile = opt("report");
if (outFile) fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
