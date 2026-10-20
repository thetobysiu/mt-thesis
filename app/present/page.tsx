import type { Metadata } from "next";
import Link from "next/link";
import { Deck } from "@/components/present/Deck";
import { presentData } from "@/lib/present-data";

export const metadata: Metadata = {
  title: "Presentation",
  description: "The thesis defense as interactive slides: the exact solver, real decisions with the model's reasoning, and the results, live.",
};

export default function PresentPage() {
  return (
    <div className="page page-wide">
      <header className="flex flex-col gap-1">
        <h1>Defense presentation</h1>
        <p className="muted m-0 max-w-[110ch]">
          The thesis defense as slides, with live demos where the PowerPoint had screenshots: step the exact solver, choose the first move,
          open any result cell at a real decision with the model&apos;s input, reasoning and move. For the short version, see
          the <Link className="link" href="/walkthrough/">3-minute walkthrough</Link>.
        </p>
      </header>
      <Deck data={presentData()} />
    </div>
  );
}
