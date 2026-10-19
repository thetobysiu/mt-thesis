// The guided tour: eleven short chapters that follow the thesis from the game to the conclusion.
export type TourChapter = { slug: string; title: string; question: string; thesis: string };

export const TOUR: TourChapter[] = [
  { slug: "game", title: "The game", question: "What decides a floor of Magic Tower?", thesis: "Sections 4.1–4.2" },
  { slug: "one-decision", title: "One decision", question: "Which of four plausible first moves keeps the floor winnable?", thesis: "Sections 4.5.1, 6.4" },
  { slug: "optimal-route", title: "The optimal route", question: "How little room for error does the simple floor leave?", thesis: "Section 4.5.1, Table 4.4" },
  { slug: "observation", title: "What the model sees", question: "How do the engine and the model share the work?", thesis: "Sections 5.1–5.3, Listing 5.1" },
  { slug: "solver", title: "The exact solver", question: "Where does the optimum come from, and why was the published one wrong?", thesis: "Section 4.6" },
  { slug: "results", title: "The main result", question: "Does the hybrid agent win where the heuristic and the bare model do not?", thesis: "Sections 6.2–6.3 (RQ1)" },
  { slug: "overrides", title: "Hidden overrides", question: "Who really won the early episodes?", thesis: "Section 6.4.1, Appendix E" },
  { slug: "repairs", title: "One-sided annotations", question: "What took the same model and prompt from 0 of 5 to 10 of 10?", thesis: "Sections 6.4.2–6.4.4" },
  { slug: "decisive-turns", title: "Where episodes are lost", question: "At which turn does a losing episode leave the winning one, and how far ahead must the engine look?", thesis: "Sections 6.3, 6.4" },
  { slug: "prompt-optimisation", title: "Prompt optimisation", question: "Does evolving the prompt help once the observation is good?", thesis: "Section 6.5 (RQ2)" },
  { slug: "planning-and-tower", title: "Planning and the tower", question: "Do longer plans help, and how far up the 24-floor tower does the agent get?", thesis: "Sections 6.6–6.7, 7.5 (RQ3)" },
];

export const tourIndex = (slug: string) => TOUR.findIndex((c) => c.slug === slug);
