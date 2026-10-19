import type { Metadata } from "next";
import Link from "next/link";
import { IconChevronRight, IconCompass } from "@/components/Icons";
import { TOUR } from "@/lib/tour";

export const metadata: Metadata = {
  title: "Guided tour",
  description: "Eleven short chapters from the game to the conclusion of the thesis, each with something to try.",
};

export default function TourPage() {
  return (
    <div className="page">
      <section className="hero flex flex-col gap-4">
        <span className="eyebrow">Guided tour</span>
        <h1>The thesis in eleven steps</h1>
        <p className="lead">
          Each chapter asks one question and answers it with the stored evidence: a decision to try, a route to step through, the model&apos;s
          own reasoning, or the result cells behind a thesis table. Every chapter links to the full data.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link className="btn btn-primary" href={`/tour/${TOUR[0].slug}/`}><IconCompass aria-hidden="true" />Start with the game</Link>
          <Link className="btn" href={`/tour/${TOUR[1].slug}/`}>Jump to the first decision</Link>
        </div>
      </section>
      <ol className="card-grid list-none p-0 m-0">
        {TOUR.map((c, i) => (
          <li key={c.slug}>
            <Link className="card-link h-full" href={`/tour/${c.slug}/`}>
              <span className="mono text-[12px] muted">{String(i + 1).padStart(2, "0")} · {c.thesis}</span>
              <span className="heading text-[15px]">{c.title}</span>
              <span className="muted">{c.question}</span>
              <span className="go">open <IconChevronRight aria-hidden="true" className="inline" /></span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
