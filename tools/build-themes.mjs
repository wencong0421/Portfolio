// Builds deployable copies of the site, one per theme:
//
//   node tools/build-themes.mjs          -> deploy/v1 and deploy/v2
//   node tools/build-themes.mjs v2       -> deploy/v2 only
//
// Each copy has its theme baked into <html data-theme="..."> and the matching browser theme colour.
// Visitors can still preview the other theme with ?theme=v1 or ?theme=v2.

import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "site");
const THEMES = { v1: { color: "#030320" }, v2: { color: "#fbfbfd" } };
const requested = process.argv.slice(2).filter((t) => THEMES[t]);
const themes = requested.length ? requested : Object.keys(THEMES);

for (const theme of themes) {
  const out = path.join(root, "deploy", theme);
  if (existsSync(out)) rmSync(out, { recursive: true, force: true });
  cpSync(source, out, { recursive: true });

  for (const page of ["index.html", "thanks.html"]) {
    const file = path.join(out, page);
    if (!existsSync(file)) continue;
    let html = readFileSync(file, "utf8");
    html = html.replace(/<html lang="en"( data-theme="v\d")?>/, `<html lang="en" data-theme="${theme}">`);
    html = html.replace(/<meta name="theme-color" content="#[0-9a-fA-F]{6}">/, `<meta name="theme-color" content="${THEMES[theme].color}">`);
    writeFileSync(file, html);
  }
  console.log(`Built ${path.relative(root, out)} (theme ${theme})`);
}
