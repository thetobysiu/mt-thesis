# Chapter 7: Discussion and Conclusion

This chapter interprets the results of Chapter 6 in light of the research questions.
Section 7.1 discusses the results one comparison at a time.
Section 7.2 examines the three rival explanations stated in Chapter 1, and Section 7.3 the methodological lessons of the study.
Section 7.4 states the limitations.
Section 7.5 answers the research questions, Section 7.6 proposes how the work should be continued, and Section 7.7 concludes.

## 7.1 Discussion

### 7.1.1 The Observation Versus the Model

The strongest effect in this thesis is that of the observation.
With model, prompt, temperature and lookahead depth fixed, two annotation lines raised Qwen3.5-397B on the simple floor from 0/5 to 10/10 [0.72, 1.00] (Table 6.5, rows 3 and 4).
The two lines state the cost of reaching stat items and the effect of fight order.
Every observation with fewer than two levels of lookahead or without annotations loses all its episodes: a lookahead of one step or none (0/3 each, Table 6.3), the bare observation (0/3) and the map only (0/2), the last two measured on an earlier version of the code.
The rule-based heuristic, which acts on the same engine output, fails the floor as well.
The language model therefore contributes something the heuristic lacks, but only once the engine has made the relevant quantities legible.
The effect does not appear to be specific to the simple floor, on which the observation was developed.
DeepSeek-V4-Flash wins 9 of 10 episodes [0.60, 0.98] on hand01 and hand02 and loses all ten with the bare observation (Section 6.3).
On thirteen held-out generated floors, which leave more HP slack, it wins 31 of 39 [0.64, 0.89] with the annotations and 32 of 39 with the bare observation and the rules-only prompt (Sections 6.5.3 and 6.7.2).
These floors therefore do not separate the two observations.
The depth of lookahead that is needed appears to depend on the floor.
On hand01 and hand02, DeepSeek-V4-Flash wins as often with one step of lookahead as with three (5/5 and 4/5 against 4/5 and 5/5).
On the simple floor, by contrast, the stat item that decides the door choice lies beyond a one-step tree.

The error analysis shows what "legible" means.
At the decisions whose reasoning was read, the model cited an annotation that stated one side of a trade-off and omitted the other (Section 6.4.2).
Five kinds of this defect were identified, on the simple floor and the complex floor.
They are a saving without the cost of reaching it, a value without its cost (potions counted as fight value), an efficiency without its affordability, a deficit without its scope, and a count without its multiplicity.
In each of these cases, the model argued faithfully from the number it was given.
This is a more tractable failure than unfaithful reasoning (Turpin et al., 2023; Lanham et al., 2023).
The chain of thought followed validly from its input, the input was wrong, and the input can be repaired.
This suggests a design rule for engines that annotate an agent's observation.
A quantity should enter the observation only together with the quantity it trades against.
Each new annotation should then be tested at a state where the two disagree.
The repair sequence indicates why the test is needed: two of its steps introduced a new one-sided line, which the next step had to repair (Table 6.5, rows 5 and 8).

The first decision on hand01, a floor not used during development, indicates that the rule is not yet fully met.
In 18 of the 20 episodes of the re-run, the model opened the right door first, after which at most 10 HP is reachable (Section 6.7.1).
These are all five episodes of Qwen3.5-397B, Qwen3.6-35B and Mistral Medium 3.5 and three of DeepSeek-V4-Flash; the other two DeepSeek-V4-Flash episodes opened the left door, which keeps the optimum of 14 HP reachable.
Both one-step measures in the observation rate the right door higher (Appendix G, Listing G.4).
Qwen3.5-397B also reads a fight-order line as advice for that door, although the line belongs to an optional monster and names the door only as the route that makes that fight cheaper.
Every model still wins the floor in most episodes, but none reaches the optimum: the wins after the right door end at 4 to 9 HP, the one win after the left door at 10 HP.
With at most five episodes per model and a single decision, this should be interpreted cautiously.
It suggests that the annotations were refined on the simple floor and carry some of that floor's structure.

### 7.1.2 The Engine Versus the Model

