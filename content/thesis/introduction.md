# Chapter 1: Introduction

Large language models (LLMs) can act as agents: systems that observe an environment, reason about it and choose actions over many steps.
Frameworks such as ReAct (Yao, Zhao et al., 2023) and Reflexion (Shinn et al., 2023) let a model act in text games, on websites and in programming tasks.
Benchmarks measure how far such agents get (Liu, X. et al., 2024; Zhou, S. et al., 2024; Paglieri et al., 2025).
Many of these tasks are short, and many of their environments forgive mistakes: a wrong click can be undone, a failed attempt repeated.

Other planning problems are different.
When resources are consumed irreversibly, a decision at the fifth step can make the fortieth step impossible, and the quality of a decision is visible only much later.
In classical planning domains, LLMs that plan on their own produce few valid plans (Valmeekam et al., 2023).
This has led to designs that pair the model with components that compute exactly, such as classical planners or verifiers (Liu, B. et al., 2023; Kambhampati et al., 2024).
Such pairings raise three questions.
The first is what the exact components contribute.
The second, whether optimising the prompt automatically from task outcomes improves the agent, follows because a hosted model can only be changed through its input.
The third concerns the planning horizon: an agent can decide one action at a time, reacting to every new state, or commit to a longer plan with fewer model calls.
It is not clear which is better when the consequences of actions unfold over many steps.

Answering these questions requires an environment in which the quality of every decision can be measured exactly.
Magic Tower, a grid-based puzzle role-playing game, offers such an environment.
It is fully deterministic, and every resource in it is spent irreversibly.
The order in which fights, doors and items are taken decides whether a floor can be won and with how many hit points (HP) remaining.
Because the game is deterministic, an exact search can compute the best possible outcome of a single floor.
Every episode on such a floor, one complete play from start to end, can be compared with that optimum.
Studies of LLM agents in games mostly use stochastic environments without such an optimum.
Prompt optimisers have been evaluated on short tasks with cheap, repeatable scores (Chapter 3).

This thesis investigates a hybrid deterministic-neural agent for Magic Tower.
A game engine enumerates the legal actions and computes the exact cost of every fight and what every action unlocks.
It writes these facts into the model's input as an annotated, numbered list of actions; the model reads the list, reasons, and chooses one action by its number.
On this agent, the thesis measures the contribution of the engine's annotations, of evolutionary prompt optimisation and of the planning horizon (Section 1.1).
Every single-floor configuration is evaluated over repeated episodes.
The success rate is reported with a confidence interval and the final HP relative to the exact optimum; tower runs, which climb the game's 24 floors, are reported by the highest floor reached.
The code and the evaluation platform are publicly available.[^repo]

## 1.1 Research Questions

The work in this thesis is organised around three research questions:

- **RQ1:** How does engine grounding, meaning enumerated actions, exact costs and lookahead annotations, influence the success of an LLM agent on long-horizon floors, relative to a rule-based heuristic and to the same model without annotations?
- **RQ2:** When does evolutionary prompt optimisation improve such an agent, relative to the hand-written single-floor prompt and a prompt that states only the rules, and how does this depend on the observation the agent receives?
- **RQ3:** How does the planning horizon, from one action per model call to a single plan for the whole floor, affect success and cost on floors of different structure?

The hypotheses use the following terms, which later chapters define in full.
The *simple floor* is an 11 × 11 boss floor from the test maps of a published solver, on which the observation was developed and which serves as the running example; its optimal route ends with 13 HP.
The *final configuration* is the setting that every single-floor episode uses unless an experiment states otherwise; it shows all annotations.
The engine's *assists* collect items and keys and take fights that cost 0 HP automatically.
A *mechanical override* replaces a choice that cannot be executed usefully: a door that leads nowhere, an unwinnable fight or a lethal fight.
The *rule-based heuristic* is an agent that acts on the same engine output by fixed rules, without a language model.
A *strategic override* replaces the model's choice by the judgement of the rule-based heuristic.
The *bare observation* keeps the enumerated actions and exact costs but removes all annotations.
The *rules-only prompt* states only the game rules, the goal and the answer format, and an *evolved prompt* is the best prompt that prompt optimisation produces from it.

The following hypotheses guide the analysis:

- **HA (RQ1):** With the engine's annotations, its assists and only mechanical overrides, the agent wins floors that the rule-based heuristic and the same model without annotations do not win.
  *Test:* success rates on the simple floor for the final configuration, the bare observation and the heuristic (Sections 6.2 and 6.3).
- **HB (RQ2):** When the observation already carries the annotations, an evolved prompt does not exceed the single-floor prompt or the rules-only prompt by more than the variation between two evaluations of the same prompt.
  *Test:* paired comparison on thirteen held-out floors, with the noise floor measured directly (Section 6.5).
