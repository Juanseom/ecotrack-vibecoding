// Captura de evidencia con Playwright.
// Uso: node scripts/screenshot.mjs --out docs/evidence/screenshots/x.png [--url http://localhost:3000]
//        [--width 1440] [--height 900] [--full] [--text "Hoy usamos..."] [--submit]
//        [--wait "selector"] [--timeout 60000] [--delay 0] [--offline]
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);

const url = opt("url", "http://localhost:3000");
const out = opt("out");
if (!out) throw new Error("--out es obligatorio");

// Usa el Chromium de Playwright en caché si la revisión que pide el paquete no está instalada.
const cached = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
);
const executablePath = process.env.CHROME_PATH ?? (fs.existsSync(cached) ? cached : undefined);

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({
  viewport: { width: Number(opt("width", 1440)), height: Number(opt("height", 900)) },
  deviceScaleFactor: 2,
});
await page.goto(url, { waitUntil: "networkidle" });

const text = opt("text");
if (text) {
  await page.getByRole("textbox").first().fill(text);
}
if (flag("offline")) await page.context().setOffline(true);
if (flag("submit")) {
  await page.getByRole("textbox").first().press(process.platform === "darwin" ? "Meta+Enter" : "Control+Enter");
}
const wait = opt("wait");
if (wait) await page.waitForSelector(wait, { timeout: Number(opt("timeout", 60000)) });
const delay = Number(opt("delay", 0));
if (delay) await page.waitForTimeout(delay);

fs.mkdirSync(path.dirname(out), { recursive: true });
await page.screenshot({ path: out, fullPage: flag("full") });
await browser.close();
console.log(`captura guardada: ${out}`);
