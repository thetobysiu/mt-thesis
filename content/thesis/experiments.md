# Chapter 6: Experiments

This chapter presents the empirical evaluation of the hybrid agent.
The main objectives are to measure how often the agent wins each floor under the final configuration and which components of the observation are responsible.
Further objectives are to test whether prompt optimisation adds to this result and how the planning horizon affects success and cost.
Section 6.1 describes the setup shared by all experiments.
Section 6.2 reports the main results, Section 6.3 the ablations and Section 6.4 the error analysis.
Sections 6.5 and 6.6 address the second and third research questions.
Section 6.7 reports results on the hand-designed floors, the generated floors and the tower.
All experiments use the measures defined in Section 5.9.

## 6.1 Experimental Setup and Configurations

All experiments share one inference service, one evaluation harness and one fixed configuration.
Most experiments change one factor of this configuration, and the tables mark those that change more.

### 6.1.1 Models and Inference Service

All models are accessed through the GWDG SAIA service (Doosthosseini et al., 2026).
They are named in this thesis by family, version and total size; the endpoint identifier is given in the second column of Table 6.1.

**Table 6.1:** Models used in the experiments. B = billion parameters; Reasoning cap = maximum number of output tokens per call, including the reasoning.

| Name in this thesis | Endpoint model | Type | Reasoning mode | Reasoning cap (tokens) |
|---|---|---|---|---|
| Qwen3.5-397B | qwen3.5-397b-a17b | mixture of experts, 17 B active | thinking | 32,768 (tower 8,192) |
| Qwen3.6-35B | qwen3.6-35b-a3b | mixture of experts, 3 B active | thinking | 16,384 (map-only condition 32,768; two early rows of the repair sequence, Section 6.4.3: 8,192; tower 8,192) |
| Qwen3.8-27B | qwen3.8-27b | dense | thinking | 32,768 |
| DeepSeek-V4-Flash | deepseek-v4-flash-0731 | mixture of experts, 284 B, 13 B active | thinking | 16,384 or 32,768 (reactive, stated per cell), 32,768 (planning modes); tower 8,192 (reactive), 16,384 (planning modes) |
| DeepSeek-V4-Flash (no thinking) | deepseek-v4-flash-0731 | mixture of experts, 284 B, 13 B active | none | not applicable |
| Mistral Medium 3.5 | mistral-medium-3.5-128b | 128 B, architecture not stated by the service | none (the service accepts only no reasoning or a high-effort setting that took 430 s for a one-line question) | not applicable |
| Llama-3.1-8B | meta-llama-3.1-8b-instruct | dense | none | not applicable |

DeepSeek-V4-Flash (no thinking) and Llama-3.1-8B are used only in the prompt optimisation study (Section 6.5), where weaker models leave room for improvement.
Mistral Medium 3.5 was added for the re-run of Table 6.2 as a model of a different family without a reasoning channel.
Qwen3.8-27B is not in the main table, because its episodes took 55 to 113 minutes each in preliminary episodes.
It appears in the planning study (Section 6.6).

### 6.1.2 Final Configuration

Unless an experiment states otherwise, every episode uses the following settings:

- temperature 0 (Section 6.3 repeats the cells that carry the main conclusions at 0.6 and 1.0; the planning cells of Qwen3.8-27B use 0.6);
- lookahead depth 3 on single floors and 2 on the tower;
- no conversation history: each decision sees only the current observation;
- the single-floor prompt or the tower prompt of Section 5.4;
- all annotations of Section 5.2;
- answers ending with `FINAL_CHOICE: <number>`, with one constrained-decoding repair call for truncated or unparseable answers (Section 5.3);
- engine assists limited to automatic collection of items and keys, automatic fights that cost 0 HP and, on the tower, the climb to a floor not yet visited, each logged per turn;
- only the mechanical overrides of Section 5.6, each logged per turn.

Two settings of the tower configuration, the rule 4 threshold of 60 % and plan memory (Section 5.5.4), are not used on single floors.
Both were tested on the simple floor and on the complex floor with both prompts.
On the simple floor, each lowered Qwen3.5-397B from 5/5 to 2/5 [0.12, 0.77]; DeepSeek-V4-Flash went from 1/5 to 0/5 and 2/5.
On the complex floor, the single-floor prompt stayed at 0/5 for both models, and with the solver-route prompt the results moved in both directions (Qwen3.5-397B from 3/5 to 5/5 at 60 % and to 2/5 with plan memory; DeepSeek-V4-Flash from 4/5 to 3/5 and 4/5).

### 6.1.3 Episodes and Repetitions

Each configuration is run $N$ times from the same initial state.
The cells of the main results table use $N = 5$ (ten for Qwen3.6-35B with the solver-route prompt).
The final-configuration cells of the ablations and of the repair sequence use $N = 10$, as do the intermediate repair rows and some reactive arms of the planning study.
Most other comparisons use $N = 2$ to $5$ (three for the slow Qwen3.8-27B), and tower cells have one to five runs.
Success rates are reported as $k/N$ with Wilson 95 % intervals at first mention.
At most two configurations were run concurrently on one API key, because four parallel experiments had slowed every call of Qwen3.5-397B from about 20 s to over 300 s.

## 6.2 Main Results

Table 6.2 reports the success rate and the final HP relative to the exact optimum for each agent and floor.

**Table 6.2:** Success rate $k/N$ and final HP relative to the exact optimum (HP/opt, mean over successful episodes, in parentheses) per floor. Final configuration unless marked. Simple = simple floor; Complex, single-floor prompt = complex floor with the single-floor prompt; Complex, solver-route prompt = complex floor with the solver-route prompt, which lists the published solver's route (compiled-knowledge condition and plan-execution reference, Section 5.4; note ᵈ); hand01–hand04 = hand-designed floors; Tower = highest floor reached from MT0 in the best of three runs with the final tower observation (Section 6.7.3; all runs in Table 6.13). DeepSeek-V4-Flash ran on the single floors with a reasoning cap of 32,768 tokens. Earlier episodes of the same configuration on the simple floor (Table 6.3, first row): Qwen3.5-397B 10/10, Qwen3.6-35B 7/10. Bold = best per column (equal rates: larger $N$); "—" = not run (note ᵇ).

| Agent | Simple | Complex, single-floor prompt | Complex, solver-route prompt ᵈ | hand01 | hand02 | hand03 | hand04 | Tower |
|---|---|---|---|---|---|---|---|---|
| Exact optimum (HP) | 13 | 68 | 68 | 14 | 13 | 9 | 3 | — ᶜ |
| Rule-based heuristic | 0/1 | 0/1 | — | 0/1 | 0/1 | 0/1 | 0/1 | MT8 |
| Random play | — | — | — | 0/500 | 0/500 | 0/500 | 0/500 | — |
| Qwen3.5-397B | **5/5** (0.15) | 0/5 | 3/5 (0.25) †1 | **5/5** (0.50) | 4/5 (0.48) | 0/5 | 0/5 | **MT18** |
| DeepSeek-V4-Flash | 1/5 (0.15) | 0/5 | **4/5** (0.26) | 4/5 (0.66) | **5/5** (0.28) | 0/5 | 0/5 | MT17 |
| Qwen3.6-35B | 1/5 (0.15) | 0/5 | 4/10 (0.20) †3 | 4/5 (0.64) | 3/5 (0.31) | 0/5 | 0/5 | MT16 |
| Mistral Medium 3.5 ᵃ | 0/5 | 0/5 | 0/5 †4 | **5/5** (0.64) | **5/5** (0.86) | 0/5 | 0/5 | MT8 |

ᵃ No reasoning channel (Section 6.1.1).
ᵇ "—" = not run: random play was evaluated only on the hand-designed floors, and the heuristic reads no prompt.
ᶜ No exact optimum is computed for the tower; the normal ending of the game is on MT21 (Section 4.5.3).
ᵈ Run without the mechanical overrides and the automatic 0-HP fights (Section 5.4); a lethal fight chosen while another action existed was executed.
† Number of episodes in which the hero died.

All LLM cells of Table 6.2 were re-run on the final version of the code.
Each cell has five episodes (ten for Qwen3.6-35B with the solver-route prompt), and each tower cell three runs.
The rule-based heuristic acts on the same engine output without a language model.
It wins none of the six fixed floors of Table 6.2, against eight of the fifteen generated floors (Section 6.7.2).
It ends the simple floor alive at 443 HP with the boss untouched, fails the complex floor and all four hand-designed floors, and reaches MT8 of the tower.
Random play wins none of 500 games on any hand-designed floor.

