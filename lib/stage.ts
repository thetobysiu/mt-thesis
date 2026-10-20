// Time helpers for scenes drawn from absolute time (the Mografy scene model: every frame is a pure function of t).

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Progress of `t` through [a, b], clamped to 0..1. */
export const pr = (t: number, a: number, b: number) => (b <= a ? (t >= b ? 1 : 0) : clamp01((t - a) / (b - a)));

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export const ease = {
  out: (p: number) => 1 - (1 - p) ** 3,
  inOut: (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
  back: (p: number) => 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2,
};

/** Fade in over [a, a + d] and out over [b - d, b]. */
export const window01 = (t: number, a: number, b: number, d = 0.5) => Math.min(pr(t, a, a + d), 1 - pr(t, b - d, b));

/** m:ss */
export function fmtTime(s: number): string {
  const v = Math.max(0, Math.floor(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
}

/** Integer counted up from `from` to `to` over [a, b]. */
export const countUp = (t: number, a: number, b: number, from: number, to: number) => Math.round(lerp(from, to, ease.out(pr(t, a, b))));
