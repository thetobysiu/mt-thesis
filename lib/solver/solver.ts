// TypeScript port of the published solver of magic-tower-AI (ckcz123) as modified for the thesis (mt-ai-lab
// tools/java_bfs): the same graph of merged nodes, the same eager eating of items and 0-damage monsters, and two
// searches over cleared sets: "exact" (a state is expanded only if it beats the best HP seen for its set) and
// "published" (the first state taken from the queue per set is kept, as in the released code).
import { JavaHashSet, JavaPriorityQueue } from "./java";

type Hero = { hp: number; atk: number; def: number; mdef: number; money: number; yellow: number; blue: number; red: number; green: number };
type Item = { hp: number; atk: number; def: number; mdef: number; yellow: number; blue: number; red: number; green: number; special: number };
type Monster = { id: number; hp: number; atk: number; def: number; money: number; special: number };

const ROAD = 0, UPSTAIR = 87, DOWNSTAIR = 88, BOSS = 299;
const newItem = (p: Partial<Item>): Item => ({ hp: 0, atk: 0, def: 0, mdef: 0, yellow: 0, blue: 0, red: 0, green: 0, special: 0, ...p });

/** Util.getDamage */
export function javaDamage(h: Hero, m: Monster): number {
  let heroDef = h.def, monAtk = m.atk, monDef = m.def;
  const sp = m.special;
  if (sp === 2) heroDef = 0;
  if (sp === 3 && monDef < h.atk - 1) monDef = h.atk - 1;
  if (sp === 10) { monAtk = h.atk; monDef = heroDef; }
  if (h.atk <= monDef) return 999999999;
  let per = Math.max(0, monAtk - heroDef);
  if (sp === 4) per *= 2;
  if (sp === 5) per *= 3;
  if (sp === 6) per *= 4;
  if (sp === 8) per += Math.trunc(0.1 * h.atk);
  let dmg = sp === 1 ? per : 0;
  if (sp === 7) dmg = Math.trunc(0.9 * heroDef);
  if (sp === 9) dmg = 3 * h.mdef;
  const ans = dmg + Math.trunc((m.hp - 1) / (h.atk - monDef)) * per - h.mdef;
  return ans <= 0 ? 0 : ans;
}

export class SNode {
  id = 0;
  readonly h: number;
  hero: Hero | null = null;
  item: Item | null = null;
  doors: number[] = [];
  monsters: Monster[] = [];
  parts: SNode[] = [];
  linked: JavaHashSet<SNode>;
  constructor(readonly type: number, readonly f: number, readonly x: number, readonly y: number) {
    this.h = 1000000 * f + 1000 * x + y;
    this.linked = new JavaHashSet<SNode>(hashOf);
  }
  get isHashed() { return this.doors.length > 0 || this.monsters.length > 0; }

  /** Node.merge(Node): graph construction, `another` is absorbed into this node. */
  absorb(another: SNode): void {
    if (this.item) addItem(this.item, another.item);
    this.doors.push(...another.doors);
    this.monsters.push(...another.monsters);
    this.parts.push(...another.parts);
    for (const to of [...another.linked]) {
      if (to.h !== this.h) { this.linked.add(to); to.linked.add(this); }
      to.linked.delete(another);
    }
  }

  /** Node.merge(Node, visited): the hero moves into `another`, taking its items, doors and fights in order. */
  step(another: SNode, visited: boolean[]): SNode | null {
    const node = new SNode(this.type, another.f, another.x, another.y);
    node.hero = { ...this.hero! };
    node.linked = JavaHashSet.copyOf(this.linked);
    const h = node.hero;
    for (const part of another.parts) {
      if (part.item) heroGet(h, part.item);
      for (const v of part.doors) { if (v === 1) h.yellow--; if (v === 2) h.blue--; if (v === 3) h.red--; }
      for (const m of part.monsters) h.hp -= javaDamage(h, m);
    }
    if (!(h.hp > 0 && h.yellow >= 0 && h.blue >= 0 && h.red >= 0 && h.green >= 0)) return null;
    for (const to of another.linked) if (!visited[to.id]) node.linked.add(to);
    return node;
  }

