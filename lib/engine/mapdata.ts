// Engine state → the map format of the replay viewer (lib/types MapData), so the same map component draws both.
import type { FloorDef } from "./floor";
import { itemTable, type GameState } from "./state";
import type { MapCell, MapData } from "../types";

const DOOR_T: Record<number, "Y" | "B" | "R"> = { 81: "Y", 82: "B", 83: "R" };

export function floorMapData(f: FloorDef): MapData {
  const items = itemTable(f);
  const grid: MapCell[][] = f.grid.map((row) => row.map((t): MapCell => {
    if (t === 0) return { t: ".", id: 0 };
    if (t === 1 || t === 2 || t === 3) return { t: "#", id: t };
    if (t in DOOR_T) return { t: DOOR_T[t], id: t };
    if (t === 87 || t === 88) return { t: "S", id: t, dir: t === 87 ? "upFloor" : "downFloor" };
    const m = f.monsters[t];
    if (m) return { t: "E", id: t, name: m.name, hp: m.hp, atk: m.atk, def: m.def, money: m.money, specials: m.special ? [m.special] : [] };
    const it = items[t];
    if (it) return { t: "I", id: t, name: it.name };
    return { t: "?", id: t };
  }));
  return { floor_id: f.id, width: f.width, height: f.height, grid, hero: { ...f.hero, keys: { yellow: f.hero.yellow, blue: f.hero.blue, red: f.hero.red } } };
}

/** Hero in the viewer's format. */
export function heroOf(s: GameState) {
  const h = s.hero;
  return { hp: h.hp, atk: h.atk, def: h.def, mdef: h.mdef, money: h.money, x: h.x, y: h.y, keys: { yellow: h.yellow, blue: h.blue, red: h.red } };
}