**Simple floor.**
Positions are given as (x, y) with the origin at the top left, as in Figure 4.1; Appendix B.5 gives all maps.
Qwen3.5-397B wins 5/5, every episode at 2 HP (HP/opt 0.15).
Every winning episode of the final configuration, of every model, follows the same sequence of actions, the *winning trajectory*.
It is the optimal route of Table 4.4 with one change: it fights the Slime Lord (1,9) at turn 15, before the Bat (3,5), which costs 11 HP and leaves 2 (Section 6.4).
The ablations of Table 6.3 were run on an earlier version of the code, and their final-configuration rows are called the earlier episodes below.
Together with the earlier episodes of the same configuration (10/10, Table 6.3), Qwen3.5-397B wins 15 of 15 episodes on this floor [0.80, 1.00].
DeepSeek-V4-Flash and Qwen3.6-35B win 1/5 each [0.04, 0.62], and Mistral Medium 3.5 0/5.
All five failures of Mistral Medium 3.5 and one of DeepSeek-V4-Flash leave the winning trajectory at turn 18 by fighting the Slime Lord (4,2).
The other three failures of DeepSeek-V4-Flash fight the Slime Lord (4,2) at turn 2 or the Bat (3,5) at turn 4, or, in one episode that kept the state value at 13 HP up to turn 25, the two Slime Lords of the top-left corner before the Slime Lord (1,9) at turns 28 and 29.
For Qwen3.6-35B, the earlier episodes of the same configuration won 7/10 [0.40, 0.89] (Table 6.3).
In the re-run, all five episodes of Qwen3.6-35B are identical up to turn 22.
At turn 22, on the same input, one episode opens the yellow door (7,5) and four fight the Slime Lord (4,2), as the three failures of the earlier episodes did (Section 6.4 explains why this loses).
Section 7.2 discusses this difference.
Every kill in Table 6.2 on this floor ends at 2 HP.
Among the simple-floor episodes of Tables 6.3 and 6.5, two kills end higher.
One ends at 10 HP (Table 6.5, row 7).
One ends at 13 HP, the exact optimum (Qwen3.6-35B at lookahead depth 2, Table 6.3).

**Complex floor.**
With the single-floor prompt, no model wins any of 20 episodes (0/20 [0.00, 0.16]).
All end alive with only lethal or unwinnable fights left.
Section 6.4.5 locates the decision that lost each of them.
With the solver-route prompt, three of four models win: DeepSeek-V4-Flash 4/5, Qwen3.5-397B 3/5 and Qwen3.6-35B 4/10 [0.17, 0.69].
Their kills reach 0.20 to 0.26 of the optimum on average, and every kill ends at 22 HP or below, the value of the listed route.
Mistral Medium 3.5 wins 0/5 and dies in four of its five episodes.
Among the conditions of Table 6.2, only this prompt has deaths, eight in total: four of Mistral Medium 3.5, three of Qwen3.6-35B and one of Qwen3.5-397B.
They occur because this condition runs without the mechanical overrides, which would replace a lethal choice (Section 5.4).
Six of the eight die in the boss fight, one at the Big Bat (9,1) and one at the Black Slime (0,4).
The six failed episodes of Qwen3.6-35B leave the trajectory of its winning episodes at turn 12 (three episodes), turn 21 (one) or turn 37 (two); the decision that loses each of them comes at or after that turn (Section 6.4.5).

**Hand-designed floors.**
The floors hand01 and hand02 are won by every model, and hand03 and hand04 by none in any of 20 episodes each (0/20 [0.00, 0.16]); every episode on hand03 and hand04 ends alive.
On hand01, Qwen3.5-397B and Mistral Medium 3.5 win 5/5, DeepSeek-V4-Flash and Qwen3.6-35B 4/5.
On hand02, DeepSeek-V4-Flash and Mistral Medium 3.5 win 5/5, Qwen3.5-397B 4/5 and Qwen3.6-35B 3/5.
Mistral Medium 3.5 wins nothing on the simple and complex floors.
On hand02, it ends four of its five kills at 13 HP, the exact optimum (HP/opt 0.86), the highest ratio in Table 6.2.

**Tower.**
The tower has 24 floors, MT0 to MT23, and the game's normal ending is the defeat of the Nether Demon King on MT21.
With the final tower observation, the highest floor reached in the best of three runs is MT18 for Qwen3.5-397B, MT17 for DeepSeek-V4-Flash and MT16 for Qwen3.6-35B.
Mistral Medium 3.5 reaches MT8, the floor where the heuristic stops.
In their other two runs, Qwen3.5-397B and Qwen3.6-35B stop at MT8, Mistral Medium 3.5 at MT4, and DeepSeek-V4-Flash at MT8 and MT17 (Table 6.13).
Section 6.7.3 reports where and why each run stopped.
A stored run of Qwen3.5-397B, resumed on MT18 with blue keys for sale as in the original game, reached the normal ending.

## 6.3 Ablations

Table 6.3 changes one factor of the final configuration at a time on the simple floor and repeats the main cells at temperatures 0.6 and 1.0.

**Table 6.3:** Ablations and temperature repetitions; $k/N$ successes. Upper rows: earlier episodes of the final configuration on the simple floor (the re-run is in Table 6.2), one factor changed per row. Temperature rows: the cells of Table 6.2 at temperatures 0 · 0.6 · 1.0. "—" = not run.

| Factor | Setting | Qwen3.5-397B | Qwen3.6-35B | DeepSeek-V4-Flash |
|---|---|---|---|---|
| Lookahead depth | 3 (final) | 10/10 | 7/10 | — |
| | 2 | 4/5 | 7/10 | — |
| | 1 | 0/3 | 0/5 | — |
| | 0 | 0/3 | 0/5 | — |
| Observation | full annotations (final) | 10/10 | 7/10 | — |
| | bare observation ᵇ | 0/3 | 0/3 | — |
| | map only ᵇ | 0/2 | 0/2 | — |
| Conversation history | none, same version as the next row ᵃ | 9/10 | 10/10 | — |
| | six previous decisions ᵃ | 10/10 | 1/5 | — |
| Temperature 0 · 0.6 · 1.0 | Simple | 5/5 · 5/5 · 5/5 | — | 1/5 · 1/5 · 2/5 |
| | Complex, single-floor prompt | 0/5 · 0/5 · 0/5 | — | 0/5 · 0/5 · 0/5 |
| | Complex, solver-route prompt ᵈ | 3/5 †1 · 3/5 · 4/5 | — | 4/5 · 4/5 · 3/5 †1 |

ᵃ Measured on the annotation versions of Table 6.5, rows 6 and 7, before the two-sided order line; with the final annotations and no history, the models win 10/10 and 7/10 (first row).
ᵇ Earlier version of the code: the map-only condition on the version of Table 6.5, row 7, the bare observation on that of row 9.
ᵈ Run without the mechanical overrides and the automatic 0-HP fights (Section 5.4).
† Number of episodes in which the hero died.

**Lookahead depth.**
Removing one level of lookahead lowers Qwen3.5-397B from 10/10 to 4/5 [0.38, 0.96], and removing two or three levels to 0/3 [0.00, 0.56].
Qwen3.6-35B wins 7/10 at depths 3 and 2 and 0/5 [0.00, 0.43] at depths 1 and 0.
The turn of the first departure from the winning trajectory (Section 6.4) depends on the depth.
At depth 1, all eight episodes depart by opening the yellow door (7,5), three at turn 3 and five at turn 9, which lowers the state value from 13 to 4 or 10 HP; the floor is lost at a later decision.
At depth 0, five of eight episodes fight the Slime Lord at (1,9) at turn 9, before the stat item that makes it cheaper, and the other three fight the Bat (3,5) at turn 4; both choices make the boss unwinnable.
At depth 2, the four failed episodes depart at turn 2 (the Red Slime (5,3)), at turn 4 (the Bat (3,5)) and, in two episodes, at turn 22 (the Slime Lord (4,2) instead of the door (7,5)).
On hand01 and hand02, DeepSeek-V4-Flash wins 9 of 10 episodes at depth 1 [0.60, 0.98] (5/5 and 4/5), as at depth 3 (4/5 and 5/5).
Its depth-1 kills end at 5 to 10 HP on hand01 and at 3 to 4 HP on hand02.

**Observation.**
Without annotations, both models lose every episode (0/3 [0.00, 0.56] each), although the engine still enumerates only legal actions with exact costs.
With the rules-only prompt of Section 6.5 instead of the single-floor prompt, Qwen3.5-397B also loses 0/3, ending alive at 219 to 481 HP.
The same holds beyond the simple floor.
With the bare observation, DeepSeek-V4-Flash loses all five episodes on hand01 and all five on hand02, alive at 114 to 153 and 42 to 69 HP.
With the annotations, it wins 9 of 10 [0.60, 0.98].
Without the enumerated action list, Qwen3.5-397B must list its options from the grid before choosing (Table 6.4) and loses 0/2 [0.00, 0.66].
Half of the options it lists are not possible (66 of 128).
Of these, 46 are real monsters, doors or items behind a closed door or an undefeated monster.
It misses a third of the possible options, and a quarter of its choices are illegal.
Qwen3.6-35B did not complete this analysis within 32,768 tokens on 22 of 30 decisions.

**Table 6.4:** Map-only condition on the simple floor ($N = 2$ per model). Options listed / legal = options listed by the model / legal options available, summed over all decisions; Precision = share of listed options that are legal; Recall = share of legal options that are listed; Impossible options = listed options that name no entity at that position / that name an entity the hero cannot reach; Illegal choices = share of decisions whose final choice is illegal or missing; Truncated decisions = answers cut off at the reasoning cap.

| Model | Wins | Options listed / legal | Precision | Recall | Impossible options (no such entity / unreachable) | Illegal choices | Truncated decisions |
|---|---|---|---|---|---|---|---|
| Qwen3.5-397B | 0/2 | 128 / 91 | 0.48 | 0.68 | 20 / 46 | 25 % | 0 of 28 |
| Qwen3.6-35B | 0/2 | 15 / 120 | 0.20 | 0.03 | 11 / 1 | 93 % | 22 of 30 |