  shouldEat(hero: Hero | null): boolean {
    if (this.item) return true;
    if (!hero || this.doors.length || !this.monsters.length) return false;
    return this.monsters.every((m) => javaDamage(hero, m) === 0);
  }
}
const hashOf = (n: SNode) => n.h;
function addItem(a: Item, b: Item | null) {
  if (!b) return;
  a.hp += b.hp; a.atk += b.atk; a.def += b.def; a.mdef += b.mdef; a.yellow += b.yellow; a.blue += b.blue; a.red += b.red; a.green += b.green;
  a.special += b.special;
}
function heroGet(h: Hero, it: Item) {
  h.hp += it.hp; h.atk += it.atk; h.def += it.def; h.mdef += it.mdef; h.yellow += it.yellow; h.blue += it.blue; h.red += it.red; h.green += it.green;
}

export class Graph {
  rows: number; cols: number; floors: number;
  map: number[][][];
  list: SNode[] = [];
  bossId = -1;
  monsterMap = new Map<number, Monster>();
  shop: number[];
  hashed: number[] = [];

  constructor(text: string, merge = true, readonly shouldEat = true) {
    const nums = text.replace(/,/g, " ").split(/\s+/).filter(Boolean).map(Number);
    let i = 0;
    const next = () => nums[i++];
    this.floors = next(); this.rows = next(); this.cols = next();
    this.map = Array.from({ length: this.floors }, () => Array.from({ length: this.rows }, () => Array.from({ length: this.cols }, next)));
    const [pAtk, pDef, pMdef, pRed, pBlue, pYellow, pGreen, pSword, pShield] = Array.from({ length: 9 }, next);
    const n = next();
    for (let k = 0; k < n; k++) {
      const [id, hp, atk, def, money, special] = Array.from({ length: 6 }, next);
      this.monsterMap.set(id, { id, hp, atk, def, money, special });
    }
    this.shop = Array.from({ length: 6 }, next);
    const [hp, atk, def, mdef, money, yellow, blue, red, floor, x, y] = Array.from({ length: 11 }, next);
    const start = new SNode(0, floor, x, y);
    start.hero = { hp, atk, def, mdef, money, yellow, blue, red, green: 0 };
    this.list.push(start);

    const items: Record<number, Partial<Item>> = {
      21: { yellow: 1 }, 22: { blue: 1 }, 23: { red: 1 }, 24: { green: 1 }, 27: { atk: pAtk }, 28: { def: pDef }, 29: { mdef: pMdef },
      31: { hp: pRed }, 32: { hp: pBlue }, 34: { hp: pYellow }, 33: { hp: pGreen }, 35: { atk: pSword }, 36: { def: pShield }, 40: { special: 1 },
    };
    const doors: Record<number, number> = { 81: 1, 82: 2, 83: 3, 84: 4 };
    for (let f = 0; f < this.floors; f++)
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++) {
          const t = this.map[f][r][c];
          let node: SNode | null = null;
          if (t in items) { node = new SNode(t, f, r, c); node.item = newItem(items[t]); }
          if (t in doors) { node = new SNode(t, f, r, c); node.doors.push(doors[t]); }
          if (t >= 201) {
            const m = this.monsterMap.get(t);
            if (!m) continue;
            node = new SNode(t, f, r, c);
            node.monsters.push(m);
          }
          if (node) {
            const part = new SNode(node.type, f, r, c);
            part.item = node.item ? { ...node.item } : null;
            part.doors = [...node.doors];
            part.monsters = [...node.monsters];
            node.parts = [part];
            this.list.push(node);
          }
        }
    for (let a = 0; a < this.list.length; a++)
      for (let b = a + 1; b < this.list.length; b++) {
        const n1 = this.list[a], n2 = this.list[b];
        if (this.isLinked(n1, n2)) { n1.linked.add(n2); n2.linked.add(n1); }
      }
    if (merge) this.mergeNodes();
    this.list.forEach((node, k) => {
      node.id = k;
      if (node.type === BOSS) this.bossId = k;
      if (node.isHashed) this.hashed.push(k);
    });
  }

  private isLinked(a: SNode, b: SNode): boolean {
    if (a.f !== b.f) throw new Error("multi-floor maps are not supported");
    if (a.x === b.x && a.y === b.y) return true;
    const grid = this.map[a.f];
    const seen = Array.from({ length: this.rows }, () => new Array<boolean>(this.cols).fill(false));
    seen[a.x][a.y] = true;
    const queue: number[][] = [[a.x, a.y]];
    for (let qi = 0; qi < queue.length; qi++) {
      const [x, y] = queue[qi];
      for (const [dx, dy] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= this.rows || ny < 0 || ny >= this.cols) continue;
        if (nx === b.x && ny === b.y) return true;
        const t = grid[nx][ny];
        if (seen[nx][ny] || (t !== ROAD && t !== UPSTAIR && t !== DOWNSTAIR)) continue;
        seen[nx][ny] = true;
        queue.push([nx, ny]);
      }
    }
    return false;
  }

  private mergeNodes(): void {
    for (let changed = true; changed;) {
      changed = false;
      outer: for (let a = 1; a < this.list.length; a++)
        for (let b = a + 1; b < this.list.length; b++)
          if (this.shouldMerge(this.list[a], this.list[b])) {
            this.list[a].absorb(this.list[b]);
            this.list.splice(b, 1);
            changed = true;
            break outer;
          }
    }
  }

  private shouldMerge(n1: SNode, n2: SNode): boolean {
    if (!n1.linked.has(n2) || !n2.linked.has(n1)) return false;
    if (n1.item && n2.item) return true;
    if (n1.item || n2.item) return false;
    if (n1.type === BOSS || n2.type === BOSS) return false;
    for (const node of n2.linked) if (n1.linked.has(node)) return false;
    for (const u of [n1, n2]) {
      const v = u === n1 ? n2 : n1;
      for (const x of u.linked)
        for (const y of u.linked) {
          if (x.h === y.h || x.h === v.h || y.h === v.h) continue;
          if (!x.linked.has(y) || !y.linked.has(x)) return false;
        }
    }
    return true;
  }
}