The second finding concerns what the engine does instead of the model.
Every simple-floor win recorded before the overrides were logged, 21 of 21, contained a silent strategic override (Section 6.4.1).
In 17 of them, the replacement came at turn 9, where the engine executed the heuristic's door instead of the model's choice of the Slime Lord.
The early success rate was therefore the rate at which the model's error and the heuristic's replacement coincided.
Reproducing that configuration gave 2/4, and both wins again contained the replacement (Table 6.5, row 1).
With the overrides reduced to mechanical cases and logged, Qwen3.5-397B won 0/5 with the single-floor prompt (Table 6.5, row 2).
Those early wins measured a hybrid of model and heuristic in unrecorded proportions, not the model.

The lesson is likely to apply to other agent evaluations.
The agent under test is the model together with every override between the model and the environment.
An override that is not logged can change the measured success rate as much as a change of model, and it is invisible in the aggregate score.
In the final configuration, all remaining overrides are mechanical (dead-end doors, unwinnable and lethal fights), each one is logged, and none of its wins contains a strategic override.
The tower runs with the two earlier observations ran with a strategic override as well and are therefore reported as engine-assisted (Section 5.6).

### 7.1.3 Finding Versus Following an Order

The complex floor with the single-floor prompt marks the boundary of the approach.
None of the four models wins any of its five episodes there.
Qwen3.5-397B and DeepSeek-V4-Flash also fail it at temperatures 0.6 and 1.0 (Table 6.3).
No model wins hand03 or hand04 in 20 episodes each (Table 6.2).
The boundary does not follow the number of critical actions: hand01 has 13 and is won, hand03 has 8 and is not (Table 6.11).
On the complex floor, the decisive choice is an order of doors and fights that pays off only over many steps.
Exact state values locate the loss.
Every one of the 30 failed episodes with the single-floor prompt (the 20 of the re-run and ten earlier episodes of Qwen3.5-397B, Table B.3) is lost at one fight, 29 of them at the Red Slime (11,8) (Section 6.4.5).
In 28 of them, an earlier door order had already lowered the state value from 68 to 42 or 30, so little slack was left.
The Red Slime costs 103 HP when it is offered at turn 9 and 11 HP where the optimal route takes it.
The only fight that keeps the boss winnable at that turn, the Black Slime (12,9), costs more now (156 HP).
The trap door (10,5) and the blue doors that look like the error come later.
The observation carried both sides of the decisive fight, but the side that favours the right order is spread over a route that the annotation prices as unaffordable.
In 29 of the 30 episodes, the models followed the low effective cost and discarded the line stating that the fight becomes free after the stat items.
No per-decision analysis of the episodes was made for hand03 and hand04, where the models repeatedly chose unwinnable fights and dead-end doors (Section 6.7.1).

When the order is supplied, three of the four models win with it.
With the solver-route prompt, DeepSeek-V4-Flash wins 4/5, Qwen3.5-397B 3/5 and Qwen3.6-35B 4/10 in the re-run of Table 6.2, while Mistral Medium 3.5 wins none and dies in four of five episodes; this condition runs without the mechanical overrides (Section 5.4).
In the reactive arm of the planning study, DeepSeek-V4-Flash won the same condition 8/10 (Table 6.9).
Every win of the re-run ends at 22 HP or below, a third of the optimum, because the prompt's door order caps the result.
With the exact optimal route in the prompt, Qwen3.6-35B reaches 58 of 68 HP in 2 of 5 episodes (Section 6.6).
Where the models leave a given route, they leave it towards the fight that is cheaper now.
Ten of the 14 failures with the solver-route prompt are lost at the same Red Slime, taken out of the prompt's order (Section 6.4.5).
Three of five DeepSeek-V4-Flash episodes with the exact route take a fight shown at 43 HP instead of the listed one shown at 185 (Section 6.6).
This is the same pull as with the single-floor prompt, which suggests that the models weight a cost shown now above a saving that the observation states for later.
The models can follow an order of this length but do not find one.
Finding it is a search problem, which the exact solver solves by expanding 729,953 states (Table 4.3).

### 7.1.4 Observation Design on the Tower

