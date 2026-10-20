import type { Metadata } from "next";
import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import { WalkthroughPlayer } from "@/components/walkthrough/Player";
import { presentData } from "@/lib/present-data";
import { SITE_URL } from "@/lib/site";
import { CHAPTERS, DURATION } from "@/lib/walkthrough";

export const metadata: Metadata = {
  title: "The thesis in three minutes",
  description: "An animated, interactive three-minute walkthrough of the whole thesis: the game, the hybrid agent, the exact solver and the three research questions, with live demos to pause and try.",
};

const VIDEO = "/walkthrough/walkthrough.mp4";
const hasVideo = () => fs.existsSync(path.join(process.cwd(), "public", VIDEO));

export default function WalkthroughPage() {
  const video = hasVideo();
  return (
    <div className="page page-wide">
      <header className="flex flex-col gap-1">
        <h1>The thesis in three minutes</h1>
        <p className="muted m-0 max-w-[110ch]">
          The whole thesis as one animated story in {CHAPTERS.length} chapters ({Math.round(DURATION / 60)} minutes): the game, one decision, the hybrid
          agent and the exact solver, then the three research questions and the tower. Every number is the thesis&apos;s. Pause at the gold marks
          to try the demo yourself; the <Link className="link" href="/present/">presentation</Link> and the <Link className="link" href="/tour/">guided tour</Link> go
          deeper.
        </p>
      </header>
      <WalkthroughPlayer data={presentData()} siteUrl={SITE_URL} />
      <section className="flex flex-col gap-2">
        <h2 className="text-[18px] m-0">Files</h2>
        <div className="flex flex-wrap gap-2">
          {video && <a className="btn btn-sm" href={VIDEO} download>video (MP4, 1080p)</a>}
          {video && <a className="btn btn-sm" href="/walkthrough/walkthrough.webm" download>video (WebM)</a>}
          <a className="btn btn-sm" href="/walkthrough/captions.vtt">captions (WebVTT)</a>
          <a className="btn btn-sm" href="/walkthrough/voiceover.txt">voice-over script</a>
        </div>
        <p className="muted text-[13px] m-0">
          The video is rendered from this page frame by frame, so it shows exactly what the player shows; the music is generated in the browser
          from a fixed chord sequence.
        </p>
      </section>
    </div>
  );
}
