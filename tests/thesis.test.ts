// The thesis pages: every chapter renders, and every cross-reference points at an anchor that exists.
import { describe, expect, it } from "vitest";
import { getGlossary, getThesisChapters, renderChapter } from "@/lib/thesis";

describe("thesis", () => {
  const rendered = getThesisChapters().map((c) => renderChapter(c.slug)!);
  const ids = new Map(rendered.map((r) => [r.chapter.slug, new Set([...r.html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]))]));

  it("renders all eighteen parts", () => {
    expect(rendered).toHaveLength(18);
    for (const r of rendered) expect(r.html.length, r.chapter.slug).toBeGreaterThan(500);
  });

  it("renders the math and leaves no placeholder", () => {
    const ch4 = rendered.find((r) => r.chapter.slug === "task-and-environment")!;
    expect(ch4.html).toContain("katex");
    for (const r of rendered) expect(r.html, r.chapter.slug).not.toMatch(/MTPH\d+MTPH|MTCODE\d+MTCODE/);
  });

  it("resolves every cross-reference", () => {
    const broken: string[] = [];
    for (const r of rendered) {
      for (const m of r.html.matchAll(/href="(\/thesis\/([\w-]+)\/)?#([\w-]+)"/g)) {
        const target = m[2] ?? r.chapter.slug;
        if (!ids.get(target)?.has(m[3])) broken.push(`${r.chapter.slug} → ${target}#${m[3]}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("parses the glossary", () => {
    const g = getGlossary();
    expect(g.length).toBeGreaterThan(40);
    expect(g.find((t) => t.term === "Exact solver")?.definition).toContain("68 HP");
  });
});
