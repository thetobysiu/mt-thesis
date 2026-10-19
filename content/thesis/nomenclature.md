# Nomenclature

## Abbreviations

| Abbreviation | Full form |
|:-------------|:----------|
| AI | Artificial Intelligence |
| APE | Automatic Prompt Engineer |
| API | Application Programming Interface |
| APO | Automatic Prompt Optimisation |
| ASCII | American Standard Code for Information Interchange |
| ATK | Attack (hero or monster attribute) |
| BFS | Breadth-First Search |
| CoT | Chain of Thought |
| DEF | Defence (hero or monster attribute) |
| DSPy | Declarative Self-improving Python (prompt-programming framework) |
| EXP | Experience points |
| GEPA | Genetic-Pareto prompt optimisation |
| GRPO | Group Relative Policy Optimization |
| GWDG | Gesellschaft für wissenschaftliche Datenverarbeitung mbH Göttingen |
| HP | Hit points |
| HTML | HyperText Markup Language |
| JSON | JavaScript Object Notation |
| LLM | Large Language Model |
| MDEF | Magic defence (hero attribute subtracted from every fight's damage) |
| MoE | Mixture of Experts |
| MT0–MT23 | Floors 0 to 23 of the 24-floor tower |
| OPRO | Optimization by PROmpting |
| RL | Reinforcement Learning |
| RLHF | Reinforcement Learning from Human Feedback |
| RQ | Research Question |
| SAIA | Scalable AI Accelerator (inference service of the GWDG) |
| STRIPS | Stanford Research Institute Problem Solver |

## Symbols

### Game, engine and solver

| Symbol | Meaning |
|:-------|:--------|
| $a_h$, $d_h$ | the hero's ATK and DEF |
| $h_m$, $a_m$, $d_m$ | a monster's HP, ATK and DEF |
| $T$ | number of hero strikes needed to defeat a monster |
| $d$ | a monster's damage per strike after the hero's DEF (Table 4.1) |
| $D$ | HP cost of a fight |
| $(S, s_0, A, \delta, G)$ | floor task: set of states, initial state, legal actions $A(s)$, transition, goal (Definition 4.1) |
| HP$_{\text{final}}$ | the hero's HP at the end of an episode |
| HP$_{\text{opt}}$ | exact optimum of a floor: the largest final HP of any winning action sequence |
| $L$ | net lookahead value of an action |
| $v_i$ | HP-equivalent value of an unlocked item $i$ |
| $\lambda_j$ | factor for items behind $j$ gateways (1 for $j = 0$; 0.7, 0.5 and 0.35 for $j = 1, 2, 3$) |
| $c_g$ | HP cost of gateway $g$ |
| $C_{\text{route}}$, $S_{\text{route}}$ | HP of fighting needed to reach the stat items behind an action, and the HP these items save on the other listed fights (net stat-route line) |

### Measures

| Symbol | Meaning |
|:-------|:--------|
| $N$ | number of episodes of a configuration |
| $k$ | commitment: number of actions per model call; in $k/N$, the number of successful episodes |
| $\hat p$ | success rate $k/N$ |
| $z$ | quantile of the standard normal distribution in the Wilson interval ($z = 1.96$) |
| HP/opt | HP$_{\text{final}}$ divided by HP$_{\text{opt}}$ for a successful episode; reported as the mean over successful episodes |
| $S_{\text{goal}}$ | goal score of one episode |
| $C$ | share of a floor's monsters defeated (in $S_{\text{goal}}$) |
| $n$, $b$ | in the sign test: number of discordant pairs, and the number of these that favour the first prompt (in Chapter 2, a sequence length and a branching factor) |

### General symbols (Chapter 2)

| Symbol | Meaning |
|:-------|:--------|
| $w_t$ | the $t$-th token of a sequence of $n$ tokens |
| $\Pr(\cdot)$ | probability |
| $Q$, $K$, $V$ | query, key and value matrices of self-attention |
| $d_k$ | length of the key vectors |
| $z_i$ | score of token $i$ in the model's last layer |
| $p_i$ | probability of token $i$ after the softmax |
| $\tau$ | sampling temperature |
| $\theta$ | parameters of a model |
| $P$ | prompt |
| $s$, $a$ | state, action |
| $\pi(a \mid s, P)$ | policy: probability of action $a$ in state $s$ under prompt $P$ |
| $G$ | number of outputs sampled per input in GRPO (the goal of a floor task in Definition 4.1) |
| $r_i$ | reward of output $i$ |
| $\hat{A}_i$ | advantage of output $i$ in GRPO: its reward standardised within its group |
| $b$ | branching factor: number of choices per step of a search |
| $\ell$ | search depth: number of actions from the initial state |

## Models

Models are named by family, version and total size; the endpoint identifiers are listed in Table 6.1 and Appendix D.

| Name | Type and size | Reasoning mode | Used in |
|:-----|:--------------|:---------------|:--------|
| Qwen3.5-397B | mixture of experts, 397 B parameters, 17 B active | thinking | main experiments; planning study (Section 6.6); reference and teacher in the first configuration of the first prompt-optimisation study |
| Qwen3.6-35B | mixture of experts, 35 B parameters, 3 B active | thinking | main experiments; prompt-optimisation study (Section 6.5); exact-route prompt (Section 6.6) |
| Qwen3.8-27B | dense, 27 B parameters | thinking | planning study (Section 6.6) |
| DeepSeek-V4-Flash | mixture of experts, 284 B parameters, 13 B active | thinking | main experiments; planning study (Section 6.6); teacher in the second configuration of the first prompt-optimisation study, task model and teacher in Sections 6.5.3 and 6.5.4 |
| DeepSeek-V4-Flash (no thinking) | the same model with its reasoning mode switched off | none | prompt-optimisation study (Section 6.5) |
| Mistral Medium 3.5 | 128 B parameters, architecture not stated by the service | none | main experiments |
| Llama-3.1-8B | dense, 8 B parameters, instruction-tuned | none | prompt-optimisation study (Section 6.5) |

B = billion.

## Labels

| Label | Meaning |
|:------|:--------|
| RQ1–RQ3 | research questions (Section 1.1) |
| HA–HC | hypotheses of the thesis, one per research question (Section 1.1) |
| R1–R3 | rival explanations (Sections 1.1 and 7.2) |
| S1–S14 | strategy principles (Table 4.2) |
| G1–G5 | hypotheses of the prompt-optimisation study, stated before the runs (Section 6.5.1) |
| P1–P3 | predictions for the evolved-route run, stated before the run (Section 6.5.4) |
| hand01–hand04 | hand-designed floors (Table 4.3) |
| gen01–gen15 | generated floors (Table 4.3) |
| First, second and final tower observation | the three tower observations compared in Table 6.13 (Section 5.5.3); the final one is used for all tower results of Table 6.2 |

## Internal Labels

Two labels of the verbatim observation text appear in listings and appendices:

| Internal label | Name in this thesis |
|:---------------|:--------------------|
| `effCost` | effective cost |
| `ORDER` line | fight-order line |

The result file behind each reported cell is listed in Table D.4 (Appendix D).
