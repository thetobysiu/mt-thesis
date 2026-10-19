# Chapter 3: Related Work

This chapter reviews the work on which the thesis builds and identifies the gap it addresses.
Section 3.1 describes how the literature was collected.
Sections 3.2 to 3.6 cover five themes: LLM agents in games, the planning horizon, automatic prompt optimisation, the reliability of LLM evaluations, and the grounding of LLMs in symbolic components.
Section 3.7 positions the thesis against the closest works.
Each theme follows the same pattern: what a line of work showed, what it assumed, and what it leaves open for the setting studied here.

## 3.1 Literature Search

The literature was collected in three steps.
First, backward and forward citation search started from four anchor works: ReAct (Yao, Zhao et al., 2023), GEPA (Agrawal et al., 2025), the LLM-Modulo position paper (Kambhampati et al., 2024) and the BALROG game benchmark (Paglieri et al., 2025).
Second, two AI-assisted deep-research tools were given the same written brief of eleven questions.
The questions covered GEPA and its follow-ups, the comparison of prompt optimisers, prompt sensitivity, the non-determinism of served models, evaluation methodology, grounding in symbolic components, the planning horizon, risk posture, reasoning faithfulness, game benchmarks and model scale.
The keywords of the brief included reflective prompt evolution, automatic prompt optimisation, format sensitivity and non-determinism at temperature 0.
Further keywords were pass^k, binomial confidence intervals, LLM-Modulo, plan-and-execute, replanning, risk aversion of LLM agents, chain-of-thought faithfulness and LLM game benchmarks.
Third, every returned item was resolved on arxiv.org or the publisher's page before it was cited.
Items whose identifier resolved to a different paper, or whose content differed from the tool's summary, were rejected.
Inclusion required a peer-reviewed publication or a preprint from 2023 to 2026, or an earlier foundational work, and relevance to at least one of the eleven questions.
Grey literature is cited in two places, each marked as such.
These are the one prior work on the game that the search found (Weng, 2025) and the explanation of inference non-determinism (He and Thinking Machines Lab, 2025).
The chapter cites 73 works.
The verification records are kept with the thesis materials; the use of AI tools in this search is described in the Note on AI Usage.

## 3.2 LLM Agents in Games and Long-Horizon Environments

Games are long-standing AI benchmarks.
Deep reinforcement learning reached human-level play on Atari games (Mnih et al., 2015), and self-play with tree search surpassed human champions in Go (Silver et al., 2016; Silver et al., 2017).
These agents learn a policy over millions of episodes.
LLM agents, by contrast, act from a prompt without game-specific training, and a new generation of benchmarks measures them.

Voyager (Wang, G. et al., 2023) plays Minecraft with an automatic curriculum and a growing library of code skills and obtains 3.3 times more unique items than earlier agents.
Its environment is open-ended and stochastic, which makes it difficult to separate the quality of a plan from the luck of exploration.
The NetHack Learning Environment (Küttler et al., 2020), MiniHack (Samvelyan et al., 2021), Crafter (Hafner, 2022) and TextWorld (Côté et al., 2019) provide roguelike, survival and text-game settings.
NetPlay, introduced by its authors as the first zero-shot LLM agent for NetHack, performs best with detailed context and struggles when feedback is missing (Jeurissen et al., 2024).
BALROG collects several of these environments into one benchmark and finds that current LLMs achieve only partial success even at moderate difficulty (Paglieri et al., 2025).
SmartPlay isolates agent capabilities in six games (Wu et al., 2023), and AgentBoard adds progress-rate metrics (Ma et al., 2024).
Orak evaluates twelve commercial video games (Park et al., 2025), and TextArena ranks agents on 57 competitive text games (Guertler et al., 2025).
In VideoGameBench, the best vision-language models complete under 1 % of the benchmark from raw pixels (Zhang et al., 2025).
Agentick provides 37 procedurally generated tasks with oracle reference policies (Castanyer et al., 2026).
In Agentick's 90,000 episodes, a reasoning harness multiplies LLM performance by a factor of 3 to 10, and ASCII observations outperform natural-language ones.
These benchmarks measure what current agents can do across many environments.
Most of them are stochastic, and none provides a proven optimum for each episode against which the quality of a completed run can be measured.
Agentick's oracle policies are the strongest reference behaviours available, and its authors state that they are not optimal on every task.

