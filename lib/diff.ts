// Word-level diff (longest common subsequence) for prompts of a few thousand characters.
export type DiffPart = { kind: "same" | "add" | "del"; text: string };

const tokens = (s: string) => s.match(/\s+|[^\s]+/g) ?? [];

export function wordDiff(a: string, b: string): DiffPart[] {
  const x = tokens(a), y = tokens(b);
  const n = x.length, m = y.length;
  // dp[i][j] = LCS length of x[i:] and y[j:]
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (kind: DiffPart["kind"], text: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text; else out.push({ kind, text });
  };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { push("same", x[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) push("del", x[i++]);
    else push("add", y[j++]);
  }
  while (i < n) push("del", x[i++]);
  while (j < m) push("add", y[j++]);
  return out;
}

export function diffStats(parts: DiffPart[]): { added: number; removed: number } {
  const words = (s: string) => (s.match(/[^\s]+/g) ?? []).length;
  return {
    added: parts.filter((p) => p.kind === "add").reduce((n, p) => n + words(p.text), 0),
    removed: parts.filter((p) => p.kind === "del").reduce((n, p) => n + words(p.text), 0),
  };
}
