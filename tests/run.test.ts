// The replay core must reproduce a stored episode exactly: the simple floor's winning episode of the re-run
// (Qwen3.5-397B, run 1), which ends at 2 HP after 36 turns, 17 of them model decisions.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { firstDifference, replay } from "@/lib/run";
import type { EpisodeIndex } from "@/lib/data-types";
import type { RunLog } from "@/lib/types";

const DATA = path.join(__dirname, "..", "public", "data");
const load = (id: string) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DATA, "episodes", `${id}.json.gz`))).toString("utf8")) as RunLog;
const ID = "20261003_105525_971488_simple_llm";
const log = load(ID);

describe("replay", () => {
  const run = replay(log.turns, log.result);

  it("ends where the log ends", () => {
    expect(run.turnCount).toBe(36);
    expect(run.decisions).toBe(17);
    expect(run.assisted).toBe(19);
    expect(run.overrides).toBe(0);
    expect(run.snapshots.at(-1)?.hero?.hp).toBe(2);
    expect(run.result?.success).toBe(true);
  });

  it("keeps the observation, reasoning and answer of each decision", () => {
    const decisions = run.cards.filter((c) => c.kind === "turn" && !c.event.forced);
    expect(decisions).toHaveLength(17);
    for (const c of decisions) {
      expect(c.observation).toContain("Available actions");
      expect(c.thinking?.length).toBeGreaterThan(100);
      expect(c.response).toMatch(/FINAL_CHOICE|\{/);
    }
    const first = decisions[0];
    expect(first.turn).toBe(2);
    expect(first.event.action).toContain("Black Slime at (6,4)");
  });

  it("accumulates cleared tiles per turn", () => {
    const s = run.snapshots.find((x) => x.turn === 2);
    expect(s?.removed.has("6,4")).toBe(true);
    expect(s?.removed.has("5,1")).toBe(true);
  });
});

// Compare mode: in the history-off cell the one loss leaves the winning line at turn 18 (Slime Lord instead of the Bat).
describe("firstDifference", () => {
  const index = JSON.parse(fs.readFileSync(path.join(DATA, "episodes.json"), "utf8")) as EpisodeIndex;
  const cell = index.episodes.filter((e) => e.cells.some((c) => c.label === "simple_qwen3.5-397b_basic_k1k2_hist0"));
  const won = cell.find((e) => e.success)!, lost = cell.find((e) => !e.success)!;

  it("finds turn 18 for a win and the loss of the same cell", () => {
    const a = load(won.id), b = load(lost.id);
    const ra = replay(a.turns, a.result), rb = replay(b.turns, b.result);
    const i = firstDifference(ra, rb)!;
    expect(ra.snapshots[i].turn).toBe(18);
    expect(ra.snapshots[i].action).toContain("Bat at (3,5)");
    expect(rb.snapshots[i].action).toContain("Slime Lord at (4,2)");
    expect(firstDifference(ra, ra)).toBeNull();
  });
});
