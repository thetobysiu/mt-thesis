import type { Metadata } from "next";
import { GlossaryList } from "@/components/GlossaryList";
import { getGlossary } from "@/lib/thesis";

export const metadata: Metadata = {
  title: "Glossary",
  description: "The terms of the thesis as it uses them, with the words it avoids.",
};

export default function GlossaryPage() {
  const terms = getGlossary();
  return (
    <div className="page">
      <section className="flex flex-col gap-3">
        <span className="eyebrow">Read</span>
        <h1>Glossary</h1>
        <p className="lead">
          {terms.length} terms as the thesis uses them. Each entry also names the words the thesis avoids for the same idea, so that an
          episode is never called a run and a solver is never just &quot;the BFS&quot;.
        </p>
      </section>
      <GlossaryList terms={terms} />
    </div>
  );
}
