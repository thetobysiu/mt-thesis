import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ThesisToc } from "@/components/ThesisToc";
import { getThesisChapters, renderChapter } from "@/lib/thesis";

export const dynamicParams = false;
export function generateStaticParams() { return getThesisChapters().map((c) => ({ chapter: c.slug })); }

type Params = { params: Promise<{ chapter: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { chapter } = await params;
  const c = getThesisChapters().find((x) => x.slug === chapter);
  return { title: c ? `${c.label ? `${c.label}: ` : ""}${c.title}` : "Thesis" };
}

export default async function ThesisChapterPage({ params }: Params) {
  const { chapter } = await params;
  const r = renderChapter(chapter);
  if (!r) notFound();
  const all = getThesisChapters();
  const i = all.findIndex((c) => c.slug === chapter);
  const prev = all[i - 1], next = all[i + 1];
  return (
    <div className="page page-wide">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_16rem] max-w-[1180px] w-full mx-auto">
        <article className="thesis-body min-w-0" dangerouslySetInnerHTML={{ __html: r.html }} />
        <aside className="hidden xl:block">
          <ThesisToc label={r.chapter.label || "Thesis"} headings={r.headings} />
        </aside>
      </div>
      <nav className="flex flex-wrap items-center gap-2 pt-4 border-t border-[var(--border-soft)] max-w-[1180px] w-full mx-auto" aria-label="chapters">
        {prev ? <Link className="btn" href={`/thesis/${prev.slug}/`}>← {prev.label || prev.title}</Link> : <Link className="btn" href="/thesis/">← Contents</Link>}
        <Link className="btn btn-sm" href="/thesis/">Contents</Link>
        <span className="flex-1" />
        {next && <Link className="btn btn-primary" href={`/thesis/${next.slug}/`}>{next.label || next.title} →</Link>}
      </nav>
    </div>
  );
}