On the tower, the best runs with the final observation reached MT16, MT17 and MT18, against MT7 and MT8 with the first and second observations (Table 6.13).
The comparison is one between whole configurations.
Besides the observation, the item values of the engine, the 40 % override, the threshold of rule 4, the shop rule, plan memory, the key purchases and the level-up offer changed as well, and the contribution of each was not separated.
With the second observation, every run stopped on MT8, where the heuristic also stops, with too little attack for the Red Bats.
With the final observation, eight of the twelve runs still stopped on MT8 or below (Section 6.7.3).
The best runs stopped at failures of resource foresight: a key or attack must be kept or built for a use that the observation shows only much later.
Qwen3.5-397B reached MT18 without the blue key needed on the way to the princess who reveals the staircase, although a line of the observation named the missing key.
Continued from a stored MT18 position of an earlier run of the same model with a predecessor of the final observation (Section 6.7.3), with blue keys for sale as the original game sells them, Qwen3.5-397B reached the normal ending, and three continuations by DeepSeek-V4-Flash reached MT20, MT21 and MT21 before the turn limit.
A line naming the missing key therefore did not prevent the failure it describes.
This resembles the pull towards the option that is cheaper now, seen on the complex floor (Section 7.1.3).

The threshold of rule 4 differs between the two prompts.
At 60 % and, separately, with plan memory, Qwen3.5-397B won the simple floor in 2 of 5 episodes each, against 5 of 5 (Section 6.1.2).
On a floor with a single winning order, the stricter limit and the absence of plan memory appear to be part of what keeps that order stable.
That one threshold does not serve both settings suggests that a fixed share of HP is a poor proxy for "do not take a fight you cannot recover from"; ideally, the prompt would need no tuned threshold at all.

### 7.1.5 Prompt Optimisation Versus Annotations

The prompt optimisation study was designed to separate two explanations of why the agent succeeds: that the prompt carries the strategy, or that the annotations do.
The results favour the second explanation, with one qualification.

Starting from a prompt that states only the rules, reflection over game traces rediscovers the strategy principles that follow from the combat formula, the floor structure and the definition of the effective cost (Table 6.7).
Of the forty candidates of the first study, 30 state that no HP should be paid for fights that unlock nothing, and 26 that the cheapest progress comes first.
The stat-item rule appears in 37 of 40, but the rules-only prompt already contains a matching sentence.
The two rules written least often are the HP limit, a design choice of this thesis, and key scarcity, which the exact solver shows; they appear in only 5 and 1 of 54 candidates.
Each rediscovered principle corresponds to an annotation that the engine already prints.
With the full observation, the rules-only, evolved and hand-written prompts are within the variation between repeated evaluations of one another.
For Llama-3.1-8B, a byte-identical copy of the rules-only prompt scored 10 held-out kills where the original scored 8, which sets the noise floor of the comparison (Table 6.6).
Without the annotations, neither the evolved nor the hand-written prompt restores what was lost.
The one confirmed gain was found for DeepSeek-V4-Flash (no thinking) under the bare observation (30 against 24 kills, one-sided sign test, $p = 0.035$).
It came from a rewrite that describes in prose the computation behind the engine's OPTIONAL tag.
This suggests that, where the observation lacks a fact, the optimiser can partly supply it as a procedure.

The limiting factor is measurement.
With one episode per floor, the acceptance step compares candidates whose differences are no larger than the spread of a single prompt, so it selects on noise (Section 6.5.2).
Reflection may be sample-efficient, as the authors of GEPA report (Agrawal et al., 2025), but evaluation in this setting is not.
An episode is a long chain of decisions whose outcome often turns on one choice between options of similar annotated value (Section 6.4.3).
The results suggest that, in an agent whose engine can compute the consequences of actions, strategic knowledge is better placed in the observation, where it is exact and specific to the state, than in the prompt.
The optimiser remains useful as a diagnostic: its rewrites name the facts the model needed and did not see.

The second study, with a reasoning task model, points in the same direction.
With a teacher that saw every option, both the (1+1) loop and the Pareto loop raised the training score (Table 6.8).
Both best prompts then won fewer held-out episodes than the rules-only prompt: 26 and 24 against 32 of 39, significant only for the Pareto loop (two-sided sign test, $p = 0.008$; (1+1) loop $p = 0.07$).
The population did not help, for a reason specific to deterministic episodes.
At temperature 0, a rewrite that did not change a decision on a floor reproduced its episode, so all eight candidates of the Pareto loop tied on two of the three training floors.
A frontier over floors then reduces to selection on the one floor whose result varies, which is the floor most exposed to overfitting.
GEPA's selection presupposes training instances on which candidates differ.
With three long, deterministic training episodes, this difference has to be designed into the training set, for example with more floors or with several decision positions per floor instead of whole episodes.

