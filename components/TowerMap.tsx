"use client";
// Tower floor maps from public/data/tower/floors.json: a card thumbnail, and the floor page's map with a choice of
// whose stats the monster costs are computed at.
import { useMemo, useState } from "react";
import { FloorMap, MapLegend } from "./FloorMap";
import type { TowerArrival, TowerFloor } from "@/lib/data-types";
import type { Hero, MapCell, MapData } from "@/lib/types";

type Tiles = Record<string, MapCell>;
type Grid = Pick<TowerFloor, "id" | "width" | "height" | "grid">;

const toMap = (f: Grid, tiles: Tiles): MapData =>
  ({ floor_id: f.id, width: f.width, height: f.height, grid: f.grid.map((row) => row.map((n) => tiles[n] ?? { t: "?", id: n })) });

export function TowerThumb({ floor, tiles, cell = 9 }: { floor: Grid; tiles: Tiles; cell?: number }) {
  const map = useMemo(() => toMap(floor, tiles), [floor, tiles]);
  return <FloorMap map={map} hero={null} cell={cell} skin="game" enemyMetric="hp" />;
}

export type StatsOption = { label: string; stats: TowerArrival };

export function TowerFloorMap({ floor, tiles, hero, options }:
  { floor: Grid; tiles: Tiles; hero: TowerFloor["hero"]; options: StatsOption[] }) {
  const map = useMemo(() => toMap(floor, tiles), [floor, tiles]);
  const [pick, setPick] = useState(hero ? "start" : options.length ? "0" : "hp");
  const chosen = pick === "hp" ? null : options[Number(pick)]?.stats ?? null;
  const stats: Hero | null = chosen ? { hp: chosen.hp, atk: chosen.atk, def: chosen.def, x: -1, y: -1 } : null;
  const start: Hero | null = hero && pick === "start" ? { ...hero } : null;
  return (
    <div className="flex flex-col gap-2 h-full">
      <label className="flex flex-col gap-1 text-[13px] min-w-0">
        <span className="muted">Number on each monster: the HP it costs at</span>
        <select className="input w-full min-w-0" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="stats for monster costs">
          {hero && <option value="start">the game&apos;s start (HP {hero.hp}, ATK {hero.atk}, DEF {hero.def})</option>}
          {options.map((o, i) => <option key={i} value={String(i)}>{o.label}</option>)}
          <option value="hp">(show the monster&apos;s own HP instead)</option>
        </select>
      </label>
      <div className="h-[clamp(420px,70vh,720px)] shrink-0">
        <FloorMap map={map} hero={start} stats={stats} fit maxCell={48} skin="game" enemyMetric={pick === "hp" ? "hp" : "dmg"} />
      </div>
      <MapLegend enemyMetric={pick === "hp" ? "hp" : "dmg"} />
    </div>
  );
}