- **HC (RQ3):** Committing to several actions per call lowers the number of model calls but also the success rate when the order of actions must be derived from annotations that appear state by state.
  *Test:* each planning mode against the reactive mode of the same model on the same floor (Section 6.6).

Three rival explanations could account for the results instead and are examined in Section 7.2:

- **R1:** apparent effects are caused by the non-determinism of the inference service, which is tested by repeating every configuration;
- **R2:** apparent gains of prompt optimisation are the luck of single episodes, which is tested by paired evaluation on held-out floors;
- **R3:** the engine's strategic overrides, not the model, produce the wins, which is tested by comparing the model's choice with the executed action in every stored episode and by logging every override in the final configuration.

## 1.2 Contributions

Based on these questions, the thesis makes three main contributions.

First, it presents an engine observation layer for LLM agents and identifies a class of defects in such layers, the *one-sided annotation*.
Such an annotation shows a saving without the cost of reaching it, a value without its cost (potions counted as fight value), an efficiency without its affordability, a deficit without its scope, or a count without its multiplicity.
In each case, the model's decision followed the annotation correctly and was wrong.
Repairing these annotations in the engine, with model and prompt unchanged, took Qwen3.5-397B on the simple floor from 0/5 to 10/10 [0.72, 1.00] wins (Table 6.5), with no strategic override in any win.
With the same observation, DeepSeek-V4-Flash wins 9 of 10 [0.60, 0.98] episodes on two hand-designed floors, against 0 of 10 without the annotations.

Second, it provides a repeated-episode evaluation protocol for LLM agents and reports six threats to the validity of its own measurements that the protocol exposed (Section 7.3; eighteen dated incidents in Appendix E).
Among them are unlogged strategic overrides of the engine, present in all 21 simple-floor wins recorded before overrides were logged.
Replacing a single placeholder value in the observation with the corresponding number lowered the success rate from 5 of 10 episodes per model to 0 of 20 across two models.
A published reference solver reported 22 HP as the optimum of the complex floor, a second test floor, whose exact optimum is 68 HP.
The protocol, the exact solver and a web platform that runs and replays every experiment are released with the thesis.

Third, it reports negative and boundary results.
The hypotheses of the prompt-optimisation study, its paired confirmation and the predictions for the optimiser runs on the complex floor were stated in advance.
Prompt optimisation stays within the measured noise floor when the annotations are present and yields one narrow confirmed gain when they are withheld.
With a reasoning model, a single-lineage and a population-based optimisation loop both win fewer held-out episodes than the rules-only prompt (26 and 24 against 32 of 39).
Floors whose decisive choice is an order of several doors and fights are not won from a general prompt.
With the published solver's route in the prompt, three of four models win 4 of 5, 3 of 5 and 4 of 10 episodes on the complex floor.
The fourth wins none.
On the simple floor, Qwen3.5-397B and DeepSeek-V4-Flash win 14 of 20 reactive episodes, which decide one action per call.
They win 1 of 70 committed-plan episodes, including plans whose length the model chose itself.
On single floors, committed plans reach the same success with about a quarter to a ninth of the model calls only where the solver's route is listed in the prompt.
On the tower, with the second tower observation, commit-$k$ and re-planned long plans reach the same floor as reactive play with 58 to 72 calls instead of 86.

![Overview of the hybrid agent](/thesis/img/1.1.jpg)

**Figure 1.1:** The hybrid agent. The engine reads the floor and writes the annotated action list (RQ1); the model receives it with the system prompt (RQ2), answers with an action number and commits to one or $k$ actions per call (RQ3); the engine executes the chosen action.

## 1.3 Structure of the Thesis

The remainder of this thesis is structured as follows.
Chapter 2 introduces the foundations: language models and transformers, reasoning models and decoding, prompting, LLM agents and the planning horizon, the optimisation of weights and prompts, and state-space search.
Chapter 3 reviews related work on LLM agents in games, the planning horizon, prompt optimisation, the reliability of LLM evaluations and symbolic grounding.
It closes by positioning the thesis among the closest works.
Chapter 4 describes Magic Tower, defines the task formally, presents the floors used in the experiments and the exact solver that provides their optimum.
Chapter 5 describes the hybrid agent, its observation, its two prompts, its planning modes, the prompt optimisation loops and the measures.
Chapter 6 reports the experiments.
Chapter 7 discusses the results comparison by comparison, examines the rival explanations and draws methodological lessons.
It then states the limitations, answers the research questions, proposes how the work should be continued and concludes.
Appendices A to C contain the prompts and the observation, the combat rules, the exact solver and the floors, and the evaluation platform.
Appendices D to G list the configuration and result files, the validity incidents, the prompt lineage and further reasoning excerpts.

[^repo]: https://github.com/thetobysiu/mt-ai-lab
