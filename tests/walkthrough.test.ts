// The walkthrough timeline is data: chapters must tile the 3 minutes, captions must be ordered and readable at speaking
// pace, and the facts the scenes draw from the stored results must still be there.
import { describe, expect, it } from "vitest";
import { CHAPTERS, CUES, DURATION, TRIES, captionsVtt, chapterAt, cueAt, voiceoverText } from "@/lib/walkthrough";
import { getSolution } from "@/lib/data";
import { presentData } from "@/lib/present-data";

describe("walkthrough timeline", () => {
  it("lasts three minutes and its chapters tile it without gaps", () => {
    expect(DURATION).toBe(180);
    expect(CHAPTERS[0].start).toBe(0);
    expect(CHAPTERS.at(-1)!.end).toBe(DURATION);
    for (let i = 1; i < CHAPTERS.length; i++) expect(CHAPTERS[i].start).toBe(CHAPTERS[i - 1].end);
    expect(new Set(CHAPTERS.map((c) => c.id)).size).toBe(CHAPTERS.length);
    expect(chapterAt(DURATION).id).toBe(CHAPTERS.at(-1)!.id);
  });

  it("has ordered, non-overlapping captions at a speakable pace", () => {
    for (let i = 0; i < CUES.length; i++) {
      const c = CUES[i];
      expect(c.end).toBeGreaterThan(c.start);
      expect(c.end).toBeLessThanOrEqual(DURATION);
      if (i) expect(c.start).toBeGreaterThanOrEqual(CUES[i - 1].end);
      const words = c.text.split(/\s+/).length;
      expect(words / (c.end - c.start)).toBeLessThan(4);   // ≤ 240 words per minute in any cue
      const ch = chapterAt(c.start);
      expect(c.end).toBeLessThanOrEqual(ch.end + 0.01);   // a caption never runs into the next chapter
    }
    const words = CUES.reduce((n, c) => n + c.text.split(/\s+/).length, 0);
    expect(words).toBeGreaterThan(350);
    expect(words).toBeLessThan(500);
    expect(cueAt(0.5)?.text).toBe(CUES[0].text);
  });

  it("places every try point inside the film", () => {
    for (const p of TRIES) { expect(p.at).toBeGreaterThanOrEqual(0); expect(p.until).toBeLessThanOrEqual(DURATION); expect(p.until).toBeGreaterThan(p.at); }
    expect(new Set(TRIES.map((p) => p.id)).size).toBe(TRIES.length);
  });

  it("writes WebVTT and the voice-over script from the same cues", () => {
    const vtt = captionsVtt();
    expect(vtt.startsWith("WEBVTT\n")).toBe(true);
    expect(vtt.match(/ --> /g)?.length).toBe(CUES.length);
    const vo = voiceoverText();
    for (const c of CUES) expect(vo).toContain(c.text);
  });
});

describe("walkthrough facts", () => {
  it("the simple floor's optimal route has seventeen actions (Table 4.4), as the first caption says", () => {
    const route = getSolution("simple")!.exact.route;
    const actions = route.filter((s) => s.kind === "decision").reduce((n, s) => n + s.tiles.length, 0);
    expect(actions).toBe(17);
    expect(CUES[0].text).toContain("seventeen");
    expect(getSolution("simple")!.exact.hp).toBe(13);
  });

  it("finds every stored decision the scenes and slides open", () => {
    const d = presentData();
    for (const [k, p] of Object.entries(d.picks)) expect(p, k).not.toBeNull();
    expect(d.flip?.actions.map((a) => a.key)).toEqual(["1,9", "7,0", "7,5"]);
    expect(d.flip?.choseOne).toBe("1,9");
    expect(d.flip?.choseTwo).toBe("7,0");
    expect(d.complex.optimum).toBe(68);
    expect(d.tower.map((r) => r.floor)).toEqual([8, 7, 8, 18, 17, 16, 8, 21]);
  });
});
