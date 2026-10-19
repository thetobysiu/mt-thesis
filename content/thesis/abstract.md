# Abstract

Large language models are increasingly used as agents that act over many steps.
They plan poorly, however, when decisions are irreversible and their consequences appear late.
It is unclear whether such an agent gains most from a better observation, a better prompt or a longer plan.
This thesis studies that question for a hybrid agent in which a deterministic engine and a language model share the work.

The testbed is Magic Tower, a deterministic game decided by the order of fights, doors and items.
The engine lists the legal actions with exact costs and effects, the model chooses one, and an exact solver gives each single floor's optimum.
Four models play single floors and the 24-floor tower in repeated episodes and runs against a rule-based heuristic; prompt optimisation and committed plans are also tested with two further models.

With the engine's annotations, Qwen3.5-397B wins all 15 episodes on the floor used for development (ten earlier and five in a re-run), each at 2 hit points (HP) against an optimum of 13.
The heuristic and the model without annotations fail.
With model and prompt fixed, two annotation lines that state both sides of a trade-off raised its success from 0 of 5 episodes to 10 of 10.
No model wins, from a general prompt, the floors whose decisive choice is a long order of doors and fights.
On the tower, whose normal ending is on floor 21, the highest floor reached rose from 7 to 18 across three successive configurations of observation, engine and prompt; the heuristic reaches floor 8.
Reflective prompt optimisation in the style of GEPA rediscovers rules that follow from the combat formula and the floor structure, rarely the limit on HP spent per fight or the scarcity of keys, and with the annotations present its gains stay within the variation between repeated evaluations.
Committed plans won 1 of 70 episodes on the same floor against 14 of 20 for reactive play; on single floors they matched reactive play only where a published solver's route was in the prompt.

For agents in long-horizon tasks, strategic knowledge is better placed in the engine's observation than in the prompt, and on single floors committed plans pay off only when the order is already known.
Evaluations of such agents need repeated episodes and logged engine interventions: here, unlogged overrides were part of every early win on the floor used for development, and a published solver reported a wrong optimum.
The framework and its evaluation platform are open source.

**Keywords:** LLM Agents; Hybrid Deterministic-Neural Agents; Observation Design; Long-Horizon Planning; Evolutionary Prompt Optimisation; GEPA; Reasoning Models; Magic Tower