Two studies are closer to the setting of this thesis.
HexMachina evolves a compiled Settlers of Catan player through code refinement between games and reaches a 54 % win rate against the strongest hand-written baseline (Belle et al., 2025).
The persistent artefact is a program, and the game is stochastic and multi-player.
The search of Section 3.1 found one prior LLM study of a Magic Tower style game, an unpublished undergraduate research report (Weng, 2025).
It uses a variant with probabilistic combat and free movement.
Humans win 60 to 100 % of games, and Gemini-2.5-Pro wins 40 to 50 % at the hard level; each configuration is run once.
Neither work studies a deterministic game in which every outcome can be traced to a decision and compared with an exact optimum.

A further line of work examines the failure that such games isolate: committing scarce, irreversible resources over a long horizon.
In EnterpriseArena, 23 LLMs act as a company's chief financial officer over 132 simulated months; only 15.4 % of trials survive, and larger models do not reliably outperform smaller ones (Han et al., 2026).
BAGEN finds frontier models over-optimistic about budgets: they keep spending on tasks that cannot succeed (Lin et al., 2026).
Studies of risk posture disagree: Jia et al. (2024) find loss aversion in LLM choices, while Hartley et al. (2025) find GPT-4o close to risk-neutral.
Wang, Y. (2026) measures the gap between an agent's stated rule and its action in poker and finds that misapplications of the agent's own rule are risk-averse in 99.5 % of cases.
These studies observe resource failures in simulated economies or card games with stochastic outcomes.
In a deterministic game, the same failure can be located at a specific decision and its cost measured exactly, which the thesis does in Chapter 6.

## 3.3 Planning Horizon

Valmeekam et al. (2023) showed that LLMs are poor autonomous planners: in classical planning domains, the best model (GPT-4) generated valid plans in about 12 % of problems on average.
Two responses followed.
The first adds search around the model.
Tree of Thoughts searches over partial solutions (Yao, Yu et al., 2023), and Reasoning via Planning uses the LLM as a world model inside Monte Carlo tree search (Hao et al., 2023).
Language Agent Tree Search applies the same idea to agent actions (Zhou, A. et al., 2023).
These methods improve results at the price of many model calls per decision.
The second response varies the planning horizon, the number of actions the model commits to per call (Section 2.4.1).
ReAct interleaves one reasoning step with one action (Yao, Zhao et al., 2023).
Plan-and-Solve asks for a plan first and then executes it (Wang, L. et al., 2023).
ReWOO separates a planner that writes the whole plan in one call from a worker and reports a five-fold saving in tokens over ReAct on HotpotQA (Xu et al., 2023).
Its authors also name the limit of this design: where little is known about the environment in advance, the planner has to enumerate all plans that could lead to the goal.
DEPS and ADaPT replan only when execution fails, and ADaPT argues that a full decomposition up front is neither necessary nor always optimal (Wang, Z. et al., 2023; Prasad et al., 2024).
Robotics work shows the same design space: Inner Monologue feeds environment feedback into each planning step (Huang, W. et al., 2023), and ProgPrompt constrains plans to executable program syntax (Singh et al., 2023).

Some of these studies compare horizons on the same task and model, as ReWOO does against ReAct.
Their tasks are question answering, text environments or open-ended games; success is judged by task completion, and plan quality is not compared with an optimum.
Whether committing to several actions per model call helps or hurts remains open for a deterministic task with an exact optimum, with the same model and the same observation.
It is also open how the answer depends on whether the order of actions is given or must be derived.
This is the third research question of the thesis.

## 3.4 Automatic Prompt Optimisation

