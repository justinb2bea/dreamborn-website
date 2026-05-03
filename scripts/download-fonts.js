#!/usr/bin/env node
/**
 * Font setup script — copies woff2 files from fontsource packages into public/fonts/
 * Runs automatically via postinstall.
 *
 * Fonts needed (all from @fontsource):
 *   Bebas Neue: 400
 *   Lora: 400, 700, 400-italic, 700-italic
 *   Fraunces: 300, 400, 600
 *   DM Sans: 400, 500, 600
 */

const fs = require("fs");
const path = require("path");

const FONTS_DIR = path.join(__dirname, "..", "public", "fonts");

// Ensure output directory exists
fs.mkdirSync(FONTS_DIR, { recursive: true });

function copyFont(pkgName, srcFile, destFile) {
  const src = path.join(__dirname, "..", "node_modules", pkgName, "files", srcFile);
  const dest = path.join(FONTS_DIR, destFile);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ ${destFile}`);
  } else {
    console.warn(`⚠ Missing: ${src} — skipping ${destFile}`);
  }
}

// DM Sans
copyFont("@fontsource/dm-sans", "dm-sans-latin-400-normal.woff2", "dm-sans-400.woff2");
copyFont("@fontsource/dm-sans", "dm-sans-latin-500-normal.woff2", "dm-sans-500.woff2");
copyFont("@fontsource/dm-sans", "dm-sans-latin-600-normal.woff2", "dm-sans-600.woff2");

// Lora
copyFont("@fontsource/lora", "lora-latin-400-normal.woff2", "lora-400.woff2");
copyFont("@fontsource/lora", "lora-latin-400-italic.woff2", "lora-400-italic.woff2");
copyFont("@fontsource/lora", "lora-latin-700-normal.woff2", "lora-700.woff2");
copyFont("@fontsource/lora", "lora-latin-700-italic.woff2", "lora-700-italic.woff2");

// Fraunces
copyFont("@fontsource/fraunces", "fraunces-latin-300-normal.woff2", "fraunces-300.woff2");
copyFont("@fontsource/fraunces", "fraunces-latin-400-normal.woff2", "fraunces-400.woff2");
copyFont("@fontsource/fraunces", "fraunces-latin-600-normal.woff2", "fraunces-600.woff2");

// Bebas Neue — available via @fontsource/bebas-neue
copyFont("@fontsource/bebas-neue", "bebas-neue-latin-400-normal.woff2", "bebas-neue-400.woff2");

console.log("\nFont setup complete.");