**Conversation history.**
The six previous decisions (observations and answers) made up about three quarters of every request.
Removing them left Qwen3.5-397B at 9/10 [0.60, 0.98], against 10/10 with history on the same version; its one failure departed from the winning trajectory at turn 18, fought both Slime Lords (4,2) and (2,1) at 60 HP each instead of 22, and ended 23 HP short of the boss.
Removing them raised Qwen3.6-35B from 1/5 [0.04, 0.62] to 10/10 [0.72, 1.00].
On that version, Qwen3.6-35B without history wins all ten episodes along the winning trajectory, at 16 s per call.
Qwen3.5-397B reasons about four times longer per decision without history (median 7,100 against 1,700 characters).

**Temperature.**
All main cells use temperature 0, below the values that the model cards recommend for thinking mode (0.6 for Qwen3.5-397B, 1.0 for DeepSeek-V4-Flash).
The cells that carry the main conclusions were therefore repeated at 0.6 and 1.0, with $N = 5$ (temperature rows of Table 6.3).
No success rate at 0.6 or 1.0 differs from the rate at 0 by more than one episode in five.

## 6.4 Error Analysis

The error analysis concentrates on the simple floor (Sections 6.4.1 to 6.4.4); Section 6.4.5 locates the losing decisions on the complex floor with exact state values.
The slack of the simple floor is small (Section 4.5.1).
The hero starts with 470 HP and the potions add 700.
In the optimal order, the monsters that must be fought cost 1,157 HP including the boss, so the optimal route ends with 13 HP.
A single decision that wastes 13 HP or more loses the floor.
Turns are numbered as in Section 5.5.1: the key at (5,1) is turn 1, and the first decision of Listing 5.1 is turn 2.
At that decision, 19 of the 20 episodes of the re-run of Table 6.2 fought the Black Slime (6,4), the only choice that keeps the boss winnable (Figure 4.3); one episode of DeepSeek-V4-Flash fought the Slime Lord (4,2).
The winning trajectory (Section 6.2) has seventeen decisions, on turns 2 to 5, 9 to 11, 15, 18, 22, 24, 27, 28, 31, 32, 35 and 36 (Table 4.4, last column); the turns in between are assisted.
It follows the optimal route up to turn 11, the Green Slime (9,0).
At turn 15 it fights the Slime Lord (1,9) before the Bat (3,5); the Slime Lord then costs 75 HP instead of 52 and the Bat 132 instead of 144, so the state value drops from 13 to 2 HP.
This is why every win in Table 6.2 ends at 2 HP.
From turn 15 on, the trajectory's slack is 2 HP, and any later decision that wastes 2 HP or more loses the floor.
Two such decisions account for ten of the thirteen failed episodes in the re-run of Table 6.2.
At turn 18, the hero stands at (0,7) with 720 HP, ATK 10 and DEF 6, after the blue gem behind the Slime Lord (1,9).
Only the Bat (3,5), at 132 HP, keeps the boss winnable; the Slime Lord (4,2) costs 60 HP now against 22 at its place on the trajectory (turn 31).
At turn 22, the hero stands at (2,4) in the left corridor with 663 HP, ATK 11, DEF 6 and one key.
The door (7,5) keeps the state value at 2 HP; the Slime Lord (4,2) costs 52 HP now against 22 later, and the boss can no longer be defeated.
The failed episodes discussed below were compared with the winning trajectory action by action to find the first action at which each departs, and the state value after that action shows whether the departure lost the floor or only lowered the result.

### 6.4.1 Engine Overrides

In 94 turns of 68 stored simple-floor episodes, the engine had executed a different action from the one the model chose, and none of these replacements was logged.
Every one of the 21 stored wins before the logging change contains such a replacement.
In 17 of them it occurs at turn 9: the model chose the Slime Lord at (1,9), and the engine executed the door at (7,0).
Reproducing that configuration deliberately gave 2/4 [0.15, 0.85], both wins again containing the replacement (Table 6.5, row 1).
After the overrides were reduced to mechanical cases and logged, no strategic override occurred in any single-floor episode except those of row 1 of Table 6.5, which re-enables it deliberately.
In the fifteen winning episodes of Qwen3.5-397B in the final configuration (Tables 6.2 and 6.3), no override of any kind occurred.

### 6.4.2 One-Sided Annotations

At the decisions whose reasoning was read, the model cited an annotation that stated one side of a trade-off and omitted the other.
Five kinds were identified, on the simple floor and the complex floor.

1. **A saving without the cost of reaching it.** At turn 9 of the simple floor, the observation stated that the stat items behind door (7,5), in the right-hand rooms, "save 155 HP" and those behind door (7,0), in the top-right room, "save 94 HP".
   It did not state that reaching them costs 198 and 16 HP of fighting.
2. **A value without its cost: potions counted as fight value.** At the same turn, the Slime Lord at (1,9) was listed with an effective cost of −195.
   A 200-HP potion behind it was counted as its value, although the potion is collected in any order.
   On the complex floor with the single-floor prompt, the effective cost of a 235-HP fight was −218 for the same reason.
   The model reasoned that "the potion immediately restores me … a net gain of 18 HP".
3. **An efficiency without affordability.** On the simple floor, the positive form of the fight-order line ("take this fight before …") recommended a Bat costing 46.5 % of HP, without stating that this exceeds the rule 4 threshold (Table 6.5, row 8).
4. **A deficit without scope.** On the complex floor with the single-floor prompt, a floor budget summed all remaining monsters, including optional ones, and declared a winnable floor unwinnable ("CANNOT WIN even with all gems").
   The model read it as a licence for expensive fights.
5. **A count without multiplicity.** On the simple floor, the lookahead tree listed identical items once, so two blue gems and two potions behind one door appeared as one each, and a profitable route appeared as a loss.

A sixth case was one-sided in a different sense.
The fight-order line was printed only when the other order was cheaper.
At turn 18, the Bat (3,5) therefore carried no line, and the model applied the line of the Bat (5,9) to it.
Each defect was repaired in the engine by stating the missing side, not by changing the prompt.

### 6.4.3 Repair Sequence

Table 6.5 lists the changes cumulatively.
Each row adds the change or changes named in it to the row above; from row 2 on, only mechanical assists are active.

**Table 6.5:** Cumulative repair sequence on the simple floor; $k/N$ successes. Every success ends at HP 2 (HP/opt 0.15) unless noted; "—" = not run with Qwen3.6-35B.

| # | Change | Qwen3.5-397B | Qwen3.6-35B |
|---|---|---|---|
| 1 | Earlier hand-written prompt with the strategic override (logged) | 2/4 ᵈ | — |
| 2 | Single-floor prompt, mechanical assists only | 0/5 | — |
| 3 | + alternative-route tag | 0/5 | — |
| 4 | + net stat-route and fight-order lines | 10/10 | 0/5 |
| 5 | + individual item counts, potion-free effective cost, affordability guard on the order line, required-monster budget | 4/5 | 1/5 ᵃ |
| 6 | + key budget and per-door key lines | 10/10 | 1/5 ᵇ |
| 7 | + no conversation history | 9/10 ᶜ | 10/10 |
| 8 | + two-sided fight-order line, key line on fights | 7/10 | 1/10 |
| 9 | + 40 % guard on the positive order line (final configuration) | 10/10 | 7/10 |

ᵃ Reasoning cap 8,192 tokens; truncated answers were repaired by constrained decoding, and in one episode the repair chose the unwinnable boss on 12 turns, before the repair was restricted to actions that the mechanical overrides would not replace (Appendix E, incident 9).
ᵇ Reasoning cap 16,384 tokens from this row on (8,192 in rows 4 and 5).
ᶜ One success at HP 10.
ᵈ A fifth episode ended with a server error and is not counted.

![Repair sequence](/thesis/img/6.1.png)

**Figure 6.1:** Success rate on the simple floor after each step of the repair sequence of Table 6.5. Bars show $k/N$, whiskers the Wilson 95 % interval; rows 1 to 3 were run with Qwen3.5-397B only.

The single largest step is row 4 (Figure 6.1): with model, prompt, temperature and depth fixed, adding two annotation lines raised Qwen3.5-397B from 0/5 [0.00, 0.43] to 10/10 [0.72, 1.00].
Rows 5 and 8 indicate that a repair can itself introduce a one-sided line.
The changes of row 5 brought two doors within 9 HP of each other on the net stat-route balance.
In the one failed episode of row 5, the model then took the door (7,5), which spends the only yellow key and gives none back, at turn 4 instead of the door (4,7); after that decision the boss can no longer be defeated.
After the key lines of row 6, Qwen3.5-397B won 10/10.
The positive order line of row 8 was followed as an instruction even when it recommended a fight above the rule 4 threshold of 40 %.
With the guard of row 9, Qwen3.5-397B won 10/10 and Qwen3.6-35B 7/10.
Qwen3.6-35B won 1/10 [0.02, 0.40] at row 8, against 7/10 for Qwen3.5-397B.
With conversation history (row 6), it won 1/5, against 10/10 without it (row 7).
Its row-5 result is confounded by the reasoning cap (note ᵃ).

### 6.4.4 Reasoning at the Decisive Turn

Listing 6.1 contrasts the reasoning of Qwen3.5-397B at turn 9 of the simple floor before and after row 4.
The state is the same: the hero stands at (1,10) at the far end of the lower-left room with 336 HP, ATK 9, DEF 5 and two yellow keys.