Even without the validator, the (1+1) loop did not compile the complex floor's route (Section 6.5.4).
The teacher saw every trace and never wrote a position, and one of its general rules forbade the one fight that keeps the floor winnable at turn 9.
A trace shows what the agent did, not which decision lost the game.
The solver's per-decision values (Section 6.4.5) carry the information that the teacher lacked, which makes them a candidate input for reflection on long horizons (Section 7.6).

### 7.1.6 Reactive Control Versus Committed Planning

On the simple floor, committing to several actions per call loses almost every episode that reactive control wins.
Qwen3.5-397B wins 10/10 reactively, 1/5 when it commits to two actions and none with any longer commitment.
DeepSeek-V4-Flash wins no committed-plan episode.
Qwen3.8-27B at temperature 0.6 wins 3/3 reactively against 3 of 9 with commit-$k$ plans and none with long plans (Table 6.9).
The failures end alive with 287 to 572 HP left, which indicates a wrong order rather than recklessness.
The two hand-designed floors that reactive play wins behave the same way: DeepSeek-V4-Flash wins 18 of 20 reactive episodes there and none of 30 committed ones.

The results are consistent with an explanation by the timing of information.
The annotations that decide these floors are computed for the state in which they are printed.
A step committed at one decision is chosen before the engine has printed the facts of the states it leads to.
Longer plans also do not become holistic.
With the whole-floor wording, re-planned plans were legal throughout in 6 of 40 cases and single-call plans in none (Table 6.10).
They name monsters that are not yet reachable and fights that are not yet winnable.
Asking instead for as many actions as the model can give produced shorter plans, and the single-call plans were mostly clean (3 of 5 and 4 of 5), yet none won.
The failure lies in the order committed to, not in illegal steps.

On the complex floor with the solver-route prompt, the picture differs.
DeepSeek-V4-Flash wins 8/10 reactively with 20.8 calls per episode and 4/5 with commit-5 plans at 5.8 calls.
With re-planned plans of maximal length, it wins 5/5 at 2.4 calls.
Qwen3.8-27B at temperature 0.6 wins 3/3 in every re-planned mode, and single-call plans win none for either model.
At these sample sizes this is parity at about a quarter to a ninth of the cost, not an advantage.
The two floors separate two activities that "planning" conflates.
Deriving an order from facts that appear state by state cannot be committed ahead.
Transcribing the next few steps of an order that is already given can, as long as each plan is re-anchored to a fresh state after a few steps.

The tower adds a third case.
With the second tower observation, DeepSeek-V4-Flash reaches MT8 in all three reactive runs with 86 calls on average.
Its commit-2, commit-3 and commit-5 runs reach the same floor with 72, 60 and 58 calls (one run each, Table 6.9).
An imperfect order inside a floor appears to cost little there, and the highest floor reached, MT8, was set by the attack needed further up, not by the planning mode.
A single plan per floor is the exception: it stops on MT3 after two calls, at 5 HP.
Committing to a few actions per call thus lowered the cost without changing the outcome where the order was given or the run stopped for another reason.
Where the order had to be derived state by state, it changed the outcome: on the simple floor and on hand01 and hand02.

### 7.1.7 Model Scale and Family

Model size alone did not order the results.
On the simple floor, the largest model, Qwen3.5-397B, wins 5/5 in the re-run of Table 6.2 (15 of 15 episodes of this configuration overall), against 1/5 for DeepSeek-V4-Flash and Qwen3.6-35B (whose earlier episodes won 7/10, Section 7.2) and none for Mistral Medium 3.5.
On hand02, Mistral Medium 3.5, which has no reasoning channel, ends four of five episodes at the exact optimum, the highest ratio in Table 6.2.
On the tower with the final observation, its best run reached MT8 against MT16 for Qwen3.6-35B, a smaller model with a reasoning channel (Table 6.13).

Size appears to affect something narrower: the tolerance for defective annotations.
On the same observation, Qwen3.5-397B won 10/10 where Qwen3.6-35B won 0/5 at a reasoning cap of 8,192 tokens (Table 6.5, row 4).
The unguarded order line of row 8 cost Qwen3.6-35B more than Qwen3.5-397B (1/10 against 7/10).
Qwen3.6-35B also reacted to the length of the request: with six turns of conversation history it won 1/5, without history 10/10 (Table 6.5, rows 6 and 7).
Whether the larger model re-derives the quantities from the lookahead tree was not tested, and the two models differ in generation as well as size.
Qwen3.6-35B may thus be a more sensitive instrument for the observation's mistakes, which would make it well suited for developing annotations and less suited for reporting headline rates.
The first door on hand01 did not separate the models either: 18 of 20 episodes of four models of three families opened the same door (Section 7.1.1).
Section 7.2 asks whether these readings withstand the rival explanations stated in Chapter 1.

