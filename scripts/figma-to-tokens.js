#!/usr/bin/env node
/**
 * figma-to-tokens.js
 *
 * Reads the JSON file emitted by the DREAMBORN Tokens Export Figma plugin
 * and writes a CSS file at public/css/tokens-figma.css.
 *
 * Output structure (matches Justin's dreamborn.css v0.3.0 architecture):
 *   :root                       → primitives + spacing + radius (with --db- prefix)
 *   [data-register="brand"]     → brand-mode semantic values
 *   [data-register="editorial"] → editorial-mode semantic values
 *   [data-register="forge"]     → forge-mode semantic values
 *
 * Plus text-style utility classes appended at the end.
 *
 * Run after Dan exports tokens from Figma:
 *   node scripts/figma-to-tokens.js
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PROJECT_INPUT = path.join(PROJECT_ROOT, "tokens", "dreamborn-tokens.json");
const DOWNLOADS_INPUT = path.join(os.homedir(), "Downloads", "dreamborn-tokens.json");
const OUTPUT_CSS = path.join(PROJECT_ROOT, "public", "css", "tokens-figma.css");

const VAR_PREFIX = "--db-";

const FONT_STYLE_TO_WEIGHT = {
  Thin: 100,
  ExtraLight: 200,
  Light: 300,
  Regular: 400,
  Medium: 500,
  SemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  Black: 900
};

function nameToCss(name) {
  return name.replace(/\//g, "-").replace(/\s+/g, "-").toLowerCase();
}

function resolveAliasValue(value) {
  // {Color/Primitive.crimson/600} → var(--db-crimson-600)
  if (typeof value === "string" && value.startsWith("{")) {
    const match = value.match(/^\{(.+?)\.(.+)\}$/);
    if (match) {
      return `var(${VAR_PREFIX}${nameToCss(match[2])})`;
    }
  }
  return value;
}

function formatValue(value, type) {
  if (value === null || value === undefined) return null;

  const resolved = resolveAliasValue(value);
  if (typeof resolved === "string" && resolved.startsWith("var(")) {
    return resolved;
  }

  if (type === "FLOAT" && typeof resolved === "number") {
    return `${resolved}px`;
  }
  if (type === "COLOR") {
    return String(resolved);
  }
  return String(resolved);
}

function locateInputFile() {
  if (fs.existsSync(PROJECT_INPUT)) return PROJECT_INPUT;
  if (fs.existsSync(DOWNLOADS_INPUT)) {
    const tokensDir = path.dirname(PROJECT_INPUT);
    if (!fs.existsSync(tokensDir)) fs.mkdirSync(tokensDir, { recursive: true });
    try {
      fs.copyFileSync(DOWNLOADS_INPUT, PROJECT_INPUT);
      console.log(`✓ Moved ${DOWNLOADS_INPUT} → ${PROJECT_INPUT}`);
      return PROJECT_INPUT;
    } catch (e) {
      // macOS Privacy/Security may block this. Tell the user.
      console.error("✗ Cannot read from Downloads (macOS Privacy protection).");
      console.error("  Please drag dreamborn-tokens.json into the tokens/ folder manually.");
      process.exit(1);
    }
  }
  return null;
}

function build() {
  const inputPath = locateInputFile();
  if (!inputPath) {
    console.error("✗ No dreamborn-tokens.json found.");
    console.error(`  Checked: ${PROJECT_INPUT}`);
    console.error(`  Checked: ${DOWNLOADS_INPUT}`);
    process.exit(1);
  }

  const tokens = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

  // Bucket variables by destination
  const primitives = []; // → :root
  const otherRoot = []; // spacing + radius → :root
  const semanticsByMode = { brand: [], editorial: [], forge: [] };

  Object.entries(tokens.collections).forEach(([collectionName, collection]) => {
    const defaultMode = collection.defaultMode;
    const isPrimitive = /primitive/i.test(collectionName);
    const isSemantic = /semantic/i.test(collectionName);
    const isOther = !isPrimitive && !isSemantic; // spacing, radius

    Object.entries(collection.variables).forEach(([varName, varData]) => {
      const cssName = `${VAR_PREFIX}${nameToCss(varName)}`;

      if (isSemantic) {
        // Emit one entry per mode
        ["brand", "editorial", "forge"].forEach((mode) => {
          if (varData.values[mode] !== undefined && varData.values[mode] !== null) {
            const v = formatValue(varData.values[mode], varData.type);
            if (v !== null) {
              semanticsByMode[mode].push({ cssName, value: v });
            }
          }
        });
      } else if (isPrimitive) {
        const v = formatValue(varData.values[defaultMode], varData.type);
        if (v !== null) primitives.push({ cssName, value: v, collection: collectionName });
      } else {
        const v = formatValue(varData.values[defaultMode], varData.type);
        if (v !== null) otherRoot.push({ cssName, value: v, collection: collectionName });
      }
    });
  });

  // Text styles → utility classes
  const textStyleLines = [];
  Object.entries(tokens.textStyles || {}).forEach(([name, style]) => {
    const className = `text-${nameToCss(name)}`;
    const weight = FONT_STYLE_TO_WEIGHT[style.fontStyle] || 400;
    const lh = style.lineHeight === "AUTO" ? "normal" : `${style.lineHeight}px`;
    const ls =
      typeof style.letterSpacing === "string"
        ? style.letterSpacing
        : `${style.letterSpacing}px`;

    textStyleLines.push(`.${className} {`);
    textStyleLines.push(`  font-family: '${style.fontFamily}', sans-serif;`);
    textStyleLines.push(`  font-weight: ${weight};`);
    textStyleLines.push(`  font-size: ${style.fontSize}px;`);
    textStyleLines.push(`  line-height: ${lh};`);
    textStyleLines.push(`  letter-spacing: ${ls};`);
    textStyleLines.push(`}`);
    textStyleLines.push(``);
  });

  // Compose output
  const lines = [];
  lines.push("/* ============================================================");
  lines.push("   tokens-figma.css — AUTO-GENERATED from Figma. Do not edit.");
  lines.push(`   Source file: ${tokens.meta.file}`);
  lines.push(`   Exported:    ${tokens.meta.exportedAt}`);
  lines.push("   ============================================================ */");
  lines.push("");

  // :root — primitives + spacing + radius
  lines.push(":root {");
  lines.push("  /* ─── Primitives ─── */");
  primitives.forEach(({ cssName, value }) => {
    lines.push(`  ${cssName}: ${value};`);
  });
  lines.push("");
  lines.push("  /* ─── Spacing & Radius ─── */");
  otherRoot.forEach(({ cssName, value }) => {
    lines.push(`  ${cssName}: ${value};`);
  });
  lines.push("}");
  lines.push("");

  // Per-register semantic blocks
  ["brand", "editorial", "forge"].forEach((mode) => {
    if (semanticsByMode[mode].length === 0) return;
    lines.push(`[data-register="${mode}"] {`);
    semanticsByMode[mode].forEach(({ cssName, value }) => {
      lines.push(`  ${cssName}: ${value};`);
    });
    lines.push("}");
    lines.push("");
  });

  // Text styles
  if (textStyleLines.length > 0) {
    lines.push("/* ─── Text Styles ─── */");
    lines.push(...textStyleLines);
  }

  const outDir = path.dirname(OUTPUT_CSS);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT_CSS, lines.join("\n"));

  console.log("");
  console.log("✓ Generated tokens-figma.css");
  console.log(`  Path:           ${OUTPUT_CSS}`);
  console.log(`  Primitives:     ${primitives.length}`);
  console.log(`  Spacing/Radius: ${otherRoot.length}`);
  console.log(`  Semantics:`);
  console.log(`    brand:        ${semanticsByMode.brand.length}`);
  console.log(`    editorial:    ${semanticsByMode.editorial.length}`);
  console.log(`    forge:        ${semanticsByMode.forge.length}`);
  console.log(`  Text styles:    ${Object.keys(tokens.textStyles || {}).length}`);
  console.log("");
}

build();
