// Client-side loading of one compacted episode log (public/data/episodes/<id>.json.gz).
import type { RunLog } from "./types";

export async function loadEpisode(id: string, signal?: AbortSignal): Promise<RunLog> {
  const res = await fetch(`/data/episodes/${encodeURIComponent(id)}.json.gz`, { signal });
  if (!res.ok || !res.body) throw new Error(`episode ${id}: HTTP ${res.status}`);
  // some hosts already decode gzip on the way (Content-Encoding); only inflate when the gzip magic bytes are there
  const buf = new Uint8Array(await res.arrayBuffer());
  const gz = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  const text = gz
    ? await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text()
    : new TextDecoder().decode(buf);
  return JSON.parse(text) as RunLog;
}
