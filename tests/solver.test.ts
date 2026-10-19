// The TypeScript solver must give the Java solver's answers: the exact optimum and the published solver's answer,
// with the same number of expanded states. By default only the simple floor runs (the other floors were checked once
// on 2026-10-19, all equal; the complex floor needs about 85 s and much memory): SOLVER_FLOORS=hand01,gen03 adds floors.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { FloorEntry } from "@/lib/data-types";
import { Graph, solve } from "@/lib/solver/solver";

const DIR = path.join(__dirname, "..", "public", "data", "floors");
const { floors } = JSON.parse(fs.readFileSync(path.join(DIR, "index.json"), "utf8")) as { floors: FloorEntry[] };
const wanted = new Set(["simple", ...(process.env.SOLVER_FLOORS ?? "").split(",").filter(Boolean)]);
const run = floors.filter((f) => wanted.has(f.id));

describe("solver parity with the Java solver", () => {
  for (const f of run) {
    it(`${f.id}: exact ${f.exact.solvable ? f.exact.hp : "unsolvable"}, published ${f.published.hp ?? "none"}`, () => {
      const text = fs.readFileSync(path.join(DIR, `${f.id}.txt`), "utf8");
      const exact = solve(new Graph(text), "exact");
      expect(exact.solvable).toBe(f.exact.solvable);
      if (f.exact.solvable) expect(exact.hp).toBe(f.exact.hp);
      expect(exact.states).toBe(f.exact.states);
      expect(exact.winningSets).toBe(f.exact.winningSets);
      const published = solve(new Graph(text), "published");
      expect(published.hp).toBe(f.published.hp);
      expect(published.states).toBe(f.published.states);
    });
  }
});
