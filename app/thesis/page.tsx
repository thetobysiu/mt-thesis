import type { Metadata } from "next";
import Link from "next/link";
import { BIBTEX, SITE } from "@/lib/site";
import { getThesisChapters } from "@/lib/thesis";

export const metadata: Metadata = {
  title: "Thesis",
  description: "The full text of the master's thesis, chapter by chapter, with the submitted PDF and a citation.",
};

export default function ThesisIndex() {
  const ch = getThesisChapters();
  const groups: { id: string; title: string }[] = [
    { id: "front", title: "Front matter" }, { id: "main", title: "Chapters" }, { id: "back", title: "References and declaration" }, { id: "appendix", title: "Appendices" },
  ];
  return (
    <div className="page">
      <section className="hero flex flex-col gap-4">
        <span className="eyebrow">{SITE.degree} · {SITE.university}</span>
        <h1 className="text-[28px] max-w-[46ch]">{SITE.title}</h1>
        <p className="muted">{SITE.author} · supervised by {SITE.supervisors.join(" and ")} · <span className="tag tag-warn">{SITE.status}</span></p>
        <p className="lead">
          The full text, rendered from the manuscript the PDF was built from. Cross-references link to their section, table or figure; table
          captions link to the result cells behind them; terms of the glossary show their definition on hover.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link className="btn btn-primary" href="/thesis/abstract/">Read from the abstract</Link>
          <a className="btn" href="/thesis/thesis.pdf" download>Download the PDF</a>
        </div>
      </section>

      <div className="grid gap-[var(--gap)] lg:grid-cols-2">
        {groups.map((g) => (
          <section key={g.id} className="panel p-4 flex flex-col gap-2" aria-labelledby={`g-${g.id}`}>
            <h2 id={`g-${g.id}`} className="text-[16px]">{g.title}</h2>
            <ol className="m-0 p-0 list-none flex flex-col gap-1">
              {ch.filter((c) => c.group === g.id).map((c) => (
                <li key={c.slug}>
                  <Link className="link" href={`/thesis/${c.slug}/`}>{c.label ? <span className="mono muted text-[12px] mr-2">{c.label}</span> : null}{c.title}</Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <section className="flex flex-col gap-2" aria-labelledby="cite">
        <h2 id="cite">Cite</h2>
        <p className="text-[14px]">Siu, K. W. (2026). <i>{SITE.title}</i>. Master&apos;s thesis, {SITE.university}. Submitted, not yet graded.</p>
        <pre className="pre text-[12px]">{BIBTEX}</pre>
      </section>
    </div>
  );
}
