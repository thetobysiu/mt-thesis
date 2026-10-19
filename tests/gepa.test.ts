// The prompt-optimisation runs are normalised from two file formats; the facts below are stated in Section 6.5.
import { describe, expect, it } from "vitest";
import { wordDiff } from "@/lib/diff";
import { GEPA_RUNS, getConfirmation, getGepaRun } from "@/lib/gepa";

describe("prompt-optimisation runs", () => {
  it("loads every thesis run", () => {
    for (const m of GEPA_RUNS) expect(getGepaRun(m.label), m.label).not.toBeNull();
  });

  it("returns the seed where Table 6.6 says so", () => {
    expect(getGepaRun("gs_llama8b_full")!.bestIndex).toBe(0);
    expect(getGepaRun("gs_dsv4flash_bare")!.bestIndex).toBe(0);
    expect(getGepaRun("gs2_dsv4flash_bare")!.bestIndex).toBeGreaterThan(0);
  });

  it("reproduces the held-out cells of Table 6.6", () => {
    const r = getGepaRun("gs_llama8b_full")!;
    const t = (arm: string) => r.heldOut.find((h) => h.split === "test" && h.arm === arm)!;
    expect([t("core").success, t("gepa").success, t("basic").success]).toEqual([8, 10, 9]);
  });

  it("normalises the Pareto population (Table 6.8)", () => {
    const r = getGepaRun("gs5_pareto_dsthink_bare")!;
    expect(r.method).toBe("Pareto loop");
    expect(r.candidates).toHaveLength(8);
    expect(r.candidates.at(-1)!.kind).toBe("merge");
    expect(new Set(r.candidates.map((c) => c.floorScores.simple))).toEqual(new Set([0.325]));
    const test = r.heldOut.filter((h) => h.split === "test");
    expect(test.map((h) => `${h.arm}:${h.success}/${h.n}`).sort()).toEqual(["core:32/39", "gepa:24/39"]);
  });

  it("matches the paired confirmation", () => {
    const c = getConfirmation()!;
    expect([c.gepa.success, c.core.success, c.gepa.n]).toEqual([30, 24, 39]);
  });

  it("diffs words and keeps the text", () => {
    const d = wordDiff("keep the stats first", "keep all stats first now");
    expect(d.filter((p) => p.kind !== "del").map((p) => p.text).join("")).toBe("keep all stats first now");
    expect(d.filter((p) => p.kind !== "add").map((p) => p.text).join("")).toBe("keep the stats first");
  });
});
