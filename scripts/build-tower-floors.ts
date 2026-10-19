// Tower floors for /floors: maps, monsters and items from the game copy (public/game/24), English names from en.js,
// and each thesis tower run's first arrival on every floor from the stored logs. Writes public/data/tower/floors.json.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";
import type { MapCell } from "../lib/types";

type Obj = Record<string, unknown>;
const ROOT = path.resolve(import.meta.dirname, "..");
const GAME = path.join(ROOT, "public/game/24");
const DATA = path.join(ROOT, "public/data");
const FLOOR_IDS = [...Array.from({ length: 23 }, (_, i) => `MT${i}`), "MT23w", "MT23e", "MT23s"];

function scriptVars(file: string): Obj {
  const ctx: Obj = { main: { floors: {} } };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), ctx);
  return ctx;
}
const varOf = (file: string, prefix: string) => {
  const ctx = scriptVars(file);
  const k = Object.keys(ctx).find((x) => x.startsWith(prefix));
  if (!k) throw new Error(`${prefix}* not found in ${file}`);
  return ctx[k] as Record<string, Obj>;
};

/** Object literal assigned to `var <name> =` in en.js, read with string-aware brace matching. */
function enTable<T>(src: string, name: string): T {
  const start = src.indexOf("{", src.indexOf(`var ${name} =`));
  let depth = 0, quote = "";
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (quote) { if (ch === "\\") i++; else if (ch === quote) quote = ""; continue; }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return vm.runInNewContext(`(${src.slice(start, i + 1)})`) as T;
  }
  throw new Error(`en.js table ${name} not closed`);
}

const maps = varOf(path.join(GAME, "project/maps.js"), "maps_") as Record<string, { cls: string; id: string }>;
const enemys = varOf(path.join(GAME, "project/enemys.js"), "enemys_") as Record<string, { name: string; hp: number; atk: number; def: number; money: number; exp: number; special: number | number[] }>;
const data = varOf(path.join(GAME, "project/data.js"), "data_") as { firstData: { hero: { hp: number; atk: number; def: number; loc: { x: number; y: number } } } };
const en = fs.readFileSync(path.join(GAME, "en.js"), "utf8");
const EN_ITEMS = enTable<Record<string, string[]>>(en, "ITEMS");
const EN_ENEMIES = enTable<Record<string, string>>(en, "ENEMIES");

const DOORS: Record<string, "Y" | "B" | "R"> = { yellowDoor: "Y", blueDoor: "B", redDoor: "R" };
const SPECIAL_TILES: Record<string, string> = {
  ice: "Ice (opens without a key)", steelDoor: "Iron door (opens by an event)", specialDoor: "Door (opens by an event)", greenDoor: "Green door",
};
const NPCS: Record<string, string> = {
  man: "Old man", trader: "Merchant", thief: "Thief", fairy: "Fairy", wizard: "Wizard", recluse: "Recluse", king: "King",
  youngMan: "Young man", sign: "Sign", expShop: "Experience shop", moneyShop: "Gold shop", princess: "Princess",
  greenMan: "Old man", blueTrader: "Merchant",
};
const words = (id: string) => id.replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
const itemName = (id: string) => EN_ITEMS[id]?.[0] ?? words(id);
const itemEffect = (id: string) => { const t = EN_ITEMS[id]?.[1]; return t && !t.includes("${") ? t : ""; };

const tiles: Record<number, MapCell> = {};
function cellFor(n: number): MapCell {
  if (n === 0) return { t: ".", id: 0 };
  const m = maps[String(n)];
  if (!m) return { t: "?", id: n };
  if (m.cls === "enemys" || m.cls === "enemy48") {
    const e = enemys[m.id];
    const specials = (Array.isArray(e.special) ? e.special : [e.special]).filter((s) => s);
    return { t: "E", id: n, name: EN_ENEMIES[m.id] ?? words(m.id), hp: e.hp, atk: e.atk, def: e.def, money: e.money, specials };
  }
  if (m.cls === "items") return { t: "I", id: n, name: itemName(m.id) };
  if (DOORS[m.id]) return { t: DOORS[m.id], id: n };
  if (m.id === "upFloor" || m.id === "downFloor") return { t: "S", id: n, dir: m.id };
  if (SPECIAL_TILES[m.id]) return { t: "N", id: n, name: SPECIAL_TILES[m.id] };
  if (m.cls === "npcs" || m.cls === "npc48") return { t: "N", id: n, name: NPCS[m.id] ?? words(m.id) };
  return { t: "#", id: n };
}

