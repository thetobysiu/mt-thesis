# Magic Tower AI Lab · Thesis

The public companion site of the master's thesis
**From Reactive Control to Holistic Planning: Evolutionary Prompt Optimization for Hybrid Deterministic-Neural Agents in Long-Horizon Environments**
(King Wai Siu, M.Sc. Data Science, Leuphana University Lüneburg; supervised by Prof. Dr. Ricardo Usbeck and Prof. Dr. Burkhardt Funk).

A language model plays Magic Tower; a deterministic engine lists the legal actions with exact costs, the model
chooses one, and an exact solver knows each floor's optimum. The site shows the evidence behind the thesis:

- **Guided tour**: eleven short chapters from the game to the conclusion, each with something to try (the first decision
  of the simple floor as a question, the optimal route, the model's own input and reasoning, the exact solver, the result cells).
- **Journey**: how the agent and its evaluation were developed, with the readings that later turned out wrong and the
  validity incidents that exposed them.
- **Results**: every cell of the thesis tables (one configuration, one model, one floor, N episodes) with its settings,
  episodes and the command that re-runs it in [mt-ai-lab](https://github.com/thetobysiu/mt-ai-lab).
- **Episodes**: replays of all 1,905 stored episodes and tower runs named by a result file (harness smoke tests excluded):
  map, observation, reasoning and answer at every turn, with the state value after each turn on single floors.
- **Compare**: two episodes of one floor side by side, opened at the first turn where they act differently.
- **Floors, exact solver, play**: the 21 single floors with their exact optima and routes, the most common winning
  trajectory against the optimal route with the turn where it leaves it, the solver's search step by step in the
  browser, and every floor playable on a TypeScript port of the engine with solver hints.
- **Prompt optimisation**: every run of the thesis study candidate by candidate: prompt diff, teacher diagnosis,
  validator verdict, training episodes and held-out results.
- **Tower Game**: the original 24-floor game in English, starting on MT0, and every tower run with its replay.
- **Thesis**: the full text with cross-references, table captions linked to their result cells, glossary hovers,
  KaTeX math and the submitted PDF; the glossary; imprint, privacy notice and citation on the about page.

The site is a static export with no server and no model calls ([ADR 0001](docs/adr/0001-static-replay-only-site.md)).
The vocabulary follows the thesis glossary ([GLOSSARY.md](GLOSSARY.md)).

## Run it

```sh
npm ci
npm run dev          # http://localhost:3100
npm run build        # static site in out/
npm test             # data leak check, index consistency, replay of a stored episode
npm run typecheck && npm run lint
```

Node 20 or newer. `npm run smoke` checks the built `out/` (main pages, game files, every internal link).

## Deploy

Import the GitHub repository in Vercel and keep the detected Next.js preset; no build settings or environment
variables are needed. Vercel runs `npm install` and `npm run build`, and serves the static export. Everything the
build reads is committed (`public/data/`, `content/thesis/`, the game copy), so it needs neither mt-ai-lab nor the
thesis workspace. The sitemap and canonical URLs use `NEXT_PUBLIC_SITE_URL` if set, else Vercel's production
domain. Web Analytics is switched on in the Vercel project settings.

## Data

`public/data/` is generated from a checkout of mt-ai-lab and committed ([ADR 0003](docs/adr/0003-data-and-components-copied.md)):

```sh
MT_AI_LAB=../mt-ai-lab MT_PYTHON=<python that can import mt-ai-lab> npm run data
# optional: MT_SECRETS_ENV=<.env with the API keys>: fails if any key value would be published
```

| Output | Content |
|---|---|
| `public/data/episodes/<id>.json.gz` | every run log named by a result file, compacted: token-level reasoning chunks and prompt text repeated per turn are dropped; the observation, the full reasoning and the answer of each decision are kept |
| `public/data/episodes.json` | one line per episode (floor, model, outcome, turns, cells) |
| `public/data/index.json` | the thesis tables (Appendix D, Table D.4) with their cells, and every reliability cell |
| `public/data/results/…` | the result files themselves |

Local paths are reduced to file names and key-like fields are dropped; `tests/data.test.ts` fails if a path,
home directory or key pattern remains.

The thesis text, figures, glossary and PDF are copied from the thesis workspace into `content/thesis/`,
`public/thesis/` and `GLOSSARY.md`:

```sh
MT_THESIS=<thesis folder with chapters_v2/, chapters/bibliography.md, graphs/, figures/, latex/main.pdf> npm run thesis
```

The original game under `public/game/24/` is a copy of the 24-floor tower's runtime (no editor, saves or docs),
plus `play.html` and `en.js` (English text, direct start on MT0).

## Layout

```
app/            pages (App Router): /, /tour, /journey, /results, /episodes, /compare, /floors, /solver, /play,
                /prompt-optimisation, /tower, /thesis, /glossary, /about
components/     FloorMap (copied from mt-ai-lab), EpisodeViewer, CompareView, SolverExplorer, Player, GepaRunView, tour/…
lib/            run.ts (replay core), engine/ (TypeScript port of the engine), solver/ (exact solver, worker), gepa.ts,
                thesis.ts (Markdown + KaTeX), data loaders
scripts/        build-data.ts, build-floors.ts (Java optima), build-solutions.ts (routes, state values), build-thesis.ts
tests/          vitest (the solver test searches the simple floor only)
docs/adr/       architecture decisions
```

## Licence

Code MIT ([LICENSE](LICENSE)); texts and data CC BY 4.0 ([LICENSE-DATA](LICENSE-DATA));
game tiles BSD-3 from mota-js and the published solver's test maps ([THIRD_PARTY.md](THIRD_PARTY.md)).
