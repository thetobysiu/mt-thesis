// The journey: how the agent and its evaluation were developed, from single scored episodes to the final configuration.
// Sources: Appendix E of the thesis (validity incidents), the development history in mt-ai-lab (docs/development-history.md,
// former Appendix D, with its table of superseded readings) and the result files linked from each milestone.
export type JourneyLink = { cell?: string; href?: string; label: string };
export type Milestone = {
  date: string; title: string; body: string;
  then?: string; now?: string;        // a reading at the time and the fact that replaced it
  links?: JourneyLink[];
  kind?: "finding" | "incident" | "change";
};
export type Phase = { id: string; title: string; span: string; intro: string; items: Milestone[] };

export const JOURNEY: Phase[] = [
  {
    id: "single-episodes", title: "Single episodes", span: "April – July 2026",
    intro: "The first experiments scored one episode per configuration with a composite score. Several of their readings did not survive repetition; they are kept here because they shaped what was built next.",
    items: [
      {
        date: "April 2026", title: "A first baseline on MT3", kind: "finding",
        body: "On the third floor of the tower, the rule-based heuristic scored 0.875 to 0.924, the reactive agent with Qwen3-30B 0.379, and a single coordinate plan made in one call 0.875.",
        then: "Per-turn reasoning cannot hold a floor-wide strategy; a plan made once can.",
        now: "On the simple floor, reactive control wins 14 of 20 episodes against 1 of 70 for committed plans, and most turns of the early one-call plans had fallen back to the heuristic.",
      },
      {
        date: "April 2026", title: "Prompt optimisation: +146 %", kind: "finding",
        body: "The first GEPA run raised the composite score on MT3 from 0.40 to 0.98, with every candidate scored on one episode.",
        then: "Evolved prompts carry durable strategic principles.",
        now: "Under repeated, paired evaluation with the annotations present, evolved prompts stay within the noise floor.",
        links: [{ href: "/tour/prompt-optimisation/", label: "tour: prompt optimisation" }],
      },
      {
        date: "April 2026", title: "A scorer with three bugs", kind: "incident",
        body: "A perfect score of 1.0000 turned out to be a false positive caused by three errors in the scorer. Results from before the correction are not comparable with later ones.",
      },
      {
        date: "April – July 2026", title: "Bigger models, higher scores", kind: "finding",
        body: "On MT3, Qwen3-30B scored 0.379 while 70B and 235B models scored 0.992.",
        then: "A capability threshold lies between 30 and 70 billion parameters, and mixture-of-experts models beat dense ones.",
        now: "Not reproducible: three of the models were later removed from the inference service. In the repeated runs, model size alone did not order the results.",
      },
      {
        date: "April – July 2026", title: "A published solver as the reference", kind: "change",
        body: "The breadth-first solver released with the single-floor test maps gave the targets: 13 HP on the simple floor, 22 HP on the complex floor.",
        then: "Episodes that end the complex floor at 22 HP are optimal.",
        now: "The exact optimum of the complex floor is 68 HP (see 29 September).",
      },
      {
        date: "April – July 2026", title: "Without the engine's action list, plans collapse", kind: "finding",
        body: "Agents that saw only the map and had to name their own targets produced plans that broke down. Enumerating the legal actions, with paths and costs computed by the engine, became the core of the design.",
        links: [{ href: "/tour/observation/", label: "tour: what the model sees" }],
      },
      {
        date: "1 June 2026", title: "A loss and a win on identical inputs", kind: "finding",
        body: "Qwen3.5-397B played the simple floor twice within an hour on identical inputs at temperature 0: the first episode lost, the second killed the boss at 2 HP. One episode per configuration could not tell a better prompt from luck, and from then on every configuration was repeated.",
      },
    ],
  },
  {
    id: "repeated-episodes", title: "Repeated episodes", span: "20 – 23 September 2026",
    intro: "The first campaign of repeated episodes, with success rates and Wilson intervals, turned up six threats to validity within four days.",
    items: [
      {
        date: "20 September", title: "The first 20 repeated episodes win nothing", kind: "incident",
        body: "An audit had replaced the placeholder effCost=None in the observation with a number, assuming a formatting error. Two models then won 0 of 20 episodes. The stored reasoning had read the placeholder as \"not recommended yet\"; with it restored, they won 5 of 10 each. A regression test now pins the observation text byte for byte.",
      },
      {
        date: "20 – 21 September", title: "Hidden factors", kind: "incident",
        body: "Two evaluation loops applied different overrides under the same name, a validation script mapped the simple floor to the prompt written for floors with shops, and a stale process kept running an obsolete configuration. Every result file now records its loop, prompt and settings.",
      },
      {
        date: "21 September", title: "Models leave the service", kind: "incident",
        body: "Three models of the early experiments were removed from the inference service. The first complex-floor wins could no longer be reproduced; the successor model won 0 of 10 with the prompt on which its predecessor had won 2 of 18.",
      },
      {
        date: "21 – 23 September", title: "A tower engine", kind: "change",
        body: "Stairs, shops and returns to earlier floors turned the single-floor engine into a tower engine. The heuristic climbs to MT8 and stops before monsters it cannot afford.",
        links: [{ cell: "tower_MT0-MT23w_heuristic_final7", label: "heuristic tower run" }],
      },
      {
        date: "22 – 23 September", title: "One survival rule", kind: "finding",
        body: "With the prompt that lists the solver's route, episodes on the complex floor kept to the listed fights even when the only one left was a lethal boss fight. One added survival rule took Qwen3.6-35B from 0 of 10 to 4 of 5 with that prompt.",
        links: [{ cell: "complex_qwen3.6-35b_reactive_raw_survival", label: "survival rule" }],
      },
    ],
  },
  {
    id: "whose-decision", title: "Whose decision?", span: "24 – 27 September 2026",
    intro: "Comparing the model's answer with the executed action in every stored log changed the question from 'which prompt wins' to 'what does the model need to see'.",
    items: [
      {
        date: "24 September", title: "Silent overrides in every early win", kind: "incident",
        body: "In 94 turns of 68 stored episodes, the engine had executed a different action from the one the model chose, without logging it. All 21 stored simple-floor wins contained such a replacement, 17 of them at turn 9. Reproduced deliberately with logging, the configuration won 2 of 4; with mechanical overrides only, 0 of 5.",
        links: [{ cell: "simple_qwen3.5-397b_legacy_strategic_control", label: "override on" }, { cell: "simple_qwen3.5-397b_basic_mechanical_override", label: "mechanical only" }, { href: "/tour/overrides/", label: "tour: hidden overrides" }],
      },
      {
        date: "24 September", title: "One ordering call worth 12 HP", kind: "finding",
        body: "A won and a lost episode fought the same monsters and ended with the same stats; they differed in one order. The observation had shown what the stat items behind a door would save, but not what reaching them cost. Two lines that state both sides, the net stat-route line and the fight-order line, took the same model and prompt from 0 of 5 to 10 of 10.",
        links: [{ cell: "simple_qwen3.5-397b_basic_order_aware", label: "two new lines" }, { href: "/tour/repairs/", label: "tour: one-sided annotations" }],
      },
      {
        date: "25 September", title: "One-sided annotations as a class", kind: "finding",
        body: "The failures of an overnight batch of eleven cells had one cause in common: each decisive annotation stated a value, a saving, an efficiency, a deficit or a count without its counterpart. A further incident showed that switching the overrides off had also hidden the fight annotations, so overrides and annotations became separate settings.",
      },
      {
        date: "26 September", title: "Keys were priced at nothing", kind: "change",
        body: "Every remaining strategic failure was a key failure: keys were the one resource the engine did not price. A key budget in the state block and a key line on every door brought Qwen3.5-397B back to 10 of 10.",
        links: [{ cell: "simple_qwen3.5-397b_basic_k1k2", label: "key lines" }],
      },
      {
        date: "26 – 27 September", title: "Less context, better decisions", kind: "finding",
        body: "The six previous decisions made up about three quarters of every request. Removing them raised Qwen3.6-35B from 1 of 5 to 10 of 10 on the same annotations.",
        links: [{ cell: "simple_qwen3.6-35b_basic_k1k2_16k", label: "with history" }, { cell: "simple_qwen3.6-35b_basic_k1k2_16k_hist0", label: "without" }],
      },
      {
        date: "27 September", title: "The final configuration", kind: "change",
        body: "A positive order line (\"take this fight before …\") was followed as an instruction even for a fight that cost 46.5 % of the HP. With a 40 % guard on it, Qwen3.5-397B won 10 of 10 and Qwen3.6-35B 7 of 10: the final configuration of every later single-floor experiment.",
        links: [{ cell: "simple_qwen3.5-397b_final2_la3", label: "Qwen3.5-397B" }, { cell: "simple_qwen3.6-35b_final2_la3", label: "Qwen3.6-35B" }],
      },
    ],
  },
  {
    id: "prompts-optimum-plans", title: "Prompts, the optimum and plans", span: "28 – 29 September 2026",
    intro: "With the observation settled, the two other research questions were tested under the same protocol, and the reference itself was checked.",
    items: [
      {
        date: "28 September", title: "A pre-registered prompt-optimisation study", kind: "finding",
        body: "Hypotheses stated in advance; evolved, hand-written and rules-only prompts paired on thirteen held-out floors, with the noise floor measured directly. With the annotations, the evolved prompts stayed within it. Without them, the evolved prompts did not make up for the missing annotations; a later paired confirmation found one narrow gain.",
        links: [{ href: "/tour/prompt-optimisation/", label: "tour: prompt optimisation" }],
      },
      {
        date: "29 September", title: "The published optimum was wrong", kind: "incident",
        body: "While building hand-designed floors, an exact re-solve found that the published solver keeps the first state it reaches for each set of cleared obstacles instead of the best. The complex floor's optimum is 68 HP, not 22; every claim of an optimal complex-floor win was an artefact and was re-expressed.",
        links: [{ href: "/floors/complex/", label: "complex floor" }, { href: "/tour/solver/", label: "tour: the exact solver" }],
      },
      {
        date: "29 September", title: "Hand-designed floors", kind: "change",
        body: "Four floors with a single winning set each, which the heuristic fails and random play never wins in 500 games. They separate an agent that reads the annotations from one that does not.",
        links: [{ href: "/floors/hand01/", label: "hand01" }, { href: "/play/hand01/", label: "play hand01" }],
      },
      {
        date: "29 September", title: "Committed plans", kind: "finding",
        body: "The planning study let the model commit to 2, 3 or 5 actions, a whole-floor plan or a single plan. Four defects of the planning loop were found and fixed on the way. In the final count, committed plans won 1 of 70 simple-floor episodes against 14 of 20 for reactive play.",
        links: [{ href: "/tour/planning-and-tower/", label: "tour: planning and the tower" }],
      },
    ],
  },
  {
    id: "tower", title: "The tower", span: "30 September – 5 October 2026",
    intro: "The tower tests the same agent over 24 floors with shops, keys carried between floors and scripted events.",
    items: [
      {
        date: "30 September – 1 October", title: "Every object on every visited floor", kind: "change",
        body: "The second tower observation offered every object on every visited floor, not only the current one. The runs reached MT8, where the Red Bats could not be afforded.",
        links: [{ cell: "tower_qwen3.5-397b_final3_reactive", label: "Qwen3.5-397B" }, { cell: "tower_deepseek-v4-flash_final3_reactive", label: "DeepSeek-V4-Flash" }],
      },
      {
        date: "1 – 2 October", title: "A threshold set by replay", kind: "finding",
        body: "A replayed MT3 decision showed that Qwen3.5-397B declined the fight an expert takes in three of six calls at a 40 % limit on HP per fight, and in none at 60 %. The tower prompt's limit rose to 60 %, and an engine override that enforced 40 % was removed.",
      },
      {
        date: "3 – 4 October", title: "Two engine defects on the upper floors", kind: "incident",
        body: "Pricing every combination of shop purchases slowed one run to about 80 minutes per turn; the line was rewritten exactly. Two staircases that the game hides until a scripted event had been shown from the start, which overstated one run by three floors.",
      },
      {
        date: "3 – 5 October", title: "The final tower observation", kind: "finding",
        body: "Qwen3.5-397B reached MT18, DeepSeek-V4-Flash MT17, Qwen3.6-35B MT16 and Mistral Medium 3.5 MT8, the heuristic's floor. A stored run of Qwen3.5-397B, resumed on MT18 with blue keys for sale as in the original game, reached the normal ending on MT21.",
        links: [{ cell: "tower_qwen3.5-397b_final11_reactive", label: "Qwen3.5-397B" }, { cell: "tower_qwen3.5-397b_final11_resume_blue", label: "resumed run" }],
      },
      {
        date: "5 October", title: "The losing decision, located exactly", kind: "incident",
        body: "The complex-floor failures had been blamed on a conspicuous trap door. The exact state value of every state of every stored episode showed that all 30 had been lost earlier, 29 of them at the same cheap fight taken before the stats that make it nearly free. The experiments closed the same day.",
        links: [{ href: "/floors/complex/", label: "complex floor" }],
      },
    ],
  },
  {
    id: "writing", title: "Writing it down", span: "5 – 18 October 2026",
    intro: "",
    items: [
      {
        date: "11 – 18 October", title: "From ledger to thesis", kind: "change",
        body: "The thesis was cut from 319 pages to just over 200: the development history moved to the framework's documentation, the tower designs were reduced to three observations, and the simple floor became the running example. Then it was submitted.",
        links: [{ href: "/tour/", label: "the guided tour" }],
      },
    ],
  },
];
