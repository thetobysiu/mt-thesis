// A generated ambient track for the walkthrough: deterministic (no samples, no randomness except a seeded reverb tail),
// so live playback and the offline render that goes into the video file sound the same.
import { CHAPTERS, DURATION } from "./walkthrough";

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
// A minor: Am – F – C – G, one chord per 8 s bar
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const BAR = 8;
const ARP = [0, 2, 1, 2, 0, 2, 1, 3];
const STEP = 0.5;

/** Seeded impulse response: a decaying noise tail for a soft room. */
function impulse(ctx: BaseAudioContext, seconds = 2.6): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  let seed = 0x2f6b1d;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff * 2 - 1; };
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = rnd() * Math.pow(1 - i / len, 3);
  }
  return buf;
}

/** Overall level at timeline time t: fade in over 3 s, out over the last 6 s. */
const level = (t: number) => Math.max(0, Math.min(1, t / 3, (DURATION - t) / 6));

/**
 * Schedule the track from timeline time `from` onwards, starting at `at` on the context's clock.
 * Returns a stop function (used by the live player on pause and seek).
 */
export function scheduleMusic(ctx: BaseAudioContext, out: AudioNode, from: number, at = ctx.currentTime, volume = 1): () => void {
  const master = ctx.createGain();
  const dry = ctx.createGain(), wet = ctx.createGain();
  const verb = ctx.createConvolver();
  verb.buffer = impulse(ctx);
  dry.gain.value = 0.75; wet.gain.value = 0.35;
  master.connect(dry).connect(out);
  master.connect(verb).connect(wet).connect(out);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 1400; lp.Q.value = 0.4;
  lp.connect(master);

  // master envelope in context time
  const when = (t: number) => at + (t - from);
  master.gain.setValueAtTime(volume * level(from) * (from > 0 ? 0 : 1), at);
  if (from > 0) master.gain.linearRampToValueAtTime(volume * level(from + 0.4), at + 0.4);
  for (let t = Math.ceil(from + 0.5); t <= DURATION; t += 1) master.gain.linearRampToValueAtTime(volume * level(t), when(t));

  const nodes: AudioScheduledSourceNode[] = [];
  const note = (type: OscillatorType, f: number, start: number, end: number, peak: number, attack: number, release: number, dest: AudioNode, detune = 0) => {
    if (end + release <= from) return;
    const s = Math.max(at, when(start)), e = when(end);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; o.detune.value = detune;
    const a = start < from ? Math.min(0.4, attack) : attack;
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(peak, s + a);
    g.gain.setValueAtTime(peak, Math.max(s + a, e));
    g.gain.linearRampToValueAtTime(0, Math.max(s + a, e) + release);
    o.connect(g).connect(dest);
    o.start(s); o.stop(Math.max(s + a, e) + release + 0.05);
    nodes.push(o);
  };
  const pluck = (f: number, start: number, peak: number) => {
    if (start < from) return;
    const s = when(start);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(peak, s + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 1.4);
    o.connect(g).connect(master);
    o.start(s); o.stop(s + 1.5);
    nodes.push(o);
  };

  const bars = Math.ceil(DURATION / BAR);
  for (let b = 0; b < bars; b++) {
    const chord = CHORDS[b % CHORDS.length], s = b * BAR, e = Math.min(DURATION, s + BAR);
    for (const n of chord) {
      note("triangle", hz(n), s, e, 0.05, 2.5, 3, lp, -5);
      note("triangle", hz(n), s, e, 0.05, 2.5, 3, lp, 5);
    }
    note("sine", hz(chord[0] - 12), s, e, 0.09, 1.2, 2, master);
    // arpeggio from the second chapter to the closing seconds; quieter under dense captions
    if (s >= 12) {
      for (let k = 0; k < BAR / STEP; k++) {
        const t = s + k * STEP;
        if (t >= DURATION - 5) break;
        const i = ARP[k % ARP.length];
        const f = i === 3 ? hz(chord[0] + 24) : hz(chord[i] + 12);
        pluck(f, t, k % 4 === 0 ? 0.035 : 0.022);
      }
    }
  }
  // a soft chime at every chapter start
  for (const c of CHAPTERS.slice(1)) pluck(hz(76), c.start, 0.05);

  return () => {
    const now = ctx.currentTime;
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.08);
    } catch { /* context closed */ }
    for (const n of nodes) { try { n.stop(now + 0.1); } catch { /* already stopped */ } }
    setTimeout(() => { master.disconnect(); }, 200);
  };
}

/** 16-bit PCM WAV of an AudioBuffer. */
export function encodeWav(buf: AudioBuffer): ArrayBuffer {
  const ch = buf.numberOfChannels, n = buf.length, rate = buf.sampleRate;
  const out = new ArrayBuffer(44 + n * ch * 2);
  const v = new DataView(out);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + n * ch * 2, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return out;
}

/** Render the whole track offline (used by the video capture). */
export async function renderMusic(rate = 44100): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(rate * DURATION), rate);
  scheduleMusic(ctx, ctx.destination, 0, 0);
  return ctx.startRendering();
}
