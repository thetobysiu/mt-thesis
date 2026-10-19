// Java's java.util.HashSet and java.util.PriorityQueue, emulated: the published solver keeps the first state it takes
// from the queue for each cleared set, so its answer (22 HP on the complex floor) depends on Java's iteration and
// heap order. The exact search does not depend on them.

type Entry<T> = { key: T; hash: number; next: Entry<T> | null };
const spread = (h: number) => (h ^ (h >>> 16)) | 0;

function tableSizeFor(cap: number): number {
  let n = 1;
  while (n < cap) n <<= 1;
  return n;
}

/** HashMap-backed set with Java's bucket layout, resize split and iteration order (keys hashed by `hashOf`). */
export class JavaHashSet<T> implements Iterable<T> {
  private table: (Entry<T> | null)[] | null = null;
  private threshold: number;
  size = 0;

  constructor(private hashOf: (t: T) => number, initialCapacity?: number) {
    this.threshold = initialCapacity != null ? tableSizeFor(initialCapacity) : 0;
  }

  /** new HashSet<>(collection): capacity max(size/.75 + 1, 16), then addAll in the source's order. */
  static copyOf<T>(src: JavaHashSet<T>): JavaHashSet<T> {
    const s = new JavaHashSet<T>(src.hashOf, Math.max(Math.floor(src.size / 0.75) + 1, 16));
    for (const x of src) s.add(x);
    return s;
  }

  private resize(): (Entry<T> | null)[] {
    const old = this.table;
    const oldCap = old ? old.length : 0, oldThr = this.threshold;
    let newCap: number, newThr = 0;
    if (oldCap > 0) {
      newCap = oldCap << 1;
      if (oldCap >= 16) newThr = oldThr << 1;
    } else if (oldThr > 0) newCap = oldThr;
    else { newCap = 16; newThr = 12; }
    if (newThr === 0) newThr = Math.floor(newCap * 0.75);
    this.threshold = newThr;
    const tab: (Entry<T> | null)[] = new Array(newCap).fill(null);
    if (old) {
      for (let j = 0; j < oldCap; j++) {
        let e = old[j];
        if (!e) continue;
        let loH: Entry<T> | null = null, loT: Entry<T> | null = null, hiH: Entry<T> | null = null, hiT: Entry<T> | null = null;
        while (e) {
          const next: Entry<T> | null = e.next;
          if ((e.hash & oldCap) === 0) { if (loT) loT.next = e; else loH = e; loT = e; }
          else { if (hiT) hiT.next = e; else hiH = e; hiT = e; }
          e = next;
        }
        if (loT) { loT.next = null; tab[j] = loH; }
        if (hiT) { hiT.next = null; tab[j + oldCap] = hiH; }
      }
    }
    this.table = tab;
    return tab;
  }

  add(key: T): boolean {
    const hash = spread(this.hashOf(key));
    const tab = this.table && this.table.length ? this.table : this.resize();
    const i = (tab.length - 1) & hash;
    let e = tab[i];
    let grow = false;
    if (!e) tab[i] = { key, hash, next: null };
    else {
      let depth = 1;
      while (true) {
        if (e.hash === hash) return false;  // Node.equals compares hash codes
        if (!e.next) break;
        e = e.next;
        depth++;
      }
      e.next = { key, hash, next: null };
      // HashMap.treeifyBin: a ninth entry in one bucket resizes small tables (true treeification is not emulated)
      if (depth >= 8) {
        if (tab.length >= 64) throw new Error("JavaHashSet: bucket would be treeified; emulation not exact");
        grow = true;
      }
    }
    if (grow) this.resize();
    if (++this.size > this.threshold) this.resize();
    return true;
  }

  has(key: T): boolean {
    if (!this.table) return false;
    const hash = spread(this.hashOf(key));
    for (let e = this.table[(this.table.length - 1) & hash]; e; e = e.next) if (e.hash === hash) return true;
    return false;
  }

  delete(key: T): boolean {
    if (!this.table) return false;
    const hash = spread(this.hashOf(key));
    const i = (this.table.length - 1) & hash;
    let prev: Entry<T> | null = null;
    for (let e = this.table[i]; e; prev = e, e = e.next) {
      if (e.hash !== hash) continue;
      if (prev) prev.next = e.next; else this.table[i] = e.next;
      this.size--;
      return true;
    }
    return false;
  }

  *[Symbol.iterator](): Iterator<T> {
    if (!this.table) return;
    for (const head of this.table) for (let e = head; e; e = e.next) yield e.key;
  }
}

/** java.util.PriorityQueue: binary heap with Java's siftUp/siftDown. */
export class JavaPriorityQueue<T> {
  private q: T[] = [];
  constructor(private cmp: (a: T, b: T) => number) {}
  get size() { return this.q.length; }

  offer(x: T): void {
    const q = this.q;
    let k = q.length;
    q.push(x);
    while (k > 0) {
      const parent = (k - 1) >>> 1;
      const e = q[parent];
      if (this.cmp(x, e) >= 0) break;
      q[k] = e;
      k = parent;
    }
    q[k] = x;
  }

  poll(): T | undefined {
    const q = this.q;
    if (!q.length) return undefined;
    const result = q[0];
    const x = q.pop()!;
    const n = q.length;
    if (n > 0) {
      let k = 0;
      const half = n >>> 1;
      while (k < half) {
        let child = 2 * k + 1;
        let c = q[child];
        const right = child + 1;
        if (right < n && this.cmp(c, q[right]) > 0) c = q[(child = right)];
        if (this.cmp(x, c) <= 0) break;
        q[k] = c;
        k = child;
      }
      q[k] = x;
    }
    return result;
  }
}
