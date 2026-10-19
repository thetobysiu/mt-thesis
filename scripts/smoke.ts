// Checks the static export in out/: the main pages exist with their content, and every internal link on the
// non-episode pages points at an exported file. Run after `npm run build`.
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("out");
const PAGES: [string, string][] = [
  ["/", "Main findings"], ["/tour/", "eleven steps"], ["/tour/one-decision/", "One decision"], ["/journey/", "From single episodes"],
  ["/results/", "Results"], ["/episodes/", "Episodes"], ["/compare/", "Compare two episodes"], ["/floors/", "simple"],
  ["/floors/simple/", "leaves the optimal route here"], ["/floors/MT3/", "first turn here"], ["/solver/", "step by step"],
  ["/play/", "Play a floor"], ["/play/simple/", "Simple"],
  ["/prompt-optimisation/", "The loop"], ["/prompt-optimisation/gs2_dsv4flash_bare/", "Candidate"], ["/tower/", "Tower Game"],
  ["/thesis/", "Cite"], ["/thesis/experiments/", "Table 6.5"], ["/glossary/", "Exact solver"], ["/about/", "Privacy notice"],
];
const FILES = ["/game/24/", "/game/24/play/", "/game/24/en.js", "/game/24/main.js", "/thesis/thesis.pdf", "/data/episodes.json", "/data/index.json",
               "/robots.txt", "/sitemap.xml"];

const fileFor = (url: string) => {
  const p = decodeURIComponent(url.split(/[?#]/)[0]);
  const f = path.join(OUT, p);
  return p.endsWith("/") ? path.join(f, "index.html") : f;
};
const errors: string[] = [];
for (const [url, text] of PAGES) {
  const f = fileFor(url);
  if (!fs.existsSync(f)) { errors.push(`missing page ${url}`); continue; }
  if (!fs.readFileSync(f, "utf8").includes(text)) errors.push(`${url}: "${text}" not found`);
}
for (const url of FILES) if (!fs.existsSync(fileFor(url))) errors.push(`missing file ${url}`);

function* htmlFiles(dir: string): Generator<string> {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!(dir === path.join(OUT, "episodes"))) yield* htmlFiles(p); }
    else if (e.name.endsWith(".html")) yield p;
  }
}
let pages = 0, links = 0;
const seen = new Map<string, boolean>();
for (const f of htmlFiles(OUT)) {
  if (f.startsWith(path.join(OUT, "game"))) continue;
  pages++;
  const html = fs.readFileSync(f, "utf8");
  for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)[^"]*"/g)) {
    const url = m[1];
    if (url.startsWith("/_next/") || url.startsWith("/_vercel/")) continue;
    links++;
    // Vercel serves exported .html files only at extension-less URLs
    if (url.endsWith(".html")) errors.push(`${path.relative(OUT, f)}: link to ${url} (404 on Vercel; link the directory)`);
    if (!seen.has(url)) seen.set(url, fs.existsSync(fileFor(url)));
    if (!seen.get(url)) errors.push(`${path.relative(OUT, f)}: broken link ${url}`);
  }
}
if (errors.length) {
  console.error([...new Set(errors)].slice(0, 50).join("\n"));
  console.error(`${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`smoke: ${PAGES.length} pages with content, ${FILES.length} files, ${links} links on ${pages} pages, all resolve`);