Ramnath et al. (2025) classify prompt optimisers by the feedback they consume, the search they perform and the budget they need.
The scalar-feedback optimisers of Section 2.6 generate many candidates and keep the best.
OPRO, for example, improves on human-designed prompts by up to 8 % on GSM8K and up to 50 % on Big-Bench Hard (Yang et al., 2024), and the DSPy framework provides MIPROv2, which tunes instructions and examples together (Opsahl-Ong et al., 2024; Khattab et al., 2024).
EXPO is a scalar method designed for sequential decision-making agents; it treats the non-stationary rewards of such agents as an adversarial bandit problem (Kong et al., 2026).
The textual-feedback optimisers of Section 2.6 revise the prompt from a description of its failures.
Beyond ProTeGi and TextGrad, Trace learns from execution traces (Cheng et al., 2024), PromptAgent searches over edits with a tree (Wang, X. et al., 2024), and GEPA reflects over full traces (Agrawal et al., 2025).
Self-Refine (Madaan et al., 2023) and Reflexion (Shinn et al., 2023) apply the same mechanism to a single output or to an episodic memory rather than to the system prompt.

Recent work qualifies GEPA's results.
Naive Prompt Optimization revises a single prompt lineage from recent traces, without a Pareto frontier or population, and "achieves comparable or better performance than GEPA with fewer rollouts" (Chang and Chen, 2026).
In 22 interactive games it remains broadly competitive with GEPA, and its authors leave open whether the result extends to long-horizon agent environments.
The (1+1) loop of Section 5.7 follows the same single-lineage design.
ESPO documents that GEPA's prompts grow up to three times longer without becoming more accurate, and it outperforms GEPA by 3.8 percentage points with prompts 47 % shorter (Liu, L. et al., 2026).
Reflection in the Dark shows GEPA lowering accuracy from a defective seed prompt, from 23.8 % to 13.5 % on GSM8K (Liu, S. et al., 2026).
ContraPrompt extracts rules from the difference between a failed and a successful trace on the same input (Rishav et al., 2026).
ETGPO reaches GEPA's accuracy at a third of the budget by first building an error taxonomy (Singh et al., 2026).

Apart from EXPO and the interactive games of Chang and Chen (2026), these methods are evaluated on tasks with many instances, cheap evaluations and a fixed input format, such as question answering, mathematics and classification.
They assume that the score of a candidate prompt can be measured precisely enough to rank it.
None of them has been evaluated on a long-horizon game in which one episode costs dozens of model calls, the outcome of a single episode varies between repetitions, and the agent's observation is itself engineered.
Whether prompt optimisation still adds to an agent whose observation already carries the relevant computations is the second research question of the thesis.

## 3.5 Prompt Sensitivity and the Reliability of LLM Evaluations

Meaning-preserving changes to a prompt can change results substantially (Section 2.3).
Beyond the formatting effects reported there, Sclar et al. (2024) find that format performance correlates only weakly across models.
Lu et al. (2022) show the same sensitivity for the order of few-shot examples.
Errica et al. (2025) propose sensitivity and consistency metrics over rephrasings, and Ngweta et al. (2025) reduce format brittleness by mixing formats in the prompt.
The software-engineering response treats prompts as versioned artefacts with regression tests (Chen, Z. et al., 2025; Feffer et al., 2024).
These studies vary wording, layout and examples written by people.
In the studies reviewed here, the structured, machine-generated part of an agent's prompt, such as a serialised game state with numeric fields and placeholder values, has not been examined in the same way.

A second source of variation is the inference service itself.
Section 2.2.2 explains, following a technical blog post (He and Thinking Machines Lab, 2025), why hosted models are not deterministic at temperature 0.
Atil et al. (2025) measure accuracy variations of up to 15 % across nominally deterministic runs of five models on eight tasks.
Wimbauer et al. (2026) show that such numerical deviations identify the serving system from the generated text alone.
Song et al. (2024) argue that greedy single-sample evaluation is not a reliable estimate of capability.
Surveys of agent evaluation list reliability as a separate evaluation objective (Mohammadi et al., 2025), and τ-bench reports the probability that an agent succeeds in all of $k$ repeated trials (Yao, Shinn et al., 2024).
Binomial confidence intervals for such success rates are standard in statistics (Wilson, 1927; Brown, L. D. et al., 2001).
Of the closest works compared in Table 3.1, four report a spread over repeated runs and five report a single result per configuration without one.
GEPA, for example, gives one test score per optimiser and benchmark, sampled at temperature 0.6 or 1.0 (Agrawal et al., 2025).
Finally, Section 2.2.1 notes that the reasoning text of a model need not reflect the process that produced its answer (Turpin et al., 2023; Lanham et al., 2023).
Wang, Y. (2026) finds that reading the decision from an explicit tag reduces reasoning-to-action inconsistency from 22–26 % to 0.7–1.4 %.