export type RouteStep = { kind: "start" | "decision" | "auto"; nodeId: number; tiles: { x: number; y: number }[]; hero: Hero };

export class SolverState {
  current!: SNode;
  visited!: boolean[];
  route!: RouteStep[];
  shopTime = -1;
  cnt = 0;
  constructor(readonly graph: Graph) {}

  static initial(graph: Graph): SolverState {
    const s = new SolverState(graph);
    s.current = graph.list[0];
    s.visited = new Array(graph.list.length).fill(false);
    s.visited[s.current.id] = true;
    s.route = [{ kind: "start", nodeId: 0, tiles: [{ x: s.current.y, y: s.current.x }], hero: { ...s.current.hero! } }];
    s.eat();
    return s;
  }

  copy(): SolverState {
    const s = new SolverState(this.graph);
    s.current = this.current;
    s.visited = this.visited.slice();
    s.route = this.route.slice();
    s.shopTime = this.shopTime;
    s.cnt = this.cnt;
    return s;
  }

  /** State.merge: take one decision (a door or fight node next to the current region). */
  take(node: SNode): SolverState | null {
    if (this.visited[node.id] || !this.current.linked.has(node)) return null;
    const next = this.current.step(node, this.visited);
    if (!next) return null;
    this.current = next;
    this.visit(node);
    this.trace("decision", node);
    this.eat();
    this.cnt++;
    return this;
  }

  private trace(kind: RouteStep["kind"], node: SNode) {
    this.route.push({ kind, nodeId: node.id, tiles: node.parts.map((p) => ({ x: p.y, y: p.x })), hero: { ...this.current.hero! } });
  }

  private eat(): void {
    for (let has = true; has;) {
      has = false;
      for (const node of this.current.linked) {
        if (this.visited[node.id]) continue;
        if (!node.shouldEat(this.graph.shouldEat ? this.current.hero : null)) continue;
        has = true;
        this.current = this.current.step(node, this.visited)!;
        if (node.item && (node.item.special & 1) !== 0) this.shopTime = Math.max(this.shopTime, 0);
        this.visit(node);
        this.trace("auto", node);
        break;
      }
    }
    const [start, delta, , atk] = this.graph.shop;
    while (this.shopTime >= 0 && this.current.hero!.money >= start + delta * this.shopTime) {
      this.current.hero!.money -= start + delta * this.shopTime;
      this.current.hero!.atk += atk;
      this.shopTime++;
    }
  }

