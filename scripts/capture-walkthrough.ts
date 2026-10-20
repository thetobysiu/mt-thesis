// Renders the walkthrough to video: serves out/ locally, opens /walkthrough/?capture in Edge or Chrome (playwright-core),
// steps the timeline frame by frame, pipes the screenshots to ffmpeg and muxes the generated music.
//
//   npm run build
//   npm i --no-save playwright-core ffmpeg-static      # local only; not dependencies, so CI downloads nothing
//   npm run capture                                     # → public/walkthrough/walkthrough.{mp4,webm}, poster.jpg
//   npm run capture -- --fps 30 --from 0 --to 180 --no-webm --channel chrome
//   npm run capture -- --audio-only                     # re-render the music only, reusing .capture/frames.mp4
//   npm run capture -- --serve                          # only serve out/ on http://localhost:3123
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";

const OUT = path.resolve("out");
const DEST = path.resolve("public", "walkthrough");
const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const flag = (k: string) => args.includes(`--${k}`);
const FPS = Number(opt("fps", "30"));
const FROM = Number(opt("from", "0"));
const PORT = Number(opt("port", "3123"));
const W = 1280, H = 720, SCALE = 1.5;   // 1920 × 1080 frames

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain; charset=utf-8",
  ".vtt": "text/vtt", ".mp4": "video/mp4", ".webm": "video/webm", ".ico": "image/x-icon", ".xml": "application/xml", ".gif": "image/gif",
};
function serve(): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? "/").split(/[?#]/)[0]);
    let f = path.join(OUT, url);
    if (!f.startsWith(OUT)) { res.writeHead(403).end(); return; }
    if (url.endsWith("/")) f = path.join(f, "index.html");
    else if (!fs.existsSync(f) && fs.existsSync(`${f}.html`)) f = `${f}.html`;
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end("not found"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] ?? "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => server.listen(PORT, () => ok(server)));
}

// optional tools, resolved at run time so that type checking and CI do not need them
async function load<T>(name: string): Promise<T> {
  try { return (await import(name)) as T; } catch {
    console.error(`missing ${name}: run  npm i --no-save playwright-core ffmpeg-static`);
    process.exit(1);
  }
}

function ffmpeg(bin: string, argv: string[]) {
  const p = spawn(bin, argv, { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise<void>((ok, fail) => p.on("close", (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg exited with ${c}`)))));
  return { stdin: p.stdin, done };
}

async function main() {
  if (!fs.existsSync(path.join(OUT, "walkthrough", "index.html"))) { console.error("out/walkthrough/ missing: run npm run build first"); process.exit(1); }
  const server = await serve();
  console.log(`serving out/ on http://localhost:${PORT}`);
  if (flag("serve")) return;

  type PW = { chromium: { launch: (o: object) => Promise<Browser> } };
  type Browser = { newPage: (o: object) => Promise<Page>; close: () => Promise<void> };
  type Page = {
    goto: (u: string, o?: object) => Promise<unknown>; waitForFunction: (f: string) => Promise<unknown>;
    evaluate: <R>(f: string) => Promise<R>; screenshot: (o: object) => Promise<Buffer>;
  };
  const pw = await load<PW>("playwright-core");
  const ff = await load<{ default: string }>("ffmpeg-static");
  const channel = opt("channel", "msedge");
  const browser = await pw.chromium.launch({ channel, headless: true });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
  const captions = flag("no-captions") ? "&captions=0" : "";
  await page.goto(`http://localhost:${PORT}/walkthrough/?capture=1${captions}`, { waitUntil: "networkidle" });
  await page.waitForFunction("!!window.__walkthrough && document.fonts.status === 'loaded'");
  const duration = await page.evaluate<number>("window.__walkthrough.duration");
  const TO = Number(opt("to", String(duration)));

  fs.mkdirSync(DEST, { recursive: true });
  const tmp = path.resolve(".capture");
  fs.mkdirSync(tmp, { recursive: true });
  console.log("rendering music …");
  const wav = path.join(tmp, "music.wav");
  fs.writeFileSync(wav, Buffer.from(await page.evaluate<string>("window.__walkthrough.music(24000)"), "base64"));

  // frames → lossless-enough intermediate, then the delivery encodes
  const master = path.join(tmp, "frames.mp4");
  const audioOnly = flag("audio-only") && fs.existsSync(master);
  const frames = audioOnly ? 0 : Math.round((TO - FROM) * FPS);
  const enc = audioOnly ? null : ffmpeg(ff.default, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "12", "-pix_fmt", "yuv420p", master]);
  const started = Date.now();
  for (let i = 0; enc && i < frames; i++) {
    const t = FROM + i / FPS;
    await page.evaluate(`window.__walkthrough.setTime(${t.toFixed(4)})`);
    const jpg = await page.screenshot({ type: "jpeg", quality: 95, clip: { x: 0, y: 0, width: W, height: H } });
    if (!enc.stdin.write(jpg)) await new Promise((ok) => enc.stdin.once("drain", ok));
    if (i % (FPS * 5) === 0) {
      const el = (Date.now() - started) / 1000;
      console.log(`frame ${i}/${frames}  t=${t.toFixed(1)} s  ${(i / Math.max(1, el)).toFixed(1)} fps`);
    }
    if (Math.abs(t - 47) < 0.5 / FPS) fs.writeFileSync(path.join(DEST, "poster.jpg"), jpg);
  }
  if (enc) { enc.stdin.end(); await enc.done; }
  await browser.close();
  server.close();

  const offset = FROM > 0 ? ["-ss", String(FROM)] : [];
  console.log("encoding mp4 …");
  await ffmpeg(ff.default, ["-y", "-i", master, ...offset, "-i", wav, "-map", "0:v", "-map", "1:a", "-shortest",
    "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-tune", "animation", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "128k", path.join(DEST, "walkthrough.mp4")]).done;
  if (!flag("no-webm")) {
    console.log("encoding webm …");
    await ffmpeg(ff.default, ["-y", "-i", master, ...offset, "-i", wav, "-map", "0:v", "-map", "1:a", "-shortest",
      "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4",
      "-c:a", "libopus", "-b:a", "96k", path.join(DEST, "walkthrough.webm")]).done;
  }
  for (const f of ["walkthrough.mp4", "walkthrough.webm", "poster.jpg"]) {
    const p = path.join(DEST, f);
    if (fs.existsSync(p)) console.log(`${f}: ${(fs.statSync(p).size / 1e6).toFixed(1)} MB`);
  }
}

main().catch((e: unknown) => { console.error(e); process.exit(1); });