```
Before (row 2, failure; 3,896 characters of reasoning, excerpt):
"6.  **Open Yellow Door at (7,0)**
    - Dead end / far away. I am at (1,10). ...
 Action 1 has effCost = -195. This is the best value on the board. ...
 Action 1 is clearly the winner. It is adjacent, negative effective cost (gain),
 and provides resources."

After (row 4, win; 1,329 characters of reasoning, excerpt):
"Action 6 (Open Yellow Door at 7,0) ... unlocks a path to +1 ATK gem with only
 16 HP fighting cost. This gives +78 HP net benefit ... Action 1 (Fight Slime Lord
 at 1,9) has lookahead=290 but costs 95 HP now. The note says it wastes 12 HP if
 done before getting the ATK from action 6. ... Action 7 ... would cost 198 HP to
 get +1 ATK +1 DEF - not as efficient as action 6."
```

**Listing 6.1:** Reasoning of Qwen3.5-397B at turn 9 of the simple floor, before and after the net stat-route and fight-order lines were added. By the exact solver, the Slime Lord (1,9) chosen in the failure makes the boss unwinnable, the door (7,0) keeps the state value at 13 HP and the door (7,5) lowers it to 10 HP. Appendix G gives the failing text with one omission (Listing G.1) and the winning text in full (Listing G.2).

Before the change, every premise of the reasoning came from the model's input.
The effective cost of −195 and the unpriced door routes were in the observation.
The "dead end" label had been on the door at turn 2 (Listing 5.1), where, with one key, it was correct; at turn 9, with two keys, it no longer applied but was still in the conversation history.
After the change, the same model at the same state cites the new lines and chooses the door.

Listing 6.2 shows the effect of the unguarded positive order line of row 8 on Qwen3.6-35B at turn 4.

```
Observation (excerpt):
"take this fight BEFORE 'Open yellow door at (4,7)' - this fight then that route:
 312 HP; that route then this fight: 323 HP (saves 11)"   [Bat (3,5), 182 HP, 46.5 %]

Reasoning (excerpt):
"This is a direct instruction from the engine's lookahead analysis. I should follow it."
```

**Listing 6.2:** Qwen3.6-35B reading a positive order line as an instruction. The comparison is locally exact but recommends a fight above the rule 4 threshold of 40 %; nine of ten episodes failed identically. A longer excerpt is given in Appendix G (Listing G.3).

### 6.4.5 The Complex Floor: Where the Episodes Are Lost

The complex floor holds three yellow keys for four yellow doors and two blue keys for five blue doors, and only the blue door (6,2) gates the boss.
Its exact optimum (68 HP) opens five of the nine doors and fights 15 of the 24 monsters besides the boss, yet collects all 20 gems (Appendix B.5.2).
Opening every door and fighting every monster is therefore not necessary.
The solver's per-decision analysis (Appendix B.2.3) was applied to every state of 55 complex-floor episodes.
They are the episodes of the re-run of Table 6.2 and those of Qwen3.5-397B with the single-floor prompt on the annotation versions of Table 6.5, rows 5 and 6.
The state value (Section 5.9.2) is the highest final HP that can still be reached from a state.
The drop in state value at a decision is the final HP that the decision costs.
The decision after which no route defeats the boss is the one that loses the episode.
Table B.3 lists the result per configuration, and Figure 6.2 plots the state value along every episode.

![State value along the complex-floor episodes](/thesis/img/6.2.png)

**Figure 6.2:** Exact state value after each turn of every complex-floor episode of Table B.3. The state value is the highest final HP still reachable; left = single-floor prompt (30 episodes), right = solver-route prompt (25 episodes). Red = failed, green = won; episodes that took the same decisions draw the same line, so darker lines stand for more episodes. A line ends when the boss becomes unwinnable or, in a won episode, at the boss fight. Dashed line = exact optimum (68 HP); the labels mark the losses at the Red Slime (11,8).

**The single-floor prompt.**
All 30 episodes with the single-floor prompt fail, each at a single fight: 29 at the Red Slime (11,8) and one at the Red Bat (4,11), at turn 9 in 28 episodes and at turn 12 in two.
Before that fight, 28 episodes had opened the yellow door (8,7) before (5,8), which lowers the value from 68 to 42 or 30.
The other two had fought the Black Slime (12,9) at turn 6, which lowers it to 26.
In the 28 episodes lost at turn 9, four fights are offered at that turn: the Red Slime (103 HP), the Black Slime (12,9) (156 HP), the Slime Lord (10,10) (235 HP) and the Red Bat (310 HP).
Only the Black Slime keeps the boss winnable.
The Red Slime is the cheapest fight at turn 9.
Its cost falls to 0 at DEF 20, and the optimal route fights it as its twelfth decision, for 11 HP.
The observation carried both sides.
It showed an effective cost of 13, with the DEF gem behind the fight counted as value, and "min-cost=0@maxStats save=103HP — collect stat gems first".
An order line compared the fight with a route that "costs 1217 HP (126 % of your HP)".
In 29 of the 30 episodes the model chose the Red Slime; DeepSeek-V4-Flash, for example, reasoned that it was "the cheapest meaningful progress".
Several door decisions come after the episode is lost.
The yellow door (10,5) was opened in 17 of the 20 re-run episodes, at turns 16 to 24.
Eighteen of the 20 spent a blue key on (12,2) (17 episodes) or (4,5) (one), and only one opened the boss door (6,2).

**The solver-route prompt.**
The prompt's door order caps the result: opening (8,7) first and (8,4) second lowers the value from 68 to 42 and then to 22.
Every win (11 of 25 [0.27, 0.63]) therefore ends at 22 HP or below, at most a third of the optimum.
Each of the 14 failures is lost at a fight taken out of the prompt's order.
Ten are lost at the Red Slime (11,8) at turns 12 to 16, including all five episodes of Mistral Medium 3.5.
Two are lost at the Big Bat (9,1) at turn 24 and two at the Big Bat (0,6) at turns 47 to 49.
Every episode of this prompt opened the boss door (6,2), as the route requires.

## 6.5 Prompt Optimisation (RQ2)

### 6.5.1 Study Design and Hypotheses

The study asks whether the reflective prompt optimisation of Section 5.7 adds anything once the engine annotates every action, and whether it adds something when the annotations are withheld.
It uses the two weaker models of Table 6.1, Llama-3.1-8B and DeepSeek-V4-Flash (no thinking), because Qwen3.5-397B already wins the simple floor with the single-floor prompt (Table 6.2).

Each model is run with three prompts.
The *rules-only* prompt states only the game rules, the goal and the answer format.
The *evolved* prompt is what the (1+1) loop of Section 5.7 produces from it, and the *hand-written* prompt is the single-floor prompt.
Listing A.3 gives the rules-only prompt, and Listing A.4 the one evolved prompt confirmed in Section 6.5.2.
Each prompt is run under the full and under the bare observation.
The loop uses the simple floor and two generated floors for training, six evaluations per run, and Qwen3.5-397B as the teacher, which is given no example prompt rules.
The three prompts are then evaluated on thirteen held-out generated floors, one episode per floor.
As a reference, Qwen3.5-397B and Qwen3.6-35B are run on the simple floor with the rules-only prompt under both observations and with the hand-written prompt under the bare observation ($N = 3$ each).

Five hypotheses were stated before the runs:

- **G1.** Under the full observation, the evolved prompt improves on the rules-only prompt by at most 0.05 mean goal score on the held-out floors, and the rules-only prompt performs about as well as the hand-written prompt.
- **G2.** The gain from optimisation is larger under the bare than under the full observation.
- **G3.** The rules-only prompt under the full observation beats the evolved prompt under the bare observation.
- **G4.** A gain on the training floors that does not carry over to the held-out floors is read as overfitting.
- **G5.** Qwen3.5-397B wins the simple floor with the rules-only prompt under the full observation in at least two of three episodes, and in none under the bare observation.

### 6.5.2 Results

**Table 6.6:** Held-out generated floors (13, one episode each): kills and mean goal score per prompt. Rules-only = game rules only; Evolved = output of the (1+1) loop from the rules-only prompt; Hand-written = single-floor prompt. Differences in the text are computed from unrounded scores.

| Model | Observation | Rules-only | Evolved | Hand-written |
|---|---|---|---|---|
| Llama-3.1-8B | full | 8 / 0.556 | 10 / 0.646 ᵃ | 9 / 0.660 |
| Llama-3.1-8B | bare | 5 / 0.462 | 4 / 0.399 | 6 / 0.484 |
| DeepSeek-V4-Flash (no thinking) | full | 10 / 0.820 | 11 / 0.846 | 11 / 0.850 |
| DeepSeek-V4-Flash (no thinking) | bare | 9 / 0.678 | = rules-only ᵇ | 7 / 0.543 |

ᵃ The optimiser returned its seed; this prompt is byte-identical to the rules-only prompt.
ᵇ The optimiser accepted no revision and returned the seed.

No episode ended in death (Table 6.6).