type FloorOut = {
  id: string; width: number; height: number; grid: number[][];
  monsters: { key: string; name: string; hp: number; atk: number; def: number; money: number; exp: number; specials: number[]; count: number }[];
  items: { key: string; name: string; effect: string; count: number }[];
  doors: { yellow: number; blue: number; red: number }; hero: { x: number; y: number; hp: number; atk: number; def: number } | null;
};
const floors: FloorOut[] = FLOOR_IDS.map((id) => {
  const f = (scriptVars(path.join(GAME, `project/floors/${id}.js`)).main as { floors: Record<string, { width: number; height: number; map: number[][] }> }).floors[id];
  const monsters = new Map<string, FloorOut["monsters"][number]>();
  const its = new Map<string, FloorOut["items"][number]>();
  const doors = { yellow: 0, blue: 0, red: 0 };
  for (const row of f.map) for (const n of row) {
    tiles[n] ??= cellFor(n);
    const m = maps[String(n)];
    if (!m) continue;
    if (m.cls === "enemys" || m.cls === "enemy48") {
      const c = tiles[n] as Extract<MapCell, { t: "E" }>;
      const e = enemys[m.id];
      const prev = monsters.get(m.id);
      if (prev) prev.count++;
      else monsters.set(m.id, { key: m.id, name: c.name, hp: c.hp, atk: c.atk, def: c.def, money: e.money, exp: e.exp, specials: c.specials ?? [], count: 1 });
    } else if (m.cls === "items") {
      const prev = its.get(m.id);
      if (prev) prev.count++;
      else its.set(m.id, { key: m.id, name: itemName(m.id), effect: itemEffect(m.id), count: 1 });
    } else if (DOORS[m.id]) doors[({ Y: "yellow", B: "blue", R: "red" } as const)[DOORS[m.id]]]++;
  }
  return {
    id, width: f.width, height: f.height, grid: f.map, doors,
    monsters: [...monsters.values()].sort((a, b) => a.hp * a.atk - b.hp * b.atk),
    items: [...its.values()],
    hero: id === "MT0" ? (({ hp, atk, def, loc }) => ({ x: loc.x, y: loc.y, hp, atk, def }))(data.firstData.hero) : null,
  };
});

// First arrival of every thesis tower run on each floor: the turn and the hero just before acting there.
const index = JSON.parse(fs.readFileSync(path.join(DATA, "index.json"), "utf8")) as { cells: { label: string; thesis: boolean }[] };
const cited = new Set(index.cells.filter((c) => c.thesis).map((c) => c.label));
const episodes = (JSON.parse(fs.readFileSync(path.join(DATA, "episodes.json"), "utf8")) as {
  episodes: { id: string; tower: boolean; model: string | null; maxFloor?: string | null; success: boolean | null; cells: { label: string }[] }[];
}).episodes.filter((e) => e.tower && e.model && e.cells.some((c) => cited.has(c.label)));
const runs = episodes.map((e) => {
  const log = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DATA, "episodes", `${e.id}.json.gz`))).toString("utf8")) as {
    turns: { type: string; turn?: number; floor_id?: string; hero?: { hp: number; atk: number; def: number } }[];
  };
  const arrivals: Record<string, { turn: number; hp: number; atk: number; def: number }> = {};
  let prev: { hp: number; atk: number; def: number } | undefined;
  for (const t of log.turns) {
    if (!t.floor_id) continue;
    if (t.type === "floor_change") {
      if (!arrivals[t.floor_id] && t.hero) arrivals[t.floor_id] = { turn: t.turn ?? 0, hp: t.hero.hp, atk: t.hero.atk, def: t.hero.def };
      continue;
    }
    if (t.type !== "turn") continue;
    const h = prev ?? t.hero;
    if (!arrivals[t.floor_id] && h) arrivals[t.floor_id] = { turn: t.turn ?? 0, hp: h.hp, atk: h.atk, def: h.def };
    prev = t.hero ?? prev;
  }
  // a resumed run's log starts with the history of the run it resumes from (to MT18): count only its own floors
  if (e.cells.some((c) => c.label.includes("_resume"))) {
    for (const f of Object.keys(arrivals)) if (FLOOR_IDS.indexOf(f) < FLOOR_IDS.indexOf("MT18")) delete arrivals[f];
  }
  return { episode: e.id, cell: e.cells.find((c) => cited.has(c.label))!.label, model: e.model, success: e.success, maxFloor: e.maxFloor ?? null, arrivals };
});

fs.mkdirSync(path.join(DATA, "tower"), { recursive: true });
fs.writeFileSync(path.join(DATA, "tower", "floors.json"), JSON.stringify({ tiles, floors, runs }));
console.log(`tower floors: ${floors.length} floors, ${Object.keys(tiles).length} tile kinds, ${runs.length} thesis tower runs`);
