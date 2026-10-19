// Single-floor game state: legal actions, their effects and the engine's assists.
// Port of mota/game/state.py, pathfinder.py and damage.py as used on the thesis floors; tests/engine.test.ts replays
// every stored single-floor episode through it and requires the logged hero after each turn.
import type { FloorDef, HeroState, MonsterDef } from "./floor";

export type DoorColour = "yellow" | "blue" | "red" | "ice";
export type ActionType = "fight" | "collect" | "door" | "stairs";
export type Pos = [number, number];

export type Action = {
  id: number; type: ActionType; x: number; y: number; name: string; label: string; path: Pos[];
  damage?: number; hpAfter?: number; canWin?: boolean; monster?: MonsterDef;   // fights
  itemScore?: number; potion?: boolean;                                       // items
  door?: DoorColour;                                                          // doors
};

type ItemDef = { name: string; score: number; potion: boolean; apply: (h: HeroState) => void };

const WALLS = new Set([1, 2, 3]);
const TERRAIN = new Set([7, 8, 9, 10]);
const STAIRS: Record<number, string> = { 87: "upFloor", 88: "downFloor" };
const DOORS: Record<number, DoorColour> = { 6: "ice", 81: "yellow", 82: "blue", 83: "red" };
const NPCS = new Set([121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132]);
const DIRS: Pos[] = [[0, -1], [0, 1], [-1, 0], [1, 0]];  // up, down, left, right: the engine's search order
export const BOSS_TILE = 299;

export function itemTable(f: FloorDef): Record<number, ItemDef> {
  const b = f.bonuses;
  const item = (name: string, score: number, apply: (h: HeroState) => void, potion = false): ItemDef => ({ name, score, potion, apply });
  return {
    21: item("Yellow Key", 80, (h) => { h.yellow += 1; }),
    22: item("Blue Key", 85, (h) => { h.blue += 1; }),
    23: item("Red Key", 90, (h) => { h.red += 1; }),
    27: item(`Red Gem (+${b.redGem} ATK)`, 90, (h) => { h.atk += b.redGem; }),
    28: item(`Blue Gem (+${b.blueGem} DEF)`, 90, (h) => { h.def += b.blueGem; }),
    29: item(`Green Gem (+${b.greenGem} MDEF)`, 85, (h) => { h.mdef += b.greenGem; }),
    31: item(`Red Potion (+${b.redPotion} HP)`, 60, (h) => { h.hp += b.redPotion; }, true),
    32: item(`Blue Potion (+${b.bluePotion} HP)`, 70, (h) => { h.hp += b.bluePotion; }, true),
    33: item(`Green Potion (+${b.greenPotion} HP)`, 55, (h) => { h.hp += b.greenPotion; }, true),
    34: item(`Yellow Potion (+${b.yellowPotion} HP)`, 65, (h) => { h.hp += b.yellowPotion; }, true),
    35: item(`Iron Sword (+${b.sword} ATK)`, 95, (h) => { h.atk += b.sword; }),
    36: item(`Iron Shield (+${b.shield} DEF)`, 95, (h) => { h.def += b.shield; }),
  };
}

/** Exact fight outcome (damage.py): damage taken, or null when the hero cannot hurt the monster. */
export function fightDamage(h: HeroState, m: MonsterDef): number | null {
  const sp = m.special;
  let mAtk = m.atk, mDef = m.def;
  if (sp === 10) { mAtk = h.atk; mDef = h.def; }
  if (sp === 3 && mDef < h.atk - 1) mDef = h.atk - 1;
  const per = h.atk - mDef;
  if (per <= 0) return null;
  const turns = Math.ceil(m.hp / per);
  let hit = sp === 2 ? mAtk : Math.max(0, mAtk - h.def);
  if (sp === 4) hit *= 2; else if (sp === 5) hit *= 3; else if (sp === 6) hit *= 4;
  let init = sp === 1 ? hit : 0;
  if (sp === 7) init += Math.floor(0.9 * h.def);
  if (sp === 9) init += 3 * h.mdef;
  const counter = sp === 8 ? Math.floor(0.1 * h.atk) : 0;
  const total = init + hit * (turns - 1) + counter * (turns - 1);
  return Math.max(0, total - h.mdef);
}

export const posKey = (x: number, y: number) => `${x},${y}`;

export class GameState {
  readonly floor: FloorDef;
  readonly items: Record<number, ItemDef>;
  hero: HeroState;
  removed: Set<string>;
  turn = 0;
  goalReached = false;
  failed = false;

  constructor(floor: FloorDef, items?: Record<number, ItemDef>) {
    this.floor = floor;
    this.items = items ?? itemTable(floor);
    this.hero = { ...floor.hero };
    this.removed = new Set();
  }

