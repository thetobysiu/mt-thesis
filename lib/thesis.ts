// The thesis manuscript as HTML (server only): Markdown from content/thesis, math with KaTeX, numbered anchors for
// sections, tables, figures, listings and algorithms, cross-references as links, footnotes, glossary terms with
// their definitions, and links from table captions to the result cells behind them.
import fs from "node:fs";
import path from "node:path";
import katex from "katex";
import { Marked, type Tokens } from "marked";
import { getResults } from "./data";

const DIR = path.join(process.cwd(), "content", "thesis");

export type ThesisChapter = { slug: string; title: string; label: string; group: "front" | "main" | "back" | "appendix" };
export type Heading = { id: string; text: string; depth: number };

const NUMBERED: Record<string, string> = {
  "1": "introduction", "2": "foundations", "3": "related-work", "4": "task-and-environment", "5": "method", "6": "experiments",
  "7": "discussion-and-conclusion", A: "appendix-a", B: "appendix-b", C: "appendix-c", D: "appendix-d", E: "appendix-e", F: "appendix-f", G: "appendix-g",
};

let chapters: ThesisChapter[] | null = null;
export function getThesisChapters(): ThesisChapter[] {
  if (chapters) return chapters;
  const idx = JSON.parse(fs.readFileSync(path.join(DIR, "index.json"), "utf8")) as { chapters: { slug: string; title: string }[] };
  chapters = idx.chapters.map((c) => {
    const num = Object.entries(NUMBERED).find(([, s]) => s === c.slug)?.[0];
    const title = c.title.replace(/^(Chapter \d+|Appendix [A-G]):\s*/, "");
    const group: ThesisChapter["group"] = /^[A-G]$/.test(num ?? "") ? "appendix" : num ? "main" : c.slug === "bibliography" || c.slug === "ai-usage" ? "back" : "front";
    return { slug: c.slug, title, label: num ? (group === "appendix" ? `Appendix ${num}` : `Chapter ${num}`) : "", group };
  });
  return chapters;
}

const slugify = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const numId = (n: string) => `s-${n.toLowerCase().replace(/\./g, "-")}`;

function headingId(text: string): string {
  const plain = text.replace(/<[^>]+>/g, "");
  const ch = plain.match(/^(Chapter \d+|Appendix [A-G])\b/);
  if (ch) return slugify(ch[1]);
  const num = plain.match(/^((?:\d+|[A-G])(?:\.\d+)+)\s/);
  return num ? numId(num[1]) : slugify(plain);
}

/** Link target of a reference such as "Section 6.4.1", "Table B.3", "Appendix E", "Chapter 3". */
function refHref(kind: string, num: string, current: string): string | null {
  const first = num.split(".")[0].toUpperCase();
  const slug = NUMBERED[first];
  if (!slug) return null;
  const k = kind.toLowerCase().replace(/s$|ices$/, "");
  let anchor = "";
  if (k.startsWith("chapter") || (k.startsWith("append") && !num.includes("."))) anchor = "";
  else if (k.startsWith("section") || k.startsWith("append")) anchor = num.includes(".") ? numId(num) : "";
  else anchor = `${k}-${num.toLowerCase().replace(/\./g, "-")}`;
  const page = slug === current ? "" : `/thesis/${slug}/`;
  return anchor ? `${page}#${anchor}` : page || "#";
}

type GlossTerm = { term: string; id: string; definition: string; avoid: string | null };
let glossary: GlossTerm[] | null = null;
export function getGlossary(): GlossTerm[] {
  if (glossary) return glossary;
  const md = fs.readFileSync(path.join(process.cwd(), "GLOSSARY.md"), "utf8");
  const out: GlossTerm[] = [];
  for (const block of md.split(/\n(?=\*\*[^*]+\*\*:)/)) {
    const m = block.match(/^\*\*([^*]+)\*\*:\s*\n([\s\S]*)$/);
    if (!m) continue;
    const [, term, rest] = m;
    const lines = rest.split("\n");
    const avoidLine = lines.find((l) => l.startsWith("_Avoid_:"));
    const definition = lines.filter((l) => l.trim() && !l.startsWith("_Avoid_:") && !l.startsWith("#")).join(" ").trim();
    out.push({ term: term.trim(), id: slugify(term), definition, avoid: avoidLine ? avoidLine.replace("_Avoid_:", "").trim() : null });
  }
  glossary = out;
  return out;
}

