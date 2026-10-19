// The tour and the journey point at stored results; these checks keep every reference resolvable.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getCell } from "@/lib/data";
import { JOURNEY } from "@/lib/journey";
import { TOUR } from "@/lib/tour";
import { cellOverrides, findDecision, winLossDivergence } from "@/lib/tour-data";

describe("tour", () => {
  it("has eleven chapters with unique slugs", () => {
    expect(TOUR).toHaveLength(11);
    expect(new Set(TOUR.map((c) => c.slug)).size).toBe(11);
  });

  it("refers only to existing result cells", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "components", "tour", "Chapters.tsx"), "utf8");
    const labels = [...src.matchAll(/"((?:simple|complex|hand0\d|tower)_[\w.-]+)"/g)].map((m) => m[1]).filter((l) => !l.endsWith("_"));
    expect(labels.length).toBeGreaterThan(30);
    for (const l of labels) expect(getCell(l), l).toBeDefined();
  });

  it("finds the turn-9 decisions before and after the order lines", () => {
    const before = findDecision("simple_qwen3.5-397b_basic_mechanical_override", 9, { x: 1, y: 10 });
    const after = findDecision("simple_qwen3.5-397b_basic_order_aware", 9, { x: 1, y: 10 });
    expect(before?.event.action).toContain("Slime Lord at (1,9)");
    expect(after?.event.action).toContain("yellow door at (7,0)");
  });

  it("lists the strategic overrides of row 1 of Table 6.5", () => {
    const t9 = cellOverrides("simple_qwen3.5-397b_legacy_strategic_control").filter((o) => o.turn === 9);
    expect(t9.length).toBeGreaterThanOrEqual(2);
    expect(t9.every((o) => o.chose.includes("Slime Lord at (1,9)") && o.executed.includes("(7,0)"))).toBe(true);
    expect(t9.filter((o) => o.won)).toHaveLength(2);
  });

  it("locates the turn-18 departure of the history-off cell with state values", () => {
    const d = winLossDivergence("simple_qwen3.5-397b_basic_k1k2_hist0")!;
    expect(d.turn).toBe(18);
    expect(d.afterA).toBe(2);
    expect(d.afterB).toBeNull();
  });
});

describe("journey", () => {
  it("links only existing cells", () => {
    for (const p of JOURNEY) for (const m of p.items) for (const l of m.links ?? []) if (l.cell) expect(getCell(l.cell), l.cell).toBeDefined();
  });
});