## 7.2 Rival Explanations

Three alternative explanations were stated in Chapter 1.

**R1: Apparent effects are caused by the non-determinism of the inference service.**
The service is not deterministic at temperature 0: identical configurations produced both wins and losses.
Three observations bound this explanation.
First, every headline comparison was repeated, and for the main effects the Wilson intervals of the two conditions do not overlap (for example, 10/10 [0.72, 1.00] against 0/5 [0.00, 0.43]).
Second, when an annotation made one option dominant, all fifteen episodes of Qwen3.5-397B in the final configuration followed the same trajectory (Section 6.4).
Third, at temperatures 0.6 and 1.0, no repeated cell of Table 6.2 moved by more than one episode in five, and neither the order of the conditions nor the boundary changed (Section 6.3).
Non-determinism appears to select among options that the model already finds close; it magnifies ambiguity in the observation rather than acting as an independent source of failure.
A second, slower source of variation is the served model itself.
On the same observation at turn 22, the five re-run episodes of Qwen3.6-35B split one to four (Section 6.2), and the earlier episodes of the same configuration, on an earlier version of the code, won 7/10 against 1/5 in the re-run.
The failures of both sets of episodes leave the winning trajectory at the same decision, turn 22.
The difference appears to lie in how often the served model takes one of two close options at that decision, not in the agent.
R1 is therefore rejected for the headline effects; it cannot be excluded for differences of one or two episodes in five.

**R2: Apparent gains of prompt optimisation are the luck of single episodes.**
This explanation holds for every gain measured on training floors.
The one training gain under the full observation did not survive paired re-evaluation, and the training gains of the second study reversed on the held-out floors (Section 6.5).
In the first study, the noise floor was measured directly, and the one gain that exceeded it passed a pre-registered paired test (Section 7.1.5).
That gain is narrow: it rests largely on two floors that share one failure, and on the nine floors not used to select the rewrite the discordant pairs split 3 : 1 ($p = 0.31$).
R2 is therefore excluded for the confirmed gain over the thirteen floors of the confirmation; on the floors not used to select the rewrite, the evidence does not separate that gain from luck.

**R3: The engine's overrides, not the model, produce the wins.**
For the early simple-floor results, this explanation is correct (Section 7.1.2).
For the final configuration, it is excluded: none of its wins contains a strategic override, and the mechanical overrides that remain are logged with every episode.
On the tower, it applies to the runs with the two earlier observations, which ran with the 40 % override; the final tower observation ran without it (Section 5.6).

The rival explanations concern the results; the next section turns to threats to the measurements themselves.

## 7.3 Methodological Lessons

The study encountered six threats to the validity of its own measurements.
They were detected in different ways: some because a previously measured result failed to reproduce, others in code review, in a check of the service's model list, in a tile-by-tile check of the game data, while building new floors, or by applying the exact solver to stored episodes.
Three of them changed, or would have changed, headline results: the silent strategic override, contained in every early win (Section 7.1.2), the placeholder described below, and the wrong reference optimum.
Appendix E gives the dated record of eighteen incidents, including several that changed no result.

**A machine-generated annotation is a parameter with discontinuous effects.**
Replacing a placeholder value in one annotation with the corresponding number made the observation more informative to a human reader.
It lowered the success rate from 5 of 10 episodes per model to 0 of 20 episodes across two models (Appendix E, incident 1).
The stored reasoning had read the placeholder as "not recommended yet".
Prompt-sensitivity research reports comparable effects for wording and layout (Sclar et al., 2024); here the effect arose in the structured, machine-generated part of the prompt.
The exact observation text is therefore pinned by an automated test at a reference decision.

**Silent overrides and silent configuration.**
Two code paths, both labelled "reactive", applied different overrides to the model's choices, and all early wins came from one of them.
The strategic override of Section 7.1.2 also acted unseen, as did a default that mapped a floor to the wrong prompt.
A switch that turned the overrides off also hid the annotations of fights, and a stale process continued an obsolete configuration alongside the corrected one.
Each of these produced results that were internally consistent and wrong (Appendix E, incidents 2, 3, 4, 7 and 8).
Each result now records its loop, prompt, overrides, depth and configuration.