**Noise floor.**
When the optimiser keeps its seed, the evolved arm is the rules-only prompt played a second time.
Four such pairs exist on the same thirteen floors: Llama-3.1-8B under the full observation in Table 6.6 (note ᵃ) and the three cells of the second configuration (below) that kept the seed.
Their mean goal scores differed by +0.089 (Llama-3.1-8B, full observation, Table 6.6), +0.051 (the same cell in the second configuration), −0.043 (Llama-3.1-8B, bare) and −0.132 (DeepSeek-V4-Flash, full).
On the training floors, the same starting prompt scored 0.463 and 0.602, 0.775 and 1.000, and 0.607 and 0.387 in two evaluations each.
With one episode per floor, differences between candidates inside an optimisation run (0.01 to 0.24) are of the same size as differences between two evaluations of one prompt.
The latter reach 0.225 on the training floors and 0.132 on the held-out floors.

**Hypotheses.**
G1 is supported in part.
Under the full observation, the one evolved prompt that differs from its seed (DeepSeek-V4-Flash) gains 0.025, within the pre-registered 0.05.
The Llama-3.1-8B difference of +0.089 exceeds 0.05 but lies between two byte-identical prompts (note ᵃ).
The hand-written prompt scores 0.104 (Llama-3.1-8B) and 0.030 (DeepSeek-V4-Flash) above the rules-only prompt, within the spread of repeated evaluations of one prompt (up to 0.132, above).
The results do not support G2: under the bare observation, the evolved prompt for Llama-3.1-8B scores 0.063 below its seed on the held-out floors, and the optimiser kept the seed for DeepSeek-V4-Flash.
G3 is supported for both models (Llama-3.1-8B 0.556 against 0.399; DeepSeek-V4-Flash 0.820 against 0.678, where the evolved prompt is the seed).
G4: the one training gain under the full observation (DeepSeek-V4-Flash, from 0.775 for the seed to 0.859) did not survive paired re-evaluation.
Played again on the training floors, the evolved prompt scored 0.775 and the rules-only prompt 0.859.
G5 is supported: Qwen3.5-397B and Qwen3.6-35B each win the simple floor in 2/3 [0.21, 0.94] episodes with the rules-only prompt under the full observation.
Under the bare observation, they win none with either prompt (0/3 [0.00, 0.56] each).

**A second configuration.**
The teacher's trace was extended to show, at every decision, the options offered and a longer reasoning excerpt, and DeepSeek-V4-Flash replaced Qwen3.5-397B as teacher.
On a stored request that had led the first teacher to write a harmful rule ("fight the boss even if lethal"), the new configuration produced a correct diagnosis.
In three of four cells, the optimiser again kept the seed.
The one accepted rewrite (DeepSeek-V4-Flash, bare observation) raised the training score from 0.387 to 0.624, about as much as two evaluations of the seed differ on those floors (0.387 and 0.607).
On the held-out floors it equalled the rules-only prompt (9/13 [0.42, 0.87] each).

**What the evolved prompts contain.**
Table 6.7 sets the prompt rules of the hand-written prompts against what evolution wrote on its own.
Every rule of the single-floor and tower prompts was written for this thesis from the sources of Table 4.2; none was copied from an evolved prompt.
The table counts, for each rule, the candidates that state it: the forty candidates of the first study and the fourteen of the second (Section 6.5.3).
All were written from the rules-only prompt by a teacher that was given no example prompt rules.

**Table 6.7:** Origin of the prompt rules of the hand-written prompts and how often prompt evolution rediscovered them. Origin = source of the strategy principle in Table 4.2 (S-number in parentheses). First study = forty candidates of the (1+1) loop (Section 6.5.2); second study = the seven new candidates of each of the (1+1) loop and the Pareto loop (eight per loop including the starting prompt), with DeepSeek-V4-Flash with thinking and the bare observation (Section 6.5.3). Counted by keyword patterns (Appendix D). — in the Origin column: not a rule of the hand-written prompts; — in the last column: no line of the full observation expresses the rule.

| Rule | Origin | First study | Second study, (1+1) | Second study, Pareto | Expressed in the full observation by |
|---|---|---|---|---|---|
| collect stat items before the fights they make cheaper ᵃ | combat formula, exact solver (S3) | 37/40 | 7/7 | 7/7 | net stat-route line, fight-order line, cost at maximum stats |
| take the cheapest progress first (lowest effective cost) | design of this thesis (definition of the effective cost) | 26/40 | 6/7 | 4/7 | effective cost, fight-order line |
| never pay HP for a fight that unlocks nothing needed | exact solver (S5) | 30/40 | 7/7 | 6/7 | OPTIONAL tag, alternative-route tag |
| open doors only when what lies behind is needed | exact solver (S6) | 14/40 | 7/7 | 6/7 | DEAD END tag, key line |
| no fight above 40 % of current HP (tower: 60 %) | design of this thesis (S7) | 3/40 | 2/7 | 0/7 | — |
| keys are scarce | exact solver (S6) | 0/40 | 0/7 | 1/7 | key budget |
| scout the next floor first; shop rules (tower only) | tower structure (S8); combat formula, expert walkthrough (S9) | not applicable (single floors) | | | way-up line, shop lines |
| *Rules evolution added:* trust the engine's annotations | — | 32/40 | 2/7 ᵇ | 3/7 ᵇ | — |
| *Rules evolution added:* fight the boss only when winnable and after the stats | — | 18/40 | 4/7 | 1/7 | boss line, WINNABLE tag |
| *Rules evolution added:* make the reasoning and the chosen action agree | — | 8/40 | 0/7 | 0/7 | — |

ᵃ The rules-only prompt already contains a sentence that the pattern matches, so this row overstates rediscovery.
ᵇ The second study used the bare observation, which shows no annotations.

Three of the first four rules appear in most candidates of both studies.
These are stat items first (37/40, 7/7, 7/7, partly already in the rules-only prompt), no HP for unneeded fights (30/40, 7/7, 6/7) and cheapest progress first (26/40, 6/7, 4/7).
Opening doors only when needed appears in 14 of 40 first-study and 13 of 14 second-study candidates.
The rule 4 threshold (S7) and key scarcity (S6) were almost never written (5 and 1 of 54 candidates).

**The one rewrite that changed behaviour.**
The accepted rewrite for DeepSeek-V4-Flash under the bare observation (Listing A.4) states: "A fight is necessary only if that monster currently blocks your path to an uncollected gem/potion/key, or to the boss. … If the boss is the only remaining goal and the boss fight shows a positive HP-after, take the boss immediately."
The rewrite was taken to confirmation after a trial with three episodes on each of four held-out floors (gen10, gen12, gen13 and gen14).
These four floors had been chosen because the rewrite had won each of them in the single-episode evaluation.
The pre-registered confirmation covered all thirteen held-out floors with three repetitions each, the trial episodes included.
It passed its criterion of more kills and a one-sided sign test at $p < 0.05$ (Section 5.9.4).
The rewrite won 30/39 [0.62, 0.87] episodes and the rules-only prompt 24/39 [0.46, 0.75], with discordant pairs 7 : 1 ($p = 0.035$) and mean goal score 0.724 against 0.613.
The effect is carried by two floors, gen08 and gen12, on which the rules-only prompt stops fighting with the boss alive and HP to spare.
On the nine floors not used in the trial, the discordant pairs are 3 : 1 ($p = 0.31$; Figure 6.3).

![Paired confirmation per floor](/thesis/img/6.3.png)

**Figure 6.3:** Paired confirmation of the evolved prompt for DeepSeek-V4-Flash (no thinking) under the bare observation: kills out of three episodes per generated floor for the rules-only and the evolved prompt. Arrows mark floors on which the two differ; grey floors belong to the earlier trial after which the rewrite was taken to confirmation.

**The complex floor.**
A further pre-registered run started the optimiser from the hand-written single-floor prompt on the complex floor alone (Qwen3.6-35B, full observation, six evaluations of two episodes each).
The prediction was that no evolved prompt would win, because the only prompts that ever won this floor encode a route (the solver-route prompt of Section 5.4, Listing A.5).
The prediction held: no episode reached the boss during optimisation, and at $N = 5$ the single-floor prompt and its evolved version both won 0/5 [0.00, 0.43].

### 6.5.3 Second Study: Population Versus Single Lineage

The second study repeats the setting of the first study's only confirmed gain, the bare observation, with three changes.
The task model reasons (DeepSeek-V4-Flash with thinking).
The same model is the teacher and sees the options offered at every decision.
Two loops with the same budget of eight candidates are compared: the (1+1) loop and the Pareto loop of Section 5.7 (Table 5.2).
Both start from the rules-only prompt and train on the simple floor, gen01 and gen02.
The rules-only prompt and the best prompt of each loop are then played on the thirteen held-out floors three times each, paired by floor and repetition.
The study was not pre-registered, so its sign tests are two-sided (Section 5.9.4).

**Table 6.8:** Second study: training score of the best candidate and held-out result (13 floors × 3, DeepSeek-V4-Flash with thinking, bare observation). Sign test on the episodes in which exactly one of the two prompts won, two-sided. Bold = best held-out result; — = not applicable.

| Prompt | Training score | Held-out kills | Held-out goal score | Against rules-only (only rules-only wins : only this prompt wins) |
|---|---|---|---|---|
| Rules-only | 0.597 | **32/39** | **0.737** | — |
| (1+1) loop, best of 8 | 0.732 | 26/39 | 0.620 | 7 : 1, $p = 0.07$ |
| Pareto loop, best of 8 | 0.678 | 24/39 | 0.602 | 8 : 0, $p = 0.008$ |