  clone(): GameState {
    const s = new GameState(this.floor, this.items);
    s.hero = { ...this.hero };
    s.removed = new Set(this.removed);
    s.turn = this.turn;
    s.goalReached = this.goalReached;
    s.failed = this.failed;
    return s;
  }

  tile(x: number, y: number): number { return this.floor.grid[y][x]; }
  isEnemy(t: number): boolean { return t in this.floor.monsters; }
  isItem(t: number): boolean { return t in this.items; }
  private inside(x: number, y: number) { return x >= 0 && y >= 0 && x < this.floor.width && y < this.floor.height; }
  private hasKey(c: DoorColour) { return c === "ice" || this.hero[c] > 0; }

  /** pathfinder.find_reachable with stop_at_doors: entities next to the walkable region, with their search path. */
  private reachable(): Map<string, { x: number; y: number; kind: "enemy" | "item" | "door" | "stairs" | "npc"; tile: number; path: Pos[]; accessible: boolean }> {
    const start = posKey(this.hero.x, this.hero.y);
    const visited = new Set([start]);
    const parent = new Map<string, Pos>();
    const out = new Map<string, { x: number; y: number; kind: "enemy" | "item" | "door" | "stairs" | "npc"; tile: number; path: Pos[]; accessible: boolean }>();
    const queue: Pos[] = [[this.hero.x, this.hero.y]];
    const path = (x: number, y: number): Pos[] => {
      const p: Pos[] = [[x, y]];
      let k = posKey(x, y);
      while (k !== start) {
        const prev = parent.get(k);
        if (!prev) return [];
        p.push(prev);
        k = posKey(prev[0], prev[1]);
      }
      return p.reverse().slice(1);
    };
    for (let qi = 0; qi < queue.length; qi++) {
      const [x, y] = queue[qi];
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!this.inside(nx, ny)) continue;
        const k = posKey(nx, ny);
        if (visited.has(k)) continue;
        visited.add(k);
        parent.set(k, [x, y]);
        if (this.removed.has(k)) { queue.push([nx, ny]); continue; }
        const t = this.tile(nx, ny);
        if (WALLS.has(t)) continue;
        if (t === 0 || TERRAIN.has(t)) { queue.push([nx, ny]); continue; }
        if (t in STAIRS) { out.set(k, { x: nx, y: ny, kind: "stairs", tile: t, path: path(nx, ny), accessible: true }); queue.push([nx, ny]); continue; }
        if (this.isItem(t)) { out.set(k, { x: nx, y: ny, kind: "item", tile: t, path: path(nx, ny), accessible: true }); queue.push([nx, ny]); continue; }
        if (t in DOORS) { out.set(k, { x: nx, y: ny, kind: "door", tile: t, path: path(nx, ny), accessible: this.hasKey(DOORS[t]) }); continue; }
        if (this.isEnemy(t)) { out.set(k, { x: nx, y: ny, kind: "enemy", tile: t, path: path(nx, ny), accessible: true }); continue; }
        if (NPCS.has(t)) { out.set(k, { x: nx, y: ny, kind: "npc", tile: t, path: path(nx, ny), accessible: true }); continue; }
      }
    }
    return out;
  }

  /** state._find_path_to_target: shortest path that does not pick up other items on the way, or null. */
  private safePath(tx: number, ty: number): Pos[] | null {
    const start = posKey(this.hero.x, this.hero.y), target = posKey(tx, ty);
    if (start === target) return [];
    const visited = new Set([start]);
    const parent = new Map<string, Pos>();
    const queue: Pos[] = [[this.hero.x, this.hero.y]];
    for (let qi = 0; qi < queue.length; qi++) {
      const [cx, cy] = queue[qi];
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (!this.inside(nx, ny)) continue;
        const k = posKey(nx, ny);
        if (visited.has(k)) continue;
        if (k !== target && !this.removed.has(k)) {
          const t = this.tile(nx, ny);
          if (!(t === 0 || TERRAIN.has(t) || t in STAIRS)) continue;
        }
        visited.add(k);
        parent.set(k, [cx, cy]);
        if (k === target) {
          const p: Pos[] = [[nx, ny]];
          let cur = k;
          while (cur !== start) {
            const prev = parent.get(cur)!;
            p.push(prev);
            cur = posKey(prev[0], prev[1]);
          }
          return p.reverse().slice(1);
        }
        queue.push([nx, ny]);
      }
    }
    return null;
  }

  private crossesEntity(path: Pos[], tx: number, ty: number): boolean {
    for (const [x, y] of path) {
      if (x === tx && y === ty) break;
      if (this.removed.has(posKey(x, y))) continue;
      const t = this.tile(x, y);
      if (this.isItem(t) || this.isEnemy(t)) return true;
    }
    return false;
  }

  /** The legal actions, numbered as the engine numbers them (sorted by x, then y). */
  actions(): Action[] {
    const found = [...this.reachable().values()].filter((e) => e.accessible).sort((a, b) => a.x - b.x || a.y - b.y);
    const out: Action[] = [];
    for (const e of found) {
      let path = e.path;
      const safe = this.safePath(e.x, e.y);
      if (safe) path = safe;
      else if (this.crossesEntity(path, e.x, e.y)) continue;
      const base = { id: out.length + 1, x: e.x, y: e.y, path };
      if (e.kind === "enemy") {
        const m = this.floor.monsters[e.tile];
        const d = fightDamage(this.hero, m);
        const damage = d ?? 999999999;
        const hpAfter = d == null ? -1 : this.hero.hp - d;
        out.push({ ...base, type: "fight", name: m.name, monster: m, damage, hpAfter, canWin: hpAfter > 0,
                   label: `Fight ${m.name} at (${e.x},${e.y}) dmg=${damage}` });
      } else if (e.kind === "item") {
        const it = this.items[e.tile];
        out.push({ ...base, type: "collect", name: it.name, itemScore: it.score, potion: it.potion, label: `Collect ${it.name} at (${e.x},${e.y})` });
      } else if (e.kind === "door") {
        const c = DOORS[e.tile];
        out.push({ ...base, type: "door", name: `${c[0].toUpperCase()}${c.slice(1)} Door`, door: c, label: `Open ${c} door at (${e.x},${e.y})` });
      } else if (e.kind === "stairs" && STAIRS[e.tile] === "upFloor") {
        out.push({ ...base, type: "stairs", name: "upFloor", label: `Use stairs at (${e.x},${e.y})` });
      }
    }
    return out;
  }

  private collectAt(x: number, y: number): boolean {
    const k = posKey(x, y);
    if (this.removed.has(k)) return false;
    const it = this.items[this.tile(x, y)];
    if (!it) return false;
    it.apply(this.hero);
    this.removed.add(k);
    return true;
  }

  /** Apply an action: walk its path (picking up items on it), then fight, collect, open or climb. */
  apply(a: Action): { pickups: Pos[] } {
    this.turn += 1;
    const pickups: Pos[] = [];
    for (const [x, y] of a.path) {
      this.hero.x = x; this.hero.y = y;
      if (this.collectAt(x, y)) pickups.push([x, y]);
    }
    if (a.type === "fight") {
      const m = this.floor.monsters[this.tile(a.x, a.y)];
      const d = fightDamage(this.hero, m);
      this.hero.hp = d == null ? -1 : this.hero.hp - d;
      this.hero.money += m.money;
      this.removed.add(posKey(a.x, a.y));
    } else if (a.type === "collect") {
      this.collectAt(a.x, a.y);
    } else if (a.type === "door") {
      if (a.door && a.door !== "ice") this.hero[a.door] -= 1;
      this.removed.add(posKey(a.x, a.y));
    }
    this.hero.x = a.x; this.hero.y = a.y;
    if (this.bossDefeated()) this.goalReached = true;
    if (this.hero.hp <= 0) this.failed = true;
    return { pickups };
  }

  bossDefeated(): boolean {
    for (let y = 0; y < this.floor.height; y++)
      for (let x = 0; x < this.floor.width; x++)
        if (this.floor.grid[y][x] === BOSS_TILE && this.removed.has(posKey(x, y))) return true;
    return false;
  }

  /** The engine's assist at this state (evaluate_with_callback), or null when the model would be asked. */
  assist(actions = this.actions(), autoFight = true): { action: Action; reason: string } | { stuck: string } | null {
    if (!actions.length) return { stuck: "No actions available" };
    if (actions.length === 1) {
      const only = actions[0];
      if (only.type === "fight" && !only.canWin) return { stuck: "Stuck — only unwinnable fight remains" };
      return { action: only, reason: "only choice" };
    }
    let best: Action | null = null;
    for (const a of actions) if (a.type === "collect" && (best == null || (a.itemScore ?? 0) > (best.itemScore ?? 0))) best = a;
    if (best) return { action: best, reason: "auto-collect" };
    if (autoFight) {
      const free = actions.filter((a) => a.type === "fight" && a.canWin && a.damage === 0)
        .sort((a, b) => a.path.length - b.path.length)[0];
      if (free) return { action: free, reason: "auto-fight (0 HP)" };
    }
    return null;
  }
}
