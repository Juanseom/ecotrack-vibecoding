// Genera docs/bitacora-ecotrack-ai.pdf a partir de docs/BITACORA.md.
// Uso: node scripts/build-bitacora-pdf.mjs   (requiere `npx marked` disponible)
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const docs = path.resolve("docs");
const md = fs.readFileSync(path.join(docs, "BITACORA.md"), "utf8");
const imgDir = fs.mkdtempSync(path.join(os.tmpdir(), "bitacora-img-"));

// Copia reducida en JPEG sólo para el PDF (las capturas originales no se tocan). Usa `sips` de macOS si existe.
function pdfImage(abs) {
  const out = path.join(imgDir, path.basename(abs).replace(/\.png$/i, ".jpg"));
  try {
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "72", "-Z", "1800", abs, "--out", out], { stdio: "ignore" });
    return out;
  } catch {
    return abs;
  }
}

const body = execFileSync("npx", ["-y", "marked@15", "--gfm"], { input: md, encoding: "utf8" })
  // Rutas relativas → absolutas para que Chromium encuentre las capturas y los enlaces.
  .replace(/(src|href)="(?!https?:|#|mailto:)([^"]+)"/g, (_, attr, rel) => {
    const abs = path.join(docs, rel);
    return attr === "src"
      ? `src="${pathToFileURL(pdfImage(abs)).href}"`
      : `href="https://github.com/Juanseom/ecotrack-vibecoding/blob/main/docs/${rel}"`;
  });

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 16mm 14mm; }
  body { font: 10.5pt/1.5 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #16241C; }
  h1 { font: 600 22pt Georgia, serif; color: #2F5D43; margin: 0 0 6pt; }
  h2 { font: 600 15pt Georgia, serif; color: #2F5D43; border-bottom: 1px dotted #A7C4A0; padding-bottom: 3pt; margin-top: 18pt; break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 12pt 0 4pt; break-after: avoid; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 9pt; break-inside: auto; }
  th, td { border: 1px solid #D8D2C0; padding: 4pt 5pt; vertical-align: top; text-align: left; }
  th { background: #EAE5D6; }
  tr { break-inside: avoid; }
  code { font: 8.5pt Menlo, monospace; background: #F4F1E8; padding: 0 2pt; }
  pre { background: #F4F1E8; padding: 6pt; font-size: 8.5pt; white-space: pre-wrap; break-inside: avoid; }
  pre code { background: none; padding: 0; }
  blockquote { margin: 6pt 0; padding: 4pt 10pt; border-left: 3px solid #2F5D43; color: #4A5A50; background: #F4F1E8; }
  img { display: block; max-width: 100%; max-height: 17cm; width: auto; margin: 6pt auto; border: 1px solid #D8D2C0; break-inside: avoid; }
  td img { max-height: 12cm; }
  a { color: #2F5D43; }
  hr { border: 0; border-top: 1px dotted #A7C4A0; }
</style></head><body>${body}</body></html>`;

const tmp = path.join(os.tmpdir(), "bitacora-ecotrack.html");
fs.writeFileSync(tmp, html);

const cached = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? (fs.existsSync(cached) ? cached : undefined),
  args: ["--allow-file-access-from-files"],
});
const page = await browser.newPage();
await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
const out = path.join(docs, "bitacora-ecotrack-ai.pdf");
await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="font-size:8pt;width:100%;text-align:center;color:#4A5A50">EcoTrack AI · Bitácora de Vibe Coding · <span class="pageNumber"></span>/<span class="totalPages"></span></div>',
  margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" },
});
await browser.close();
console.log(`PDF generado: ${out}`);