// terms shown as hover definitions in the chapter text: specific phrases, not everyday words
const HOVER_SKIP = new Set(["Turn", "Decision", "Run", "Episode", "Cell", "Assist", "Slack", "Departure", "Treasure", "Way up", "Region (simple floor)",
                            "Critical action / forced action", "Re-run of Table 6.2", "Game rule"]);
function hoverTerms(): { re: RegExp; t: GlossTerm }[] {
  return getGlossary().filter((t) => !HOVER_SKIP.has(t.term)).map((t) => {
    const phrase = t.term.replace(/\s*\(HP\)$/, "");
    const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return { re: new RegExp(`(?<![\\w-])(${esc})(?![\\w-])`, "i"), t };
  }).sort((a, b) => b.t.term.length - a.t.term.length);
}

const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/\*\*|_|`/g, "");

/** Wrap the first occurrence of each glossary term in body text (not in headings, links, code, captions). */
function glossarise(html: string): string {
  const terms = hoverTerms();
  const used = new Set<string>();
  const skipTags = new Set(["a", "code", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "sup", "figcaption", "th"]);
  const stack: string[] = [];
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith("<")) {
      const m = part.match(/^<\/?([a-z0-9]+)/i);
      if (m) {
        const tag = m[1].toLowerCase();
        if (part.startsWith("</")) { const i = stack.lastIndexOf(tag); if (i >= 0) stack.splice(i, 1); }
        else if (!part.endsWith("/>") && !["img", "br", "hr", "input"].includes(tag)) stack.push(tag);
      }
      return part;
    }
    if (!part.trim() || stack.some((t) => skipTags.has(t))) return part;
    let text = part;
    for (const { re, t } of terms) {
      if (used.has(t.id)) continue;
      const m = text.match(re);
      if (!m || m.index == null) continue;
      used.add(t.id);
      const before = text.slice(0, m.index), word = m[1], after = text.slice(m.index + word.length);
      text = `${before}<a class="gloss" href="/glossary/#${t.id}" title="${escAttr(t.definition)}">${word}</a>${after}`;
      break;  // one term per text node keeps the markup simple
    }
    return text;
  }).join("");
}

function resultsLinks(kind: string, num: string): string {
  if (kind !== "Table") return "";
  const re = new RegExp(`(^|\\W)Tables? ${num.replace(/\./g, "\\.")}(?![\\d.])`);
  const hits = getResults().tables.filter((t) => re.test(t.title));
  if (!hits.length) return "";
  return ` <span class="caption-cells">${hits.map((t, i) => `<a href="/results/#${t.id}" title="${escAttr(t.title)}">result cells${hits.length > 1 ? ` ${i + 1}` : ""}</a>`).join(" ")}</span>`;
}

export type RenderedChapter = { chapter: ThesisChapter; html: string; headings: Heading[] };

export function renderChapter(slug: string): RenderedChapter | null {
  const chapter = getThesisChapters().find((c) => c.slug === slug);
  if (!chapter) return null;
  let md = fs.readFileSync(path.join(DIR, `${slug}.md`), "utf8");

  // footnote definitions
  const notes: { id: string; text: string }[] = [];
  md = md.replace(/^\[\^([\w-]+)\]:\s*(.+)$/gm, (_m, id: string, text: string) => { notes.push({ id, text }); return ""; });

  const holds: string[] = [];
  const hold = (html: string) => `MTPH${holds.push(html) - 1}MTPH`;
  // code blocks and spans stay as they are; math is rendered once; everything else gets references and escaping
  const parts = md.split(/(^```[\s\S]*?^```\s*$)/m);
  md = parts.map((seg, i) => {
    if (i % 2 === 1) return seg;
    const code: string[] = [];
    let s = seg.replace(/`[^`\n]+`/g, (m) => `MTCODE${code.push(m) - 1}MTCODE`);
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex: string) => hold(katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })));
    s = s.replace(/\$(?!\s)([^$\n]+?)(?<!\s)\$/g, (_m, tex: string) => hold(katex.renderToString(tex, { throwOnError: false })));
    s = s.replace(/</g, "&lt;");
    s = s.split("\n").map((line) => line.startsWith("#") ? line : line.replace(
      /(\*\*)?\b(Sections?|Tables?|Figures?|Listings?|Algorithms?|Appendix|Appendices|Chapters?) ((?:\d+|[A-G])(?:\.\d+)*)(?![\d])/g,
      (m, bold: string | undefined, kind: string, num: string) => {
        if (bold) return m;
        const href = refHref(kind, num, slug);
        return href ? `[${kind} ${num}](${href})` : m;
      })).join("\n");
    s = s.replace(/\[\^([\w-]+)\]/g, (_m, id: string) => {
      const n = notes.findIndex((x) => x.id === id) + 1;
      return n ? hold(`<sup class="fnref"><a href="#fn-${id}" id="fnref-${id}">${n}</a></sup>`) : _m;
    });
    return s.replace(/MTCODE(\d+)MTCODE/g, (_m, k: string) => code[Number(k)]);
  }).join("");

  const headings: Heading[] = [];
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens);
        const id = headingId(inner);
        if (depth >= 2 && depth <= 3) headings.push({ id, text: inner.replace(/<[^>]+>/g, ""), depth });
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${inner}</h${depth}>\n`;
      },
      paragraph({ tokens }: Tokens.Paragraph) {
        const inner = this.parser.parseInline(tokens);
        const cap = inner.match(/^<strong>(Table|Figure|Listing|Algorithm) ((?:\d+|[A-G])(?:\.\d+)+):<\/strong>/);
        if (cap) {
          const id = `${cap[1].toLowerCase()}-${cap[2].toLowerCase().replace(/\./g, "-")}`;
          return `<p class="caption" id="${id}">${inner}${resultsLinks(cap[1], cap[2])}</p>\n`;
        }
        if (/^<img [^>]*>$/.test(inner.trim())) return `<figure>${inner}</figure>\n`;
        return `<p>${inner}</p>\n`;
      },
      image({ href, text }: Tokens.Image) {
        return `<img src="${href}" alt="${escAttr(text)}" loading="lazy">`;
      },
      table(token: Tokens.Table) {
        const cell = (c: Tokens.TableCell, tag: "th" | "td") => `<${tag}${c.align ? ` style="text-align:${c.align}"` : ""}>${this.parser.parseInline(c.tokens)}</${tag}>`;
        return `<div class="table-wrap"><table><thead><tr>${token.header.map((c) => cell(c, "th")).join("")}</tr></thead><tbody>${
          token.rows.map((r) => `<tr>${r.map((c) => cell(c, "td")).join("")}</tr>`).join("")}</tbody></table></div>\n`;
      },
    },
  });
  let html = marked.parse(md, { async: false });
  html = glossarise(html);
  html = html.replace(/MTPH(\d+)MTPH/g, (_m, k: string) => holds[Number(k)]);
  if (notes.length) {
    html += `<section class="footnotes"><h2 id="notes">Notes</h2><ol>${notes.map((n) =>
      `<li id="fn-${n.id}">${marked.parseInline(n.text, { async: false })} <a href="#fnref-${n.id}" aria-label="back">↩</a></li>`).join("")}</ol></section>`;
  }
  return { chapter, html, headings };
}
