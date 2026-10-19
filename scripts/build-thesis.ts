// Copies the thesis manuscript into the site: the Markdown chapters (chapters_v2 + bibliography, in the order of
// build-thesis.ps1), the figures they reference, the glossary and the submitted PDF.
// Usage: MT_THESIS=<thesis folder> [MT_GLOSSARY=<GLOSSARY.md>] npm run thesis
import fs from "node:fs";
import path from "node:path";

const SRC = process.env.MT_THESIS ?? path.resolve("..", "..", "Thesis", "Code", "mota24", "thesis");
const OUT_MD = path.resolve("content", "thesis");
const OUT_IMG = path.resolve("public", "thesis", "img");
const OUT_PDF = path.resolve("public", "thesis", "thesis.pdf");

const FILES: [string, string][] = [
  ["chapters_v2/00_abstract.md", "abstract"],
  ["chapters_v2/00b_nomenclature.md", "nomenclature"],
  ["chapters_v2/01_introduction.md", "introduction"],
  ["chapters_v2/02_foundations.md", "foundations"],
  ["chapters_v2/03_related_work.md", "related-work"],
  ["chapters_v2/04_task_environment.md", "task-and-environment"],
  ["chapters_v2/05_method.md", "method"],
  ["chapters_v2/06_experiments.md", "experiments"],
  ["chapters_v2/07_discussion_conclusion.md", "discussion-and-conclusion"],
  ["chapters/bibliography.md", "bibliography"],
  ["chapters_v2/08_appendix_a_prompts.md", "appendix-a"],
  ["chapters_v2/09_appendix_b_solver_floors.md", "appendix-b"],
  ["chapters_v2/10_appendix_c_platform.md", "appendix-c"],
  ["chapters_v2/11_appendix_d_configuration.md", "appendix-d"],
  ["chapters_v2/12_appendix_e_incidents.md", "appendix-e"],
  ["chapters_v2/13_appendix_f_lineage.md", "appendix-f"],
  ["chapters_v2/14_appendix_g_reasoning.md", "appendix-g"],
  ["chapters_v2/15_ai_usage_declaration.md", "ai-usage"],
];

if (!fs.existsSync(SRC)) throw new Error(`thesis folder not found: ${SRC} (set MT_THESIS)`);
fs.rmSync(OUT_MD, { recursive: true, force: true });
fs.rmSync(OUT_IMG, { recursive: true, force: true });
fs.mkdirSync(OUT_MD, { recursive: true });
fs.mkdirSync(OUT_IMG, { recursive: true });

const index: { slug: string; title: string; source: string }[] = [];
let images = 0;
for (const [rel, slug] of FILES) {
  const file = path.join(SRC, rel);
  let md = fs.readFileSync(file, "utf8");
  md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt: string, src: string) => {
    const from = path.resolve(path.dirname(file), src);
    if (!fs.existsSync(from)) throw new Error(`${rel}: image not found: ${src}`);
    const name = path.basename(from);
    fs.copyFileSync(from, path.join(OUT_IMG, name));
    images++;
    return `![${alt}](/thesis/img/${name})`;
  });
  const title = (md.match(/^#\s+(.+)$/m)?.[1] ?? slug).trim();
  fs.writeFileSync(path.join(OUT_MD, `${slug}.md`), md);
  index.push({ slug, title, source: rel });
}
fs.writeFileSync(path.join(OUT_MD, "index.json"), JSON.stringify({ copied: new Date().toISOString(), chapters: index }, null, 2));

const glossary = process.env.MT_GLOSSARY ?? path.resolve(SRC, "..", "GLOSSARY.md");
if (fs.existsSync(glossary)) fs.copyFileSync(glossary, path.resolve("GLOSSARY.md"));

const pdf = path.join(SRC, "latex", "main.pdf");
if (fs.existsSync(pdf)) fs.copyFileSync(pdf, OUT_PDF);
console.log(`${index.length} chapters, ${images} images${fs.existsSync(pdf) ? ", thesis.pdf" : ""} → content/thesis, public/thesis`);
