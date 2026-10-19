// Parity of the TypeScript engine with the thesis engine: every stored single-floor episode is replayed action by
// action; the logged action must be offered under the logged number, and the hero after each turn must match the log.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import type { EpisodeIndex } from "@/lib/data-types";
import { parseFloor, type FloorDef } from "@/lib/engine/floor";
import { startDifference } from "@/lib/engine/match";
import { GameState } from "@/lib/engine/state";
import type { RunLog } from "@/lib/types";

const DATA = path.join(__dirname, "..", "public", "data");
const floors = new Map<string, FloorDef>();
for (const f of fs.readdirSync(path.join(DATA, "floors")).filter((n) => n.endsWith(".txt"))) {
  const id = f.replace(/\.txt$/, "");
  floors.set(id, parseFloor(id, fs.readFileSync(path.join(DATA, "floors", f), "utf8")));
}
const episodes = (JSON.parse(fs.readFileSync(path.join(DATA, "episodes.json"), "utf8")) as EpisodeIndex).episodes
  .filter((e) => floors.has(e.floor));

function replayEpisode(id: string, floor: FloorDef): string | null {
  const log = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DATA, "episodes", `${id}.json.gz`))).toString("utf8")) as RunLog;
  const start = log.turns.find((t) => t.type === "start");
  const diff = start ? startDifference(start, floor) : "no start event";
  if (diff) return `EARLIER FLOOR VERSION: ${diff}`;
  const s = new GameState(floor);
  for (const ev of log.turns) {
    if (ev.type !== "turn") continue;
    const acts = s.actions();
    const a = acts.find((x) => x.label === ev.action);
    if (!a) return `turn ${ev.turn}: "${ev.action}" not offered; engine offers ${acts.map((x) => x.label).join(" | ")}`;
    if (typeof ev.action_id === "number" && a.id !== ev.action_id) return `turn ${ev.turn}: "${ev.action}" is action ${a.id}, log says ${ev.action_id}`;
    s.apply(a);
    const h = ev.hero;
    if (!h) continue;
    const got = [s.hero.hp, s.hero.atk, s.hero.def, s.hero.yellow, s.hero.blue, s.hero.red, s.hero.x, s.hero.y];
    const want = [h.hp, h.atk, h.def, h.keys?.yellow ?? 0, h.keys?.blue ?? 0, h.keys?.red ?? 0, h.x, h.y];
    if (got.join() !== want.join()) return `turn ${ev.turn} "${ev.action}": engine hero ${got.join("/")}, log ${want.join("/")}`;
  }
  return null;
}

describe("engine parity with the stored episodes", () => {
  it(`replays every stored single-floor episode exactly (${episodes.length} episodes)`, () => {
    const failures: string[] = [];
    const earlier: string[] = [];
    for (const e of episodes) {
      const err = replayEpisode(e.id, floors.get(e.floor)!);
      if (err?.startsWith("EARLIER FLOOR VERSION")) earlier.push(`${e.id}: ${err}`);
      else if (err) failures.push(`${e.id} (${e.floor}): ${err}`);
    }
    // only the hand-floor pilot of the night of 2026-09-28 ran on floor files that were redesigned afterwards
    expect(earlier.filter((x) => !(/^\d{8}_\d{6}_\d+_hand0\d/.test(x) && x.slice(0, 15) < "20260929_060000"))).toEqual([]);
    expect(earlier.length).toBeLessThanOrEqual(12);
    if (failures.length) {
      const kinds = new Map<string, number>();
      for (const f of failures) {
        const k = `${f.split(" (")[1]?.split(")")[0]}: ${/not offered|is action|engine hero/.exec(f)?.[0] ?? "other"}`;
        kinds.set(k, (kinds.get(k) ?? 0) + 1);
      }
      console.log(`${failures.slice(0, 6).join("\n")}\n${failures.length} of ${episodes.length} episodes differ: ${[...kinds].map(([k, n]) => `${k} ${n}`).join(", ")}`);
    }
    expect(failures.length).toBe(0);
  });
});