  private visit(node: SNode): void {
    if (!this.visited[node.id] && this.current.linked.delete(node)) {
      for (const m of node.monsters) this.current.hero!.money += m.money;
      this.visited[node.id] = true;
    }
  }

  get score() { return this.current.hero!.hp; }
  get bossDead() { return this.graph.bossId >= 0 && this.visited[this.graph.bossId]; }
  shouldStop() { return this.cnt > 45 || this.bossDead; }

  /** The cleared set: which door and monster nodes are visited. */
  key(): string | number {
    const ids = this.graph.hashed;
    if (ids.length <= 52) {
      let v = 0;
      for (let i = 0; i < ids.length; i++) if (this.visited[ids[i]]) v += 2 ** i;
      return v;
    }
    return ids.map((id) => (this.visited[id] ? "1" : "0")).join("");
  }
}

export type SolveResult = {
  solvable: boolean; hp: number | null; best: SolverState | null; states: number; winningSets: number; decisions: number | null;
};
export type SearchEvent = { kind: "pop" | "skip" | "push" | "stop" | "prune"; state: SolverState; node?: SNode };

const order = (a: SolverState, b: SolverState) => (a.cnt === b.cnt ? b.score - a.score : a.cnt - b.cnt);

/** Graph.runSummary (exact) or Graph.run (published). `onEvent` lets the solver page step through the search. */
export function solve(graph: Graph, mode: "exact" | "published", onEvent?: (e: SearchEvent) => void, limit = Infinity): SolveResult {
  const queue = new JavaPriorityQueue<SolverState>(order);
  queue.offer(SolverState.initial(graph));
  const seen = new Map<string | number, number>();      // best HP pushed per set
  const expanded = new Map<string | number, number>();  // exact: best HP expanded per set
  const popped = new Set<string | number>();            // published: first pop per set
  const winSets = new Map<string | number, number>();
  let best: SolverState | null = null;
  let index = 0;
  while (queue.size && index < limit) {
    const state = queue.poll()!;
    const key = state.key();
    if (mode === "exact") {
      const done = expanded.get(key);
      if (done != null && done >= state.score) { onEvent?.({ kind: "skip", state }); continue; }
      expanded.set(key, state.score);
    } else {
      if (popped.has(key)) { onEvent?.({ kind: "skip", state }); continue; }
      popped.add(key);
    }
    onEvent?.({ kind: "pop", state });
    if (state.shouldStop()) {
      onEvent?.({ kind: "stop", state });
      const counts = mode === "published" || state.bossDead;
      if (state.bossDead) winSets.set(key, Math.max(winSets.get(key) ?? -Infinity, state.score));
      if (counts && (best == null || best.score < state.score)) best = state;
      continue;
    }
    for (const node of state.current.linked) {
      if (state.visited[node.id]) continue;
      const another = state.copy().take(node);
      if (!another) continue;
      const k = another.key();
      if ((seen.get(k) ?? -1) > another.score) { onEvent?.({ kind: "prune", state: another, node }); continue; }
      seen.set(k, another.score);
      queue.offer(another);
      onEvent?.({ kind: "push", state: another, node });
    }
    index++;
  }
  const won = best?.bossDead ?? false;
  return { solvable: won, hp: best ? best.score : null, best, states: index, winningSets: winSets.size, decisions: best ? best.cnt : null };
}

/** The floor text with a mid-game state: cleared tiles emptied and the hero line replaced (floor_lab.state_txt). */
export function stateText(floorText: string, height: number, hero: { hp: number; atk: number; def: number; mdef: number; money: number; yellow: number; blue: number; red: number; x: number; y: number }, removed: Iterable<string>): string {
  const lines = floorText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const grid = lines.slice(2, 2 + height).map((r) => r.split(/\s+/));
  for (const k of removed) {
    const [x, y] = k.split(",").map(Number);
    grid[y][x] = "0";
  }
  const heroLine = `${hero.hp} ${hero.atk} ${hero.def} ${hero.mdef} ${hero.money} ${hero.yellow} ${hero.blue} ${hero.red} 0 ${hero.y} ${hero.x}`;
  return [...lines.slice(0, 2), ...grid.map((r) => r.join("\t")), ...lines.slice(2 + height, -1), heroLine].join("\n") + "\n";
}