Together, these studies show that a single run of a prompt on a hosted model is weak evidence.
They leave open how much repeated runs change the conclusions of an agent study, and whether conclusions drawn from single runs survive repetition.
The thesis treats this as a methodological question in its own right (Chapter 5 and Chapter 7).

## 3.6 Grounding LLMs in Symbolic Components

Several lines of work pair an LLM with a component that computes exactly.
LLM+P lets the model translate a natural-language problem into the Planning Domain Definition Language and hands the search to a classical planner (Liu, B. et al., 2023).
With an optimal planner, it returns optimal plans for most problems, whereas the model planning alone fails to produce even feasible plans for most of them.
The LLM-Modulo framework treats the LLM as an approximate generator whose proposals are checked by external sound verifiers (Kambhampati et al., 2024).
With such verifiers, every plan the system returns satisfies the verified constraints, and success rates rise over the model alone (Gundawar et al., 2024).
SayPlan grounds a robot's plans in a 3D scene graph and a classical path planner (Rana et al., 2023).
Classical planning itself goes back to STRIPS (Fikes and Nilsson, 1971) and requires a complete formal domain model (Ghallab et al., 2004).
On the output side, constrained decoding guarantees that an answer follows a grammar or schema (Section 2.3; Willard and Louf, 2023), and tool-use models learn to emit valid API calls (Patil et al., 2023).

These approaches mostly ground the model's output: they verify a plan after it is proposed, or translate the problem into a form a planner can solve.
SayPlan's scene graph enters the input, but as a description of the world, not as the computed consequences of each action.
Constrained decoding guarantees that an answer is well formed, not that it denotes a legal action with known consequences.
Less studied is grounding on the input side.
There, the symbolic component computes the consequences of every legal action in advance and writes them into the model's observation, and the model chooses among them by identifier.
How the design of that observation affects decisions, and which kinds of annotation help or mislead, is part of the first research question of the thesis.

## 3.7 Positioning

Table 3.1 compares the closest works with this thesis on six properties.

**Table 3.1:** Positioning of the thesis against the closest related works. Deterministic = the environment has no random outcomes; Exact optimum = each episode can be compared with a provably optimal solution; Repeated runs = each configuration is run several times and reported with its spread; Prompt optimisation = the prompt is optimised automatically; Planning horizon = planning horizons are compared on the same task and model; Engine-annotated observation = a symbolic component computes the consequences of actions into the model's input. ✓ = yes, ✗ = no, n/a = not an environment study.

| Work | Deterministic | Exact optimum | Repeated runs | Prompt optimisation | Planning horizon | Engine-annotated observation |
|---|---|---|---|---|---|---|
| BALROG (Paglieri et al., 2025) | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Agentick (Castanyer et al., 2026) | ✗ (stochastic tasks) | ✗ (oracle policies not always optimal) | ✓ | ✗ | ✗ | ✗ |
| Voyager (Wang, G. et al., 2023) | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| HexMachina (Belle et al., 2025) | ✗ | ✗ | ✓ | ✗ (evolves code) | ✗ | ✗ |
| Magic Tower report (Weng, 2025) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| ReWOO (Xu et al., 2023) | n/a | n/a | ✗ | ✗ | ✓ | ✗ |
| LLM+P (Liu, B. et al., 2023) | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| GEPA (Agrawal et al., 2025) | n/a | n/a | ✗ | ✓ | ✗ | ✗ |
| Naive Prompt Optimization (Chang and Chen, 2026) | n/a | n/a | ✗ | ✓ | ✗ | ✗ |
| This thesis | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Overall, the literature suggests four things.
LLM agents in games are evaluated mostly in stochastic environments without an optimum.
Where the observation is varied, the variation concerns its format, not the computed consequences of actions.
Prompt optimisers are evaluated on short tasks with cheap, repeatable scores.
Grounding work verifies what the model outputs rather than shaping what it sees.
This combination motivates the design of this thesis: a deterministic game with an exact solver, and an engine that annotates every legal action with its computed consequences.
A repeated-episode protocol then measures the contributions of the observation, of prompt optimisation and of the planning horizon separately.

In the following chapter, the game and its formal task definition are introduced.