**The reference can be wrong.**
The published solver reported 22 HP as the optimum of the complex floor; the exact optimum is 68 HP (Section 4.6.2).
Wins at 22 HP, which matched the published value, reach a third of the exact optimum.
The defect came to light during an exact re-solve while the hand-designed floors were built; a match with a reference is only as good as the reference.

**The visible error is not always the decisive one.**
Inspection of the complex-floor traces points to the trap door at (10,5), which 17 of the 20 episodes of the re-run opened and which the solver-route prompt warns against.
The exact state values place all 30 losses earlier, at turn 9 or 12, at an innocuous-looking fight taken before the door was opened (Section 7.1.3).
An error analysis by inspection finds the decision a human would question; only an exact reference finds the decision that mattered.

**The engine can be more generous than the game.**
An earlier version of the code showed two staircases that the game hides until a scripted event.
On it, one run's highest floor was overstated by three floors, MT21 instead of MT18 (Appendix E, incident 17).
The engine models the game, and every unmodelled event is a place where it may be easier or harder than the original.

**Models disappear.**
Three models used in early experiments were removed from the inference service during the study.
The successor of one of them, Qwen3.6-35B, won 0 of 10 episodes on a prompt with which its predecessor had won 2 of 18 (Appendix E, incident 6).
A prompt tuned to one model is a model-specific artefact.

Taken together, these incidents suggest that the main function of the evaluation platform is to make experiments falsifiable.
It does so through complete episode logs, recorded configurations, pinned observation text, logged overrides and an exact reference.

## 7.4 Limitations

Several methodological aspects constrain the scope of the conclusions that can be drawn.

First, the study uses one game.
Magic Tower isolates the ordering of irreversible decisions under exact rules, which is what makes attribution possible.
Real planning problems add uncertainty, partial observability and much larger state spaces.
The results should not be extrapolated to such settings without further study.

Second, sample sizes are small.
The cells of the re-run of Table 6.2 use five episodes and earlier headline cells ten, a size dictated by the cost of reasoning models.
Repeated episodes of large reasoning models take minutes each, and four parallel configurations slowed every call of Qwen3.5-397B from about 20 s to over 300 s (Section 6.1.3).
At $N = 10$, the Wilson interval spans about ±0.25, so differences in success rate smaller than about 0.3 are not resolved (Section 5.9.1), and several statements about model families rest on three to five episodes.
The bare-observation and map-only contrasts on the simple floor use three and two episodes on an earlier version of the code (Table 6.3).
The second prompt optimisation study was not pre-registered; for the evolved-route run, only three predictions were stated in advance.
The prompt rules in the evolved prompts were counted by keyword patterns, which overstate the stat-item rule because the rules-only prompt already contains a matching sentence.

Third, the observation was developed on the simple floor, and the error analysis was carried out on the same floor.
The hand-designed floors and the held-out generated floors are checks beyond the development floor, and the first decision on hand01 suggests that some of the annotations' behaviour is specific to the floor on which they were refined (Section 7.1.1).

Fourth, the layouts of the four hand-designed floors were drafted by a language model (Claude Opus 5.5) and accepted by the author only after exact solving and tuning (Section 4.6.3).
They were built to have a unique winning set and to defeat the heuristic, not to be representative of the game.
The heuristic's failure on them is therefore a design property, not evidence for the agent.

Fifth, all models were accessed through one inference service, with its own serving stack and availability, and the served models changed during the study (Section 7.2).
Results of a hosted model are a property of the model version served at the time, and exact reproduction depends on continued access to the same versions.

Sixth, decoding used temperature 0 throughout, so that all cells share one condition and a failure can be traced along a single trajectory.
This is below the values that the model cards recommend for thinking mode (0.6 for Qwen3.5-397B, 1.0 for DeepSeek-V4-Flash).
The DeepSeek-R1 report found that greedy decoding of long reasoning outputs raises repetition rates (Guo et al., 2025), and the truncated answers that had to be repaired (Section 5.3) are consistent with that.
The repetitions at 0.6 and 1.0 changed no conclusion (Section 7.2).
Nucleus and top-$k$ sampling were not varied, and cells that were not repeated might still look different under the recommended settings.

