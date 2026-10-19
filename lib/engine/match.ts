// Does a stored episode start on this version of the floor? (The hand-designed floors were redesigned on
// 2026-09-29; the pilot episodes before that date ran on earlier versions.)
import type { FloorDef } from "./floor";
import { itemTable } from "./state";
import type { MapCell, RunEvent } from "../types";

const DOOR_LETTER: Record<number, string> = { 81: "Y", 82: "B", 83: "R" };

function floorCell(f: FloorDef, items: ReturnType<typeof itemTable>, t: number): string {
  if (t === 0) return ".";
  if (t === 1 || t === 2 || t === 3) return "#";
  if (t in DOOR_LETTER) return DOOR_LETTER[t];
  if (t === 87 || t === 88) return "S";
  const m = f.monsters[t];
  if (m) return `E:${m.name}:${m.hp}:${m.atk}:${m.def}`;
  const it = items[t];
  if (it) return `I:${it.name}`;
  return "?";
}

function logCell(c: MapCell | string): string {
  if (typeof c === "string") return c;
  if (c.t === "E") return `E:${c.name}:${c.hp}:${c.atk}:${c.def}`;
  if (c.t === "I") return `I:${c.name}`;
  return c.t;
}

/** null when the episode's start map and hero equal the floor file, else the first difference. */
export function startDifference(start: RunEvent, f: FloorDef): string | null {
  const map = start.map;
  if (!map) return "no start map";
  if (map.width !== f.width || map.height !== f.height) return `size ${map.width}×${map.height}`;
  const items = itemTable(f);
  for (let y = 0; y < f.height; y++)
    for (let x = 0; x < f.width; x++) {
      const a = logCell(map.grid[y][x]), b = floorCell(f, items, f.grid[y][x]);
      if (a !== b) return `(${x},${y}): log ${a}, floor ${b}`;
    }
  const h = start.hero;
  if (h) {
    const got = [h.hp, h.atk, h.def, h.keys?.yellow ?? 0, h.keys?.blue ?? 0, h.keys?.red ?? 0, h.x, h.y].join("/");
    const want = [f.hero.hp, f.hero.atk, f.hero.def, f.hero.yellow, f.hero.blue, f.hero.red, f.hero.x, f.hero.y].join("/");
    if (got !== want) return `hero ${got}, floor ${want}`;
  }
  return null;
}
