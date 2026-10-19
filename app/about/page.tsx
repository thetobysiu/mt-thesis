import type { Metadata } from "next";
import Link from "next/link";
import { BIBTEX, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "Imprint, privacy notice, licences and citation of the thesis companion site.",
};

export default function AboutPage() {
  return (
    <div className="page">
      <section className="flex flex-col gap-3">
        <span className="eyebrow">About</span>
        <h1>About this site</h1>
        <p className="lead">
          The companion site of the master&apos;s thesis <i>{SITE.title}</i> ({SITE.degree}, {SITE.university}), supervised by{" "}
          {SITE.supervisors.join(" and ")}. The thesis is {SITE.status}.
        </p>
      </section>

      <div className="grid gap-[var(--gap)] lg:grid-cols-2">
        <section className="panel p-4 flex flex-col gap-2 text-[14px]" aria-labelledby="what">
          <h2 id="what" className="text-[17px]">What is here</h2>
          <p>
            Every result file and stored episode behind the thesis tables, replayed in the browser; the exact solver and the engine ported to
            TypeScript; the prompt-optimisation runs; the full text of the thesis. Nothing on this site calls a language model: it is a static
            replay of the stored evidence.
          </p>
          <p>
            The framework that produced the results, with the evaluation platform that runs new experiments, is{" "}
            <a className="link" href={SITE.labRepo}>mt-ai-lab</a>. The site&apos;s own code is <a className="link" href={SITE.siteRepo}>mt-thesis</a>.
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            <a className="btn btn-sm" href="/thesis/thesis.pdf" download>Thesis PDF</a>
            <Link className="btn btn-sm" href="/thesis/">Read online</Link>
          </div>
        </section>

        <section className="panel p-4 flex flex-col gap-2 text-[14px]" aria-labelledby="imprint">
          <h2 id="imprint" className="text-[17px]">Imprint</h2>
          <p>Responsible for the content: {SITE.author}, student of {SITE.degree.replace("Master's thesis, ", "")} at {SITE.university}.</p>
          <p>Contact: <a className="link" href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
          <p className="muted">This is a private, non-commercial academic project. It is not an official publication of the university.</p>
        </section>

        <section className="panel p-4 flex flex-col gap-2 text-[14px]" aria-labelledby="privacy">
          <h2 id="privacy" className="text-[17px]">Privacy notice</h2>
          <p>
            <b>Hosting.</b> The site is a set of static files served by Vercel Inc. To deliver them, Vercel processes the technical data every
            web server receives (IP address, time, requested page, browser) and keeps it in short-lived logs for operation and security.
          </p>
          <p>
            <b>Visitor statistics.</b> Vercel Web Analytics counts page views without cookies. Each view is recorded anonymously, not tied to a
            person or an IP address, with its time, page, referrer, approximate location, operating system, browser and device type; visitors
            are told apart only by a hash of the request that is discarded after 24 hours.
          </p>
          <p>
            <b>In your browser.</b> The theme, the state of the side rail and the game&apos;s saves are stored in your browser&apos;s local storage
            and never leave your device.
          </p>
          <p className="muted">
            Legal basis: legitimate interest in running and improving the site (Art. 6(1)(f) GDPR). You have the rights of access, rectification,
            erasure, restriction and objection, and may complain to a data-protection supervisory authority. Contact as in the imprint.
          </p>
        </section>

        <section className="panel p-4 flex flex-col gap-2 text-[14px]" aria-labelledby="licences">
          <h2 id="licences" className="text-[17px]">Licences</h2>
          <ul className="m-0 pl-4 flex flex-col gap-1">
            <li>Code of this site: MIT.</li>
            <li>Result files, episode logs and text written for the thesis: CC BY 4.0.</li>
            <li>The 24-floor game, its tiles and data: BSD 3-Clause, ckcz123/mota-js.</li>
            <li>The single-floor test maps: from ckcz123/magic-tower-AI, which states no licence; shown with attribution.</li>
          </ul>
          <p className="muted">Details in <a className="link" href={`${SITE.siteRepo}/blob/main/THIRD_PARTY.md`}>THIRD_PARTY.md</a>.</p>
        </section>
      </div>

      <section className="flex flex-col gap-2" aria-labelledby="cite">
        <h2 id="cite">Cite</h2>
        <p className="text-[14px]">Siu, K. W. (2026). <i>{SITE.title}</i>. Master&apos;s thesis, {SITE.university}. Submitted, not yet graded.</p>
        <pre className="pre text-[12px]">{BIBTEX}</pre>
      </section>
    </div>
  );
}
