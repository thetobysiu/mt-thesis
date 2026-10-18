# Magic Tower AI Lab · Thesis

The public companion site of the master's thesis
**From Reactive Control to Holistic Planning: Evolutionary Prompt Optimization for Hybrid Deterministic-Neural Agents in Long-Horizon Environments**
(King Wai Siu, M.Sc. Data Science, Leuphana University Lüneburg; supervised by Prof. Dr. Ricardo Usbeck and Prof. Dr. Burkhardt Funk).

A language model plays Magic Tower; a deterministic engine lists the legal actions with exact costs, the model
chooses one, and an exact solver knows each floor's optimum. The site shows the evidence behind the thesis:

- **Results**: every cell of the thesis tables (one configuration, one model, one floor, N episodes) with its settings,
  episodes and the command that re-runs it in [mt-ai-lab](https://github.com/thetobysiu/mt-ai-lab).
- **Episodes**: replays of all 1,905 stored episodes and tower runs named by a result file (harness smoke tests excluded):
  map, observation, reasoning and answer at every turn.

Still to come (in this order): the TypeScript engine and exact solver with single-floor play, the guided tour and the
development journey, the prompt-optimisation runs, the tower page with the original game, the thesis chapters and the glossary.

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

Node 20 or newer.

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

## Layout

```
app/            pages (App Router): /, /results, /results/[cell], /episodes, /episodes/[id]
components/     FloorMap (copied from mt-ai-lab), EpisodeViewer, RichText (observation/reasoning), …
lib/            run.ts (replay core), data loaders, formatting
scripts/        build-data.ts
tests/          vitest
docs/adr/       architecture decisions
```

## Licence

Code MIT ([LICENSE](LICENSE)); texts and data CC BY 4.0 ([LICENSE-DATA](LICENSE-DATA));
game tiles BSD-3 from mota-js and the published solver's test maps ([THIRD_PARTY.md](THIRD_PARTY.md)).
