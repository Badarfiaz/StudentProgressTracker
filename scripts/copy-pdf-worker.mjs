// Copies the pdf.js worker into /public so the browser can load it from our own origin.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
try {
  const pkgDir = path.dirname(require.resolve("pdfjs-dist/package.json"));
  const src = path.join(pkgDir, "build", "pdf.worker.min.mjs");
  const dest = path.join(process.cwd(), "public", "pdf.worker.min.mjs");
  if (!existsSync(path.dirname(dest))) mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log("pdf.js worker copied to public/");
} catch (e) {
  console.warn("Could not copy pdf.js worker:", e.message);
}
