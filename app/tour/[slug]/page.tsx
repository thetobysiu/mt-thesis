import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TourContent } from "@/components/tour/Chapters";
import { IconChevronRight } from "@/components/Icons";
import { TOUR, tourIndex } from "@/lib/tour";

export const dynamicParams = false;
export function generateStaticParams() { return TOUR.map((c) => ({ slug: c.slug })); }

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = TOUR[tourIndex((await params).slug)];
  return c ? { title: `Tour ${tourIndex(c.slug) + 1}: ${c.title}`, description: c.question } : { title: "Tour" };
}

export default async function TourChapterPage({ params }: Params) {
  const { slug } = await params;
  const i = tourIndex(slug);
  if (i < 0) notFound();
  const c = TOUR[i], prev = TOUR[i - 1], next = TOUR[i + 1];
  return (
    <div className="page">
      <nav className="tour-progress" aria-label="tour chapters">
        {TOUR.map((t, k) => (
          <Link key={t.slug} href={`/tour/${t.slug}/`} className={k === i ? "on" : k < i ? "done" : ""} aria-current={k === i ? "step" : undefined}
                title={`${k + 1}. ${t.title}`}><span className="sr-only">{k + 1}. {t.title}</span></Link>
        ))}
      </nav>
      <section className="flex flex-col gap-2">
        <span className="eyebrow">Tour · {i + 1} of {TOUR.length} · {c.thesis}</span>
        <h1>{c.title}</h1>
        <p className="lead">{c.question}</p>
      </section>
      <TourContent slug={slug} />
      <nav className="flex flex-wrap items-center gap-2 pt-4 border-t border-[var(--border-soft)]" aria-label="tour navigation">
        {prev ? <Link className="btn" href={`/tour/${prev.slug}/`}>← {prev.title}</Link> : <Link className="btn" href="/tour/">← Tour overview</Link>}
        <span className="flex-1" />
        {next ? <Link className="btn btn-primary" href={`/tour/${next.slug}/`}>{next.title} <IconChevronRight aria-hidden="true" /></Link>
              : <Link className="btn btn-primary" href="/journey/">The journey behind it <IconChevronRight aria-hidden="true" /></Link>}
      </nav>
    </div>
  );
}