Both loops raised the training score, and both best prompts score below the rules-only prompt on the held-out floors (Table 6.8).
The rules-only prompt wins 32/39 [0.67, 0.91] episodes, the best prompt of the (1+1) loop 26/39 [0.51, 0.79] ($p = 0.07$) and that of the Pareto loop 24/39 [0.46, 0.75] ($p = 0.008$).
The two evolved prompts differ in 4 : 2 discordant pairs ($p = 0.69$).
No episode ended in death; the evolved prompts stop with the boss alive where the rules-only prompt fights it.
The gain on the training floors is therefore overfitting in the sense of hypothesis G4, now with a model that reasons and a teacher that sees every option.

The Pareto selection did not operate as intended.
All eight candidates of the Pareto loop scored exactly the same on the simple floor (0.325) and on gen01 (0.762).
On these two floors, no rewrite changed the outcome of the episode at temperature 0.
Every candidate was therefore best on at least one floor, and the frontier contained the whole population.
Parents and the reported best were chosen on gen02 alone, the one floor on which the candidates' scores differed (0.550 to 0.948).
The merge of the two best candidates scored exactly as one of its parents.

### 6.5.4 Evolving a Route Without the Validator

The last run asks whether evolution can compile from its own traces what the solver found by search.
On the complex floor alone, the (1+1) loop started from the single-floor prompt with the validator switched off.
The teacher was told that the prompt is used on this floor only and may contain positions, orders and conditions.
It saw every trace with the options offered and the end state, but never the solver's route.
DeepSeek-V4-Flash with thinking was task model and teacher; the budget was 15 evaluations of two episodes.
The best prompt, the *evolved-route prompt*, was then played five times.
Three predictions were stated before the run: a win appears within the 15 evaluations (P1); the evolved-route prompt names the yellow door (10,5), which the solver-route prompt calls a trap and the exact optimum never opens (P2); and its success rate does not exceed the solver-route prompt's 4/5 for this model (P3).

No episode was won in training (scores 0.133 to 0.175 in all 15 evaluations) or in the five evaluation episodes (0/5 [0.00, 0.43]), all of which ended alive (2 to 155 HP).
The results do not support P1 and P2, and P3 holds trivially.
Although positions were allowed, no candidate named one.
Every rewrite stayed a general rule set, and the evolved-route prompt sharpened the reading of the annotations instead ("If min-cost@maxStats is 0 or much lower, the fight MUST be deferred").
One of its rules reads "NEVER fight a monster with lookahead=0 or effCost=None — it is a dead end".
It forbids exactly the Black Slime (12,9), the only fight that keeps the boss winnable at turn 9 (Section 6.4.5).
The teacher diagnosed from the traces what the agent did, not which earlier decision lost the floor.

## 6.6 Planning Horizon (RQ3)

The planning study varies the planning horizon: it compares the reactive mode with the committed modes of Section 5.5.2.
Each scenario uses the prompt that wins it, and each model is compared with its own reactive arm.
Episodes and runs affected by four defects of the plan harness and by reasoning caps that truncated plan answers are excluded and described in Appendix D.6.
The two long-plan modes were run with two instructions.
The *whole-floor wording* asks for the plan "for the rest of this floor … up to the goal".
The *max-steps wording* (Listing A.8) asks for "as many of the actions you will take after it as you can", so that the model, not the instruction, sets how far it commits.

**Table 6.9:** Success $k/N$ and model calls per episode (in parentheses) by planning mode. Commit-$k$ = the model commits to $k$ actions per call; long plan = the model commits to as many actions as it can (at most 59), re-planned when a step breaks or written in a single call for the whole episode (on the tower: one plan per floor). Long-plan cells give whole-floor wording / max-steps wording; DeepSeek-V4-Flash reactive cells give reasoning caps of 16,384 / 32,768 tokens. Complex route = complex floor with the solver-route prompt (Listing A.5). Tower = highest floor reached with the second tower observation (Section 6.7.3); reactive: three runs, other modes: one run each. Reactive single-floor cells are the earlier episodes of the final configuration, run on the same version of the code as the committed modes (Table D.4), and can therefore differ from Tables 6.2 and 6.11. Bold = highest success rate in the row (not marked where all modes tie); — = not run.

| Floor | Model | Reactive | Commit-2 | Commit-3 | Commit-5 | Long plan, re-planned | Long plan, single call |
|---|---|---|---|---|---|---|---|
| Simple | Qwen3.5-397B | **10/10** (17.0) | 1/5 (9.6) | 0/5 (7.6) | 0/5 (5.2) | 0/5 (3.6) / 0/5 (4.6) | 0/5 (1.0) / 0/5 (1.0) |
| Simple | DeepSeek-V4-Flash | **3/5** (16.8) / 1/5 (17.0) | 0/5 (9.6) | 0/5 (7.8) | 0/5 (5.8) | 0/5 (5.4) / 0/5 (6.2) | 0/5 (1.0) / 0/5 (1.0) |
| Simple | Qwen3.8-27B, temperature 0.6 ᵃ | **3/3** (17.0) | 2/3 (9.3) | 0/3 (7.0) | 1/3 (5.0) | — / 0/3 (4.0) | — / no usable plan ᵇ |
| hand01 | DeepSeek-V4-Flash | 4/5 (13.8) / **5/5** (13.0) | — | 0/5 (8.0) | 0/5 (6.4) | — / 0/5 (5.2) | — |
| hand02 | DeepSeek-V4-Flash | **5/5** (9.0) / 4/5 (9.8) | — | 0/5 (7.0) | 0/5 (5.8) | — / 0/5 (5.2) | — |
| Complex route ᶜ | DeepSeek-V4-Flash | 3/5 (21.4) / 8/10 (20.8) | 3/5 (15.6) | 3/5 (9.6) | 4/5 (5.8) | 4/5 (3.0) / **5/5** (2.4) | 0/5 (1.0) / 0/5 (1.0) |
| Complex route ᶜ | Qwen3.8-27B, temperature 0.6 ᵃ | 3/3 (20.0) | 3/3 (10.3) | 3/3 (7.0) | 3/3 (4.7) | — / 3/3 (2.0) | — / 0/3 (1.0) |
| Tower | DeepSeek-V4-Flash | MT8, MT8, MT8 (86) | MT8 (72) | MT8 (60) | MT8 (58) | — / MT8 (66) | — / MT3 (2) |

ᵃ Reasoning cap 32,768 tokens. Earlier episodes of this model are excluded (Appendix D.6).
ᵇ The single plan could not be parsed in any of the three episodes, so the heuristic played them (443 HP, boss untouched); not counted as a result.
ᶜ Run without the mechanical overrides and the automatic 0-HP fights (Section 5.4).

On the simple floor, one of 70 committed-plan episodes of Qwen3.5-397B and DeepSeek-V4-Flash wins (1/70 [0.00, 0.08]; Qwen3.5-397B, commit-2), against 14/20 [0.48, 0.85] reactive episodes of the same two models.
None of the 20 episodes with the max-steps wording wins.
Qwen3.8-27B at temperature 0.6 loses less sharply but in the same direction.
It wins 3/3 [0.44, 1.00] reactively, 3/9 [0.12, 0.65] with commit-2, -3 and -5 plans, and none of three with re-planned long plans (the single-call plan could not be parsed).
Every failure ends alive, with 287 to 572 HP and the boss not killable; no committed episode dies.
Even the smallest commitment wins less often: Qwen3.5-397B wins 1/5 at commit-2 against 10/10 reactively, and DeepSeek-V4-Flash 0/5 against 1/5 at the same reasoning cap.
The hand-designed floors on which reactive play succeeds show the same pattern.
On hand01 and hand02, DeepSeek-V4-Flash wins 18/20 [0.70, 0.97] reactive episodes over both reasoning caps and none of 30 committed episodes (0/30 [0.00, 0.11]; commit-3, commit-5 and re-planned max-steps plans), every one alive.
Of the 87 broken plans on these floors, 50 break at a fight placed where it cannot yet be won.

The number of calls falls with $k$, but the number of actions actually committed grows much more slowly.
A simulation of every stored plan (Table 6.10) shows that commit-5 plans commit about three new decisions per plan on average.
Long re-planned plans commit about five on the simple and hand-designed floors (3.63 to 6.77).
On the simple floor with the whole-floor wording, re-planned long plans are legal throughout in 6 of 40 cases and single-call plans in none of 10 (none of 15 with the complex floor).
They name monsters that are not yet reachable and fights that cannot yet be won at the point where the plan puts them.
With the max-steps wording, the plans become shorter and more often legal.
A single-call plan commits 5.8 (Qwen3.5-397B) or 6.6 (DeepSeek-V4-Flash) new decisions instead of 11.0 and 15.6.
Of the single-call plans, 3 of 5 and 4 of 5 are clean instead of none.
Of the re-planned plans, 8 of 20 and 12 of 27 are clean instead of 1 of 13 and 5 of 27.
Success stays at 0/5 [0.00, 0.43] for both models, also in the episodes whose plans are clean.

**Table 6.10:** Plan check. New / plan = mean number of new decisions per committed plan; Clean = plans with no broken step. WF = whole-floor wording, MS = max-steps wording.