Last, the final tower observation was developed on the same tower, each revision in response to how earlier runs had stopped.
The 60 % threshold of rule 4 was chosen after earlier tower runs had stopped (Section 5.4), so no tower result is held out.
Each configuration was run one to five times per model.
The scripted events that affect play up to MT21 are modelled, including the hidden staircases of MT18 and MT20 and the normal ending; the dialogue-only events and those above MT21 are not (Section 4.5.3).
The final tower observation withholds the yellow and blue keys that the original game's shops sell.
The normal ending was reached in a run continued from a stored position with blue keys for sale, not in a run from MT0, and the three continuations by DeepSeek-V4-Flash ended at the turn limit, 152 turns after the resumption.
The comparison with the two earlier observations also spans a change in the values of nine items, which came from another edition of the game (Section 4.5.2); the single floors are not affected.
The tower therefore measures how far the agent climbs under the modelled rules, not how far it could climb in the original game.
Within these limits, the next section answers the research questions.

## 7.5 Answers to the Research Questions

This thesis investigated a hybrid agent in which a deterministic engine computes and annotates the legal actions and a language model chooses among them.
It asked how the agent performs on a long-horizon game with irreversible decisions, and whether evolutionary prompt optimisation and committed planning improve it.
The experimental results provide partial answers to the research questions formulated in Section 1.1.

Regarding the first research question, the engine's observation carries most of the effect.
With exact annotations, the engine's assists and only mechanical overrides, Qwen3.5-397B wins the simple floor in every one of 15 episodes [0.80, 1.00]; in the re-run, the other three models win it in at most one of five (Qwen3.6-35B won 7/10 in its earlier episodes).
Every one of the four models wins hand01 and hand02 in most episodes.
On thirteen held-out generated floors, DeepSeek-V4-Flash wins 31 of 39 episodes [0.64, 0.89] with the annotations but also 32 of 39 without them and with the rules-only prompt, so these floors do not test the observation.
The rule-based heuristic fails the simple floor, and without annotations Qwen3.5-397B fails it too (0/3), as does DeepSeek-V4-Flash on hand01 and hand02 (0/10).
The step from 0/5 to 10/10 came from repairing annotations that stated one side of a trade-off, with model and prompt unchanged.
On the 24-floor tower, the final observation, together with the game's item values, no 40 % override, a rule 4 threshold of 60 %, plan memory, the revised shop rule, no yellow or blue keys for sale and the level-up offer, raised the highest floor reached from MT7 with the first observation to MT18.
A run continued from MT18 with blue keys for sale reached the normal ending.
The boundary of the approach lies at floors whose decisive choice is a multi-step order of doors and fights.
On the complex floor, every failed episode is lost at a single fight, in 29 of 30 the same cheap fight taken before the stats that make it nearly free.
Three of the four models win with such an order when it is given, but no model finds it.
Hypothesis HA is supported for Qwen3.5-397B on the simple floor and for DeepSeek-V4-Flash on hand01 and hand02.
Two caveats apply: the bare-observation contrast on the simple floor rests on three episodes on an earlier version of the code, and the heuristic's failure on the hand-designed floors holds by construction.
For DeepSeek-V4-Flash and Mistral Medium 3.5, the evidence on the simple floor does not support HA; for Qwen3.6-35B it is undetermined (1/5 in the re-run, 7/10 in its earlier episodes).

With respect to the second research question, reflective prompt optimisation rediscovers, from a rules-only prompt, the strategy principles that follow from the combat formula and the floor structure, but rarely the HP limit and key scarcity.
On an agent whose observation already carries these principles, the evolved prompts are within the variation between repeated evaluations of the hand-written and rules-only prompts.
The one confirmed gain arises without annotations and restates an annotation as a procedure.
With a reasoning model, both the (1+1) loop and the Pareto loop overfit their training floors and win fewer held-out episodes than the rules-only prompt, significantly so for the Pareto loop (two-sided sign test, $p = 0.008$).
Without the validator, evolution did not learn the complex floor's route.
Across the experiments, the observation constrained success more than the prompt did.
Hypothesis HB is supported, with the caveat that its test uses one episode per floor on thirteen floors and two models, so a small gain of the evolved prompts cannot be excluded.

Regarding the third research question on the planning horizon, reactive control outperforms every committed planning mode on the floors whose decisive facts appear only as states are reached: the simple floor, hand01 and hand02.
For Qwen3.5-397B and DeepSeek-V4-Flash, reactive control wins 14 of 20 simple-floor episodes against 1 of 70 for committed plans, and DeepSeek-V4-Flash wins 18 of 20 against 0 of 30 on the two hand-designed floors.
On single floors, committed planning reaches parity with about a quarter to a ninth of the model calls only where the order is given in the prompt.
On the tower with the second observation, commit-$k$ plans reach the same floor as reactive control with 58 to 72 calls against 86, while a single plan per floor stops on MT3.
Hypothesis HC is supported where the order must be derived; where the order is given, committed planning lowered the cost without lowering success.
These answers point to the experiments that a continuation should run, which the next section proposes.

## 7.6 Future Work: A Proposal for the Next Study

A continuation of this work should be set up as follows.

**Floors and measures.**
Use the four hand-designed floors and the thirteen held-out generated floors as the evaluation set, keep the simple floor, gen01 and gen02 for development, and add floors that were not built to defeat the heuristic.
Report success with Wilson intervals and HP relative to the exact optimum, with at least ten episodes per cell, and log every override.
Add the solver's per-decision analysis (Section 4.6.3) to every failed episode.
Each failure is then located at the decision after which the state value becomes none.
This was done for the complex floor (Section 6.4.5) and should become part of every report.

**A search component for multi-step orders.**
On the complex floor with the single-floor prompt, hand03 and hand04, no model found the winning order from the per-state annotations.
Keep the division of labour and move the order into the engine.
A bounded search from the current state proposes a small set of candidate orders of fights and doors with their exact HP cost.
The model chooses among them as it now chooses among actions.
The question is whether the model can choose well among legible plans, which it did not produce in this study.

**Planning that can consult the engine.**
The committed plans of this study are consistent with failure by timing: each step was chosen before the engine had computed the facts of the states it leads to.
A planner that proposes a step, receives that state's annotated action list from the engine, and continues would test whether holistic planning fails for lack of information or for lack of ability.

**Prompt optimisation with repeated evaluation.**
Run the Pareto loop and the (1+1) loop at the same budget with three to five episodes per candidate and floor (Chang and Chen, 2026).
Use several decision positions per floor as training instances instead of whole episodes (Section 7.1.5).
The present study indicates that without repetition, the acceptance step cannot see gains of the size the rewrites produce.
Optimise where the observation is known to be incomplete: under the bare observation, where the study found its only confirmed gain (Section 6.5.2), and on hand03 and hand04, where the full observation does not suffice.
Give the teacher the solver's state values for each failed episode, which the traces lack (Section 6.5.4).

**The observation itself as the object of optimisation.**
Every gain on the simple floor came from reading failed episodes and repairing the observation.
That loop can be automated: a teacher reads failed traces and proposes a new annotation, which is accepted only if the engine computes it exactly and it improves success on held-out floors.
The first decision on hand01 is a ready test case.

**The rest of the tower.**
Model the remaining scripted events of the upper floors.
Run the final observation from MT0 with the yellow and blue keys for sale that the original game offers, and test it on a tower that was not used to develop it.
Repeat these runs often enough to report a distribution of the highest floor reached rather than single values.

## 7.7 Conclusion

Restated against the results, the three contributions of Section 1.2 are as follows.
First, the thesis presents an engine observation layer for language-model agents and identifies the one-sided annotation as a class of defects in such layers.
Repairing these defects took Qwen3.5-397B on the simple floor from 0/5 to 10/10 without a strategic override.
Second, it provides a repeated-episode evaluation protocol with exact optima and logged overrides, documents six threats to the validity of its own measurements, and releases the platform that implements it.
Third, it reports negative and boundary results, part of them stated in advance.
Prompt optimisation stays within the noise floor when annotations are present.
Reactive control wins 14 of 20 simple-floor episodes against 1 of 70 for committed plans.
No model finds the decisive order of the complex floor from a general prompt.

The title's trajectory "from reactive control to holistic planning" describes the information that a planner would need rather than a capability that planning delivered.
In this environment, the agent's decisions were rarely better than what the engine stated at the moment of decision.
On the complex floor they were worse: the models discarded the line that favoured the right order.
When the engine stated both sides of every trade-off, Qwen3.5-397B won the simple floor in 15 of 15 episodes without a strategic override, and the prompt mattered little.
When it did not, neither a better prompt nor a longer plan recovered the loss.