| Floor | Model | Mode | New / plan | Clean |
|---|---|---|---|---|
| Simple | Qwen3.5-397B | commit-2 / 3 / 5 | 1.64 / 1.71 / 3.23 | 35/44, 25/35, 14/22 |
| Simple | Qwen3.5-397B | long re-planned / single call (WF) | 6.77 / 11.0 | 1/13, 0/5 |
| Simple | Qwen3.5-397B | long re-planned / single call (MS) | 4.05 / 5.8 | 8/20, 3/5 |
| Simple | Qwen3.8-27B, temperature 0.6 | commit-2 / 3 / 5 | 1.59 / 1.94 / 3.46 | 23/27, 14/18, 9/13 |
| Simple | Qwen3.8-27B, temperature 0.6 | long re-planned (MS) | 5.33 | 3/9 |
| Simple | DeepSeek-V4-Flash | commit-2 / 3 / 5 | 1.84 / 1.78 / 2.86 | 33/44, 25/36, 15/28 |
| Simple | DeepSeek-V4-Flash | long re-planned / single call (WF) | 4.89 / 15.6 | 5/27, 0/5 |
| Simple | DeepSeek-V4-Flash | long re-planned / single call (MS) | 3.63 / 6.6 | 12/27, 4/5 |
| hand01 | DeepSeek-V4-Flash | commit-3 / 5 | 1.91 / 3.19 | 20/34, 9/31 |
| hand01 | DeepSeek-V4-Flash | long re-planned (MS) | 5.92 | 6/26 |
| hand02 | DeepSeek-V4-Flash | commit-3 / 5 | 1.62 / 2.78 | 19/26, 9/23 |
| hand02 | DeepSeek-V4-Flash | long re-planned (MS) | 4.43 | 11/21 |
| Complex route | DeepSeek-V4-Flash | commit-2 / 3 / 5 | 1.19 / 1.50 / 2.86 | 70/77, 40/48, 25/29 |
| Complex route | DeepSeek-V4-Flash | long re-planned (WF / MS) | 8.60 / 7.83 | 5/15, 7/12 |
| Complex route | DeepSeek-V4-Flash | single call (WF / MS) | 18.0 / 14.0 | 0/5, 1/4 |
| Complex route | Qwen3.8-27B, temperature 0.6 | commit-2 / 3 / 5 | 1.63 / 2.00 / 3.93 | 29/30, 21/21, 12/14 |
| Complex route | Qwen3.8-27B, temperature 0.6 | long re-planned / single call (MS) | 9.50 / 18.0 | 3/6, 0/3 |

On the complex floor with the route listed in the prompt, the results differ.
With the same reasoning cap as its committed modes, DeepSeek-V4-Flash wins 8/10 [0.49, 0.94] reactively with 20.8 calls per episode.
Commit-5 plans commit 2.86 new decisions each, 25 of 29 run clean, and the mode wins 4/5 [0.38, 0.96], three kills at 22 HP, with 5.8 calls per episode.
Re-planned long plans commit about eight new decisions each and win 4/5 with the whole-floor wording (3.0 calls) and 5/5 [0.57, 1.00] with the max-steps wording (2.4 calls), every kill at 22 HP.
At these sample sizes, the intervals of commit-5 and re-planned long plans (4/5 and 5/5) overlap with that of reactive play (8/10), with 5.8 to 2.4 calls per episode against 20.8.
Qwen3.8-27B at temperature 0.6 wins 3/3 [0.44, 1.00] in every re-planned mode, down to 2.0 calls per episode with max-steps plans.
Commit-2 is close to reactive play in practice for DeepSeek-V4-Flash, because in 68 of 77 plans the model repeated its chosen action as the first planned entry, even after the instruction that had invited this was corrected (Appendix D.6).
Single-call plans, although the route is in the prompt, win none with either model or wording; 11 of 12 single-call plans contain a broken step (Table 6.10).
Figure 6.4 sets the two floors side by side.

![Success and calls by planning mode](/thesis/img/6.4.png)

**Figure 6.4:** Success rate by planning mode on the simple floor and on the complex floor with the solver-route prompt. The labels give $k/N$ and, in parentheses, the mean number of model calls per episode. R = reactive (DeepSeek-V4-Flash: both reasoning caps pooled); C2, C3, C5 = commit-2, -3, -5; LP = long plan, re-planned; SC = single call; WF = whole-floor wording; MS = max-steps wording. Qwen3.8-27B was run at temperature 0.6 and with the max-steps wording only; its single-call cell on the simple floor is not shown (no usable plan).

On the tower, the planning modes were compared with the second tower observation (Section 6.7.3).
With it, DeepSeek-V4-Flash reaches MT8 in all three reactive runs (86 calls on average).
It also reaches MT8 with commit-2, commit-3 and commit-5 plans (72, 60 and 58 calls) and with re-planned max-steps plans (66 calls).
A single plan per floor stops on MT3 at 5 HP after two calls.
In each commit-$k$ run, the engine itself takes about 120 of the roughly 205 turns (collection, 0-HP fights, scouting).
Of the remaining decisions, the commit-3 and commit-5 runs take 29 and 31 from their plans.

**Executing the exact optimum.**
The exact-route prompt (Listing A.6), a second compiled-knowledge condition, lists the 21 decisions of the exact optimal route with the expected HP after each; it is played reactively.
Qwen3.6-35B wins 2/5 [0.12, 0.77] with it, both at 58 HP (0.85 of the optimum), the highest HP of any LLM kill on the complex floor.
DeepSeek-V4-Flash wins 1/5 [0.04, 0.62], at 40 HP.
Both winning episodes of Qwen3.6-35B follow all 21 listed decisions; one of its three failures ends with the hero dead, because this condition, like the solver-route prompt, runs without the mechanical overrides (Section 5.4).
Every failure leaves the listed route by the model's own choice.
Three of five DeepSeek-V4-Flash episodes leave it at the same decision, taking a fight shown at 43 HP instead of the listed one shown at 185.

## 6.7 Hand-Designed Floors, Generated Floors and the Tower

### 6.7.1 Hand-Designed Floors

Table 6.11 combines the design mechanisms of Table B.2 and the per-decision analysis of Section 4.6.3 with the results of Table 6.2.

**Table 6.11:** Hand-designed floors: design, exact optimum and results of the final configuration, the episodes of Table 6.2 (five episodes per cell; $k/N$ with HP/opt in parentheses; reasoning caps as in Table 6.1, DeepSeek-V4-Flash 32,768 tokens). Critical = actions on the optimal route at which at least one alternative makes the boss unwinnable; Forced = actions at which every alternative does.

| Floor | Design | $\text{HP}_{\text{opt}}$ | Critical / forced | Qwen3.5-397B | DeepSeek-V4-Flash | Qwen3.6-35B | Mistral Medium 3.5 |
|---|---|---|---|---|---|---|---|
| hand01 | four yellow doors and one blue door; rooms reached by a door or past a monster | 14 | 13 / 3 | 5/5 (0.50) | 4/5 (0.66) | 4/5 (0.64) | 5/5 (0.64) |
| hand02 | defence thresholds; two keys for four doors | 13 | 8 / 3 | 4/5 (0.48) | 5/5 (0.28) | 3/5 (0.31) | 5/5 (0.86) |
| hand03 | the complex floor's special-ability monsters on a 13 × 13 layout | 9 | 8 / 8 | 0/5 | 0/5 | 0/5 | 0/5 |
| hand04 | six yellow doors for two keys, a costly shortcut, a blue door before the boss | 3 | 12 / 11 | 0/5 | 0/5 | 0/5 | 0/5 |

The four models agree floor by floor.
Each wins hand01 and hand02 in most episodes, and none wins hand03 or hand04 (0/20 on each floor).
Which floors are won does not follow the number of critical actions.
The floor hand01 has 13 and is won; hand03 has 8 and is not.
The number of forced actions is 3 on hand01 and hand02, and 8 and 11 on hand03 and hand04; the simple floor, with 17 critical and 10 forced actions, is won by Qwen3.5-397B in 15 of 15 episodes.
On hand03, the models repeatedly choose fights they cannot win.
The engine replaced 57 such choices in the 20 episodes with a mechanical override, 9 to 20 per model.
On hand04, they repeatedly choose doors marked as dead ends (48 mechanical overrides, 10 to 18 per model).
Every episode on these two floors ends alive, with only unwinnable fights or dead ends left.

On hand01 (Figure B.2), the hero starts at (5,10) with one yellow key, between two yellow doors: (4,8) opens the left wing and (6,8) the right wing.
Within the lookahead, the observation shows +2 ATK, +1 DEF and two yellow keys behind the left door for 112 HP of fighting, and +1 ATK, +1 DEF, a yellow key and the blue key behind the right door for 48 HP; the blue key opens the blue door (5,2) on the way to the boss.
Every episode opens one of the two doors at its first decision.
The exact solver gives an optimum of 14 HP after the left door at (4,8) and at most 10 HP after the right door at (6,8).
In 18 of the 20 episodes, the model opened the right door first.
These are all five episodes of Qwen3.5-397B, Qwen3.6-35B and Mistral Medium 3.5 and three of DeepSeek-V4-Flash.
All 17 wins among these 18 episodes end at 4 to 9 HP.
In the other two episodes, DeepSeek-V4-Flash opened the left door first; one won at 10 HP, and the other ended alive at 153 HP with the boss not defeated.
The observation at this decision (Appendix G, Listing G.4) rates the right door higher on both one-step measures.
Its net stat-route balance is −33 against −92 HP, and its net lookahead value 170 against 121.
In all five episodes of Qwen3.5-397B, the reasoning quotes the fight-order line of the Black Slime (5,4), which stands in the central room and blocks nothing.
That line names the right door as the route that makes the fight cheaper.
Appendix G gives the reasoning of DeepSeek-V4-Flash (left door, Listing G.5) and of Qwen3.5-397B (right door, quoting the same line, Listing G.6) at this decision, from episodes of the same configuration on an earlier version of the code.

### 6.7.2 Generated Floors

Most of the fifteen generated floors have more HP slack than the simple and complex floors: on 13 of them, the optimum ends at 150 to 250 HP.
Pooled over all stored episodes of all models, prompts and observations, the kill rate per floor ranges from 18 of 18 to 0 of 18 (Table 6.12).
The heuristic wins eight of the fifteen floors.
With the final configuration, Qwen3.5-397B wins gen01 and gen02 in 3/3 [0.44, 1.00] episodes each, at the exact optimum (168 and 232 HP).
It also wins gen03, the only generated floor with an optimum as low as the simple floor's (13 HP), in the one episode that was run, at the exact optimum.
DeepSeek-V4-Flash was run with the final configuration and a reasoning cap of 16,384 tokens, three episodes on each of the thirteen floors gen03 to gen15.
These floors were not used to develop the single-floor prompt or the annotations.
It wins 31/39 [0.64, 0.89], at 0.96 of the optimum on average and in 11 episodes exactly at it.
It wins 18/18 [0.82, 1.00] on the six of these floors that the heuristic wins, and 13/21 [0.41, 0.79] on the seven that the heuristic loses.
The floors gen11 and gen12 are lost in all three episodes, alive.
On the same thirteen floors, three episodes each, the same model won 32/39 with the bare observation and the rules-only prompt (Section 6.5.3, Table 6.8).
With this much HP slack, the generated floors therefore do not separate the observation conditions.
The evidence for the annotations comes from the simple floor and from hand01 and hand02 (Sections 6.3 and 6.4.3).

**Table 6.12:** Generated floors: exact optimum, heuristic result and pooled LLM kills over all stored episodes except the paired confirmation episodes of Section 6.5.2 (a difficulty signal, not a comparison of conditions).

| Floor | $\text{HP}_{\text{opt}}$ | Heuristic | LLM kills | Floor | $\text{HP}_{\text{opt}}$ | Heuristic | LLM kills |
|---|---|---|---|---|---|---|---|
| gen01 | 168 | win | 18/18 | gen09 | 204 | win | 18/18 |
| gen02 | 232 | win | 15/18 | gen10 | 88 | fail | 6/18 |
| gen03 | 13 | fail | 5/19 | gen11 | 194 | fail | 0/18 |
| gen04 | 225 | win | 14/18 | gen12 | 182 | fail | 8/18 |
| gen05 | 172 | fail | 13/18 | gen13 | 207 | win | 14/18 |
| gen06 | 242 | win | 18/18 | gen14 | 151 | fail | 11/18 |
| gen07 | 222 | win | 18/18 | gen15 | 216 | win | 16/18 |
| gen08 | 250 | fail | 11/18 | | | | |

### 6.7.3 The Tower

The tower runs use the tower prompt (Section 5.4) and the tower loop of Section 5.5.3.
Table 6.13 lists the runs from MT0 with the final tower observation and, for comparison, with two earlier tower observations, together with the continuations of one stored run from MT18.
The first observation offered only the actions of the current floor, the up-staircase and returns to earlier floors.
The second, also used in the planning study (Section 6.6), offered every reachable object on every visited floor, a tower-wide key budget and the price of the way to an unreached shop.
Both earlier observations ran with the item values of another edition of the game (Section 4.5.2), with the 40 % override of Section 5.6 and with rule 4 at 40 %; their runs are therefore engine-assisted (Section 5.6).
The comparison is therefore one between whole configurations, not between observations alone.

**Table 6.13:** Tower runs from MT0 with three tower observations. Highest floor reached per run; ATK / DEF at the end of the best run. First and second = the two earlier observations described above, with the item values of another edition, the 40 % override, rule 4 at 40 % and the shop rule "ATK above the highest DEF in scope". Final = the observation of Section 5.5.3 (the game's item values, no override, rule 4 at 60 %, plan memory, level-ups offered, no yellow or blue keys for sale). Resumed = a stored run continued from MT18 with the final observation and blue keys for sale (see text).

| Agent (observation) | Runs | Highest floor | ATK / DEF | Stopped because |
|---|---|---|---|---|
| heuristic, depth 3 ᵃ | 1 | MT8 | 113 / 82 | Red Bats lethal |
| Qwen3.5-397B (first) | 1 | MT7 | 36 / 35 | stuck; 131 EXP unspent |
| DeepSeek-V4-Flash (first) | 5 | MT7 (4), MT3 | 33 / 38 | stuck; one run at 25 HP on MT3 |
| Qwen3.5-397B (second) | 1 | MT8 | 81 / 117 | Red Bats unaffordable |
| DeepSeek-V4-Flash (second) | 3 | MT8 (3) | 92 / 106 | Red Bats unaffordable |
| Qwen3.5-397B (final) | 3 | MT18, MT8 (2) | 1,257 / 1,996 | MT18: no blue key left; MT8: only lethal fights |
| DeepSeek-V4-Flash (final) | 3 | MT17 (2), MT8 | 1,346 / 1,066 | MT17: upgraded monsters; MT8: Senior Mage lethal |
| Qwen3.6-35B (final) | 3 | MT16, MT8 (2) | 552 / 1,133 | MT16: Red Demon King unwinnable; MT8: Red Bats lethal |
| Mistral Medium 3.5 (final) | 3 | MT8, MT4 (2) | 98 / 100 | MT4: Skeletons lethal at 5 and 30 HP |
| Qwen3.5-397B (resumed) | 1 | **MT21, normal ending** | 2,264 / 2,558 | won |
| DeepSeek-V4-Flash (resumed) | 3 | MT21 (2), MT20 | 2,294 / 3,633 | turn limit (860) |

ᵃ The rule-based heuristic reads no prompt; it reaches MT8 with both sets of item values.

**First and second observation: MT7 and MT8.**
With the first observation, every run stopped at or below MT7.
Qwen3.5-397B bought four DEF and one ATK at the MT3 shop, DEF first as the prompt requires, and ended with 131 experience points unspent.
The experience shop on MT5 lies behind a Big Bat that cost 55 % of the hero's HP.
With the second observation, all four runs passed MT7, spent their experience and stopped on MT8 with ATK between 79 and 92.
Only the run with ATK 92 met the shop rule of those observations, ATK above the highest DEF in scope, here the Red Bats' DEF of 90.
Even at ATK 92, the Red Bats cost about 15,000 HP.

**Final observation: the Red Demon King and the scripted events.**
With the final observation, the runs that pass MT8 meet the obstacles that the expert walkthrough describes as the second half of the game.
On MT16, the Red Demon King (ATK 1,000) guards the way up behind a red door.
The key-reserve line of the final observation warns when a door off the way up would leave no red key for it, and the red door states the price of one (Section 5.5.3).
The three runs that passed MT16 defeated the King.
The Qwen3.6-35B run that reached MT16 could not win the fight at ATK 552 and ended stuck on MT9.
Killing the King triggers a scripted upgrade of the later monsters (Section 4.5.3).
After it, the monsters on MT17 need ATK above about 1,100 and cost 2,000 HP and more.
Both DeepSeek-V4-Flash runs that reached MT17 stopped there, with ATK 1,048 and 1,346.
One of the two had never used the first scripted event of the thief, which opens an MT2 room with eight gems, the Steel Sword and the Silver Shield.
The run of Qwen3.5-397B that passed MT17 reached MT18 with ATK 1,257 and DEF 1,996.
Eight of the twelve runs stop on MT8 or below, the floor where the heuristic also stops.

**MT18 and the princess.**
In the game, the up-staircase of MT18 appears only after the hero talks to the princess.
Her cell is opened by the thief of MT4 once the hero brings him the Ice Pickaxe from MT12, which lies behind a blue door.
The staircase of MT20 appears when the Cross is handed in.
In the final configuration, no shop sells blue keys (Section 4.5.2).
The run of Qwen3.5-397B reached MT18 with no blue key left, although the event line named the blue door and the missing key.
The rest of the tower was therefore tested from a stored position on MT18, with blue keys offered for sale as the original game does (50 g at the Key Seller on MT5).
The position is the arrival on MT18 (turn 708, ATK 1,346, DEF 1,314) of a run of Qwen3.5-397B with a predecessor of the final observation, which lacked the purchase quantities, the vampire tag and the event lines and had used its last blue keys on three doors of MT7 about 100 turns earlier.
It was continued four times with the final observation and blue keys for sale.
Qwen3.5-397B bought one blue key, fetched the pickaxe, gave it to the thief and freed the princess.
It then climbed to MT19, defeated the last White Warrior on MT7 for the Cross and handed the Cross in.
At turn 832 it defeated the Nether Demon King on MT21, the normal ending of the game.
The three DeepSeek-V4-Flash continuations reached MT20, MT21 and MT21 before the turn limit of 860, 152 turns after the resumption.
From this position, one of four continuations reached the normal ending (1/4 [0.05, 0.70]).
