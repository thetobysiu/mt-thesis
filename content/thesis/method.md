# Chapter 5: Method

This chapter describes the hybrid agent and how it is evaluated.
The agent divides the work between a deterministic engine and a language model (Figure 5.1).
The engine computes everything that can be computed exactly: which targets are reachable, what each fight costs, and what each action unlocks.
It writes these facts into the model's input as a numbered list of legal actions.
The model reads the list, reasons, and answers with the number of one action, which the engine then executes.
In the terms of Kambhampati et al. (2024), the engine is a sound verifier.
Unlike the verifiers of the LLM-Modulo framework, which check proposals afterwards, it acts before the model proposes anything, by restricting and annotating the options.

![The hybrid agent](/thesis/img/5.1.jpg)

**Figure 5.1:** The hybrid agent (lookahead depth 3 on single floors, 2 on the tower). The research questions of Section 1.1 attach to the observation (RQ1), the system prompt (RQ2) and the planning horizon (RQ3).

Section 5.1 describes the engine and Section 5.2 the observation it produces.
Section 5.3 describes how the model's answer becomes an action, and Section 5.4 the two system prompts.
Section 5.5 describes the decision loop and the planning modes, and Section 5.6 the engine's assists and overrides.
Section 5.7 presents the prompt optimisation loop, Section 5.8 the implementation, and Section 5.9 the measures used in Chapter 6.

## 5.1 The Engine

The engine is a Python reimplementation of the game rules of Chapter 4.
It loads a floor from the game's data files or from a test map, simulates every action exactly, and exposes three services to the rest of the agent.

**Reachability and action enumeration.**
A breadth-first search from the hero's position finds every tile the hero can walk to without passing a monster or a closed door.
Every monster, door, item, shop and staircase adjacent to that region becomes one candidate action.
Fights that cannot be won ($a_h \le d_m$) are not legal under Definition 4.1, but the engine lists them, marked as unwinnable, so that the model sees what blocks it.
Choosing one triggers the mechanical override of Section 5.6.
The agent therefore never chooses a path; it chooses a target, and the engine walks the shortest path to it.

**Exact consequences.**
For every fight, the engine computes the HP cost with the full damage formula of Section 4.2, including the special abilities, and the HP that remains afterwards.

**Lookahead.**
For every fight and door, the engine simulates the action and searches again to find what becomes reachable: items, keys, further doors, further monsters and the boss.
If what becomes reachable is itself a monster or a door, the search continues behind it, up to a depth of three such *gateways* (two on the tower).
The result is a tree of what the action unlocks, with the cost of every gateway on the way.

## 5.2 The Observation

The observation is the text the model receives at each decision.
It consists of a state block and the numbered list of legal actions, each followed by its annotations.
Listing 5.1 shows the observation at the first decision on the simple floor under the *final configuration* (temperature 0, lookahead depth 3, no conversation history, all annotations, mechanical assists only; Section 6.1.2).
The engine has already collected the yellow key next to the start; the header counts completed turns, so the model's choice here is executed as turn 2, the numbering used in Chapter 6 (Section 5.5.1).

```
=== Floor: simple | Turn 1/300 ===
Hero: HP=470 (100.0% [OK]) ATK=9 DEF=4 MDEF=0 Gold=0 EXP=0
Keys: Y=1 B=0 R=0
Key budget: yellow 1 in hand + 4 on this floor = 5 for 4 closed yellow door(s)
Position: (5,1)
Enemies remaining: 14/14
Uncollected items still on floor: ATK+1@(1,0), Yellow Key@(0,1), ATK+1@(9,1), Red Potion (+75 HP)@(9,2)(+75HP), Blue Potion (+200 HP)@(10,2)(+200HP), [...]
DEF threshold tip: Collect +3 more DEF gems → Green Slime ×2 become FREE (saves 48 HP; +4 DEF gems remain on map)
Goal: defeat Boss while keeping maximum HP. You do NOT need to kill all enemies — only fight enemies that grant stat gems, keys, or HP needed to reach and defeat the boss. There is NO shop on this floor. Boss at (5,10): ATK=20 DEF=12 HP=50 | if fought now: UNWINNABLE — need ATK≥13 to deal damage (you have ATK=9) Use LOOKAHEAD TREE to find the cheapest path to the boss.
HP budget at max stats (all 4 ATK / 4 DEF gems collected): 1170 HP available (HP + 700 potions) vs 669 HP for the 2 monsters that block the way to the boss + the boss → margin +501 HP. 11 other monsters (258 HP at max stats) block nothing on the way to the boss; they are not in this budget — fight one only if its tree shows a stat gem or potion you need, and its cost then comes off this margin.
Recent actions this floor:
  T1: Collect Yellow Key at (5,1) (HP +0→470)

Available actions:
  (Note: lookahead = total item/stat value unlocked by this action [HP-equivalent]. [...])
  1. [fight] Slime Lord at (4,2) — monATK=10 monDEF=5 [FREE if DEF≥10, need +6 more] — damage=114 (24.3%) hpAfter=356 [MODERATE] lookahead=0(raw=91-gw=114) effCost=None | min-cost=18@maxStats(ATK=13,DEF=8) save=96HP — collect stat gems first
 → next fight: ⚔ Slime Lord@(2,1) dmg=114(24.3%), FREE@DEF≥10(+6)
   → via [Slime Lord@(2,1) [dmg=114 (24%), FREE if DEF≥10 (+6 needed)]]: Red Gem (+1 ATK) [STAT], Yellow Key
 → stat gems behind it (+1 ATK): 228 HP of fighting to reach them, then they save 22 HP on the other fights listed now → net -206 HP
 → ORDER (this Slime Lord at (4,2)): take this fight BEFORE "Fight Red Slime at (5,3) dmg=56" — this fight then that route: 380 HP; that route then this fight: 392 HP (saves 12)
  2. [fight] Red Slime at (5,3) — monATK=11 monDEF=1 [FREE if DEF≥11, need +7 more] — damage=56 (11.9%) hpAfter=414 [SAFE] lookahead=0(raw=220-gw=261) effCost=None | +75 HP potions behind it (collect any time) | min-cost=15@maxStats(ATK=13,DEF=8) save=41HP — collect stat gems first  [ALTERNATIVE ROUTE — everything this opens is also opened by "Fight Black Slime at (6,4) dmg=55" (which opens more); taking both pays twice for the same access]
 → next fight: ⚔ Green Slime@(5,6) dmg=24(5.1%), FREE@DEF≥7(+3), ⚔ Black Slime@(3,7) dmg=55(11.7%), magic-atk, [...]
   [...]
 → stat gems behind it (+1 ATK +1 DEF): 317 HP of fighting to reach them, then they save 54 HP on the other fights listed now → net -263 HP
 → ORDER (this Red Slime at (5,3)): take this fight BEFORE "Fight Slime Lord at (4,2) dmg=114" — this fight then that route: 206 HP; that route then this fight: 277 HP (saves 71)
  3. [fight] Black Slime at (6,4) — monATK=5 monDEF=5 [magic-atk] [magic-atk: DEF useless — only ATK+MDEF reduce cost] — damage=55 (11.7%) hpAfter=415 [SAFE] lookahead=29(raw=345-gw=237) effCost=26 | +225 HP potions behind it (collect any time)
 → next fight: ⚔ Green Slime@(5,6) dmg=24(5.1%), FREE@DEF≥7(+3)
 → unlocks: yellow door
   → via [Bat@(3,5) [...]]: Red Potion (+75 HP), Red Gem (+1 ATK) [STAT], Yellow Key
   → via [Green Slime@(5,6) [...]]: yellow door
   → via [yellowDoor@(7,5)]: Red Potion (+75 HP)
     → via [yellowDoor@(7,5) → Black Slime@(9,5) [...]]: Blue Gem (+1 DEF) [STAT], Red Potion (+75 HP)
       → via [Green Slime@(5,6) [...] → yellowDoor@(4,7) → Black Slime@(3,7) [...]]: Blue Gem (+1 DEF) [STAT], Yellow Key ×2
 → stat gems behind it (+1 ATK +2 DEF): 371 HP of fighting to reach them, then they save 75 HP on the other fights listed now → net -296 HP
 → ORDER (this Black Slime at (6,4)): take this fight BEFORE "Fight Slime Lord at (4,2) dmg=114" — this fight then that route: 175 HP; that route then this fight: 268 HP (saves 93)
 → keys: behind this fight none; it exposes yellow door (7,5) → none behind it
  4. [open_door] Yellow Door at (7,0) [DEAD END - DO NOT OPEN]

Choose the best action. After your analysis, end your response with:
FINAL_CHOICE: <number>
```

**Listing 5.1:** The observation at the first decision on the simple floor (final configuration). "[...]" marks shortened item lists, gateway annotations and the fixed explanatory note; the full text is reproduced in Appendix A.6 (Listing A.7). The static floor map (list of monsters, items and doors) is appended once to the system prompt. In `raw=345-gw=237`, the printed sum leaves out gateways in front of item names already listed; the lookahead value itself subtracts all four gateway fights (182 + 24 + 55 + 55 = 316 HP). `effCost=None` marks a fight whose lookahead value is 0 (Section 5.2.2).

The rest of this section explains each part of the observation.
Each annotation is described by its purpose, its definition and the reason it is included.
Table 5.1 summarises them.

**Table 5.1:** Annotations in the observation. Scope = where the annotation appears.

| Annotation | Scope | Content |
|---|---|---|
| Damage and HP after | every fight | exact HP cost and remaining HP (Section 4.2) |
| Status tags | fights, doors | SAFE, MODERATE, RISKY, LETHAL, WINNABLE at ATK ≥ x, FREE if DEF ≥ x (a magic-attack tag instead on magic-attack fights), OPTIONAL, DEAD END, alternative route |
| Cost at maximum stats | winnable fights without magic attack | cost after every remaining stat item is collected |
| DEF threshold tip | state block | smallest DEF gain that makes a group of monsters free, and the HP it saves |
| Lookahead tree | fights, doors | what the action unlocks, up to three gateways deep, with each gateway's cost |
| Lookahead value and effective cost | fights, doors | HP-equivalent value of the unlocked stat items, keys and doors, net of gateway costs |
| Net stat-route line | fights, doors with stat items behind them | cost of reaching the stat items and what they save on the listed fights |
| Fight-order line | fights that a stat route makes cheaper | how much HP taking the fight now wastes and after which action, or which route to take it before |
| Key line | doors not tagged as dead ends, and fights that expose keys or doors | keys used, keys gained behind the action, doors exposed |
| Key budget | state block | keys held and on the floor versus closed doors, per colour |
| Boss line and HP budget | state block | whether the boss is winnable now, the ATK it needs, and the HP needed at maximum stats for the monsters that block the way |

The annotations differ in kind.
Damage, HP after, the status tags, the cost at maximum stats, the lookahead tree, the key lines and the key budget follow exactly from the rules in the current state.
The net stat-route line, the fight-order line and the HP budget compare exact costs along routes that the engine specifies; the fight-order line also names an action to take first and is therefore advice.
The lookahead value and the effective cost rest on hand-set weights (Section 5.2.2) and are heuristic estimates.

### 5.2.1 Exact Costs and Status Tags

*Purpose:* to remove every arithmetic step from the model's task.
*Definition:* each fight lists its HP cost (`damage`), the share of current HP it takes and the HP that remains (`hpAfter`).
A risk tag classifies a winnable fight by that share: `[SAFE]` up to 15 %, `[MODERATE]` up to 30 % and `[RISKY]` above 30 %.
`[LETHAL]` marks a fight that the hero cannot win or would not survive, and `[WINNABLE at ATK≥x]` gives the ATK at which such a fight becomes winnable.
`FREE if DEF≥x` gives the DEF at which the fight costs nothing; magic-attack fights, whose cost DEF does not reduce, carry a tag saying so instead.
The *cost at maximum stats* (`min-cost@maxStats`) is the fight's cost after every remaining stat item on the floor is collected; it is shown for fights without magic attack when it is at least 10 HP below the current cost.
`[OPTIONAL]` marks a monster that blocks nothing needed for the goal, and `[DEAD END]` a door behind which nothing new can be reached with the keys held afterwards (Section 5.6).
The *alternative-route tag* marks an action whose direct unlocks are all opened by another listed action that opens more; two actions that open exactly the same things are tagged as the same region.
In the state block, the *DEF threshold tip* names the smallest DEF gain, within the DEF items left on the floor, that makes a group of monsters free, and the HP this saves.
*Justification:* LLMs make planning errors that an exact computation does not (Valmeekam et al., 2023); the model's remaining task is to choose among options whose consequences are stated.

### 5.2.2 Lookahead Tree, Lookahead Value and Effective Cost

*Purpose:* to show what an action leads to, not only what it costs.
*Definition:* the tree lists the items, keys, doors and monsters that become reachable, and, behind each gateway (`→ via [...]`), what becomes reachable after that gateway is also passed.
Each unlocked item is valued in HP-equivalents: 70 per point of ATK, 90 per point of DEF, 45 per point of MDEF, 60, 90 and 120 for a yellow, blue and red key.
Each unlocked door counts 80, 130 or 180 by colour, three quarters of that while more than one key of its colour is held; on the tower, a staircase counts 120 and a shop the stats it sells.
The *net lookahead value* of an action is

$$L = \max\Bigl(0,\; \sum_{i} v_i\, \lambda_{j(i)} - \sum_{g} c_g\Bigr),$$

where $v_i$ is the value of unlocked item $i$, $j(i)$ the number of gateways in front of it and $c_g$ the HP cost of gateway $g$, each gateway counted once.
The depth factor $\lambda_j$ is 1 for items reached directly and 0.7, 0.5 and 0.35 behind one, two and three gateways.
For a fight, the *effective cost* is its HP cost minus $L$; when $L$ is 0 although gateways lie on the way, the line prints `effCost=None` instead, a placeholder that the models read as "not recommended yet" (Appendix E, incident 1).
Potions are not included in $L$; they are listed separately ("+75 HP potions behind it"), because the HP of a potion is gained whenever it is collected and does not depend on the order of fights.
*Justification:* without the tree, the model would have to simulate reachability from coordinates, which the map-only condition indicates it does not do reliably (Qwen3.5-397B: precision 0.48, recall 0.68, $N = 2$; Table 6.4).
The value lets the model compare a costly fight that unlocks a stat item with a cheap fight that unlocks nothing.

### 5.2.3 Net Stat-Route Line

*Purpose:* to state both the price and the benefit of reaching stat items.
*Definition:* for an action with stat items behind it, the line gives the HP of fighting needed to reach them ($C_{\text{route}}$), the HP they would save on the other fights currently listed ($S_{\text{route}}$), and the difference $S_{\text{route}} - C_{\text{route}}$.
In Listing 5.1, the Slime Lord (4,2) leads to one red gem for 228 HP of fighting, which saves 22 HP (net −206).
The Black Slime (6,4) leads to one red and two blue gems for 371 HP, which save 75 HP (net −296).
At this first decision every balance is negative, because the saving is counted only on the fights listed at the time.
The line even ranks the Black Slime last, although it is the only action that keeps a win reachable (Figure 4.3); at later decisions, the line separates the routes.
*Justification:* a saving shown without the cost of reaching it led the model to prefer expensive routes (Section 6.4.2); the line makes every such value two-sided (Figure 5.2).

![One-sided and two-sided annotation](/thesis/img/5.2.jpg)

**Figure 5.2:** A one-sided and a two-sided annotation of the same two doors at turn 9 on the simple floor (Section 6.4.4). The hero stands at (1,10), at the far end of the lower-left room, with 336 HP, ATK 9, DEF 5 and two yellow keys. Shown only the saving, the larger number points to the door at (7,5); shown also the cost of reaching the stat items, the net balance points to the door at (7,0), which the optimal route takes next.

### 5.2.4 Fight-Order Line

*Purpose:* to make the effect of ordering visible.
*Definition:* for a fight that a listed route would make cheaper, the line states how much HP taking the fight now wastes and which action to take first.
It also states what that action costs and the combined cost of fight and route in both orders.
A second, positive form ("take this fight before …") appears when fighting first is cheaper.
In Listing 5.1, all three fights carry the positive form, and the lines of the Slime Lord and the Red Slime each recommend taking that fight before the other.
At this decision, the order lines therefore do not separate the actions either.
What singles out the Black Slime is its effective cost, the only numeric one in the list (26), together with the tags: the Red Slime is marked as an alternative route to the Black Slime, the door as a dead end, and the Slime Lord and the Red Slime with "collect stat gems first".
In the re-run of Table 6.2, 19 of 20 episodes fought the Black Slime at this decision (Section 6.4).
Neither form recommends a first action that costs more than 40 % of current HP (on the tower, the threshold of its rule 4, 60 %).
*Justification:* on the simple floor, the order of one fight and one door at turn 9 separated wins from losses, and the model did not infer it from costs alone (Section 6.4.4).

### 5.2.5 Key Lines and Key Budget

*Purpose:* to make the key economy explicit.
*Definition:* the key budget in the state block compares, per colour, the keys held and lying on the floor with the number of closed doors.
Each door action not tagged as a dead end states which key it uses, how many keys the hero will hold after collecting what lies behind it, which keys lie behind it, and which further doors it exposes.
If the door uses the last key of a colour without giving one back, a warning is added.
A fight that directly exposes keys or doors carries a shorter line: the keys reachable after this fight alone and the doors it exposes.
On the tower, where keys are shared by all floors, a second budget line counts the keys held and lying on all visited floors against all their closed doors.
*Justification:* the lookahead value prices a key only by a fixed HP-equivalent and does not show which doors it will still be needed for.
In the one failed episode of row 5 of Table 6.5, the model opened the door (7,5), which spends the only yellow key and gives none back, at turn 4 instead of the door (4,7) (Section 6.4.3).

### 5.2.6 Boss Line and HP Budget

*Purpose:* to tie each decision to the goal.
*Definition:* the state block says whether the boss can be fought now and, if not, how much ATK is needed.
The HP budget compares the HP available at maximum stats (current HP plus all potions) with the HP needed at maximum stats for the monsters that block the way to the boss and for the boss itself.
Monsters that block nothing are reported separately and are not included in the budget.
The margin is therefore not the floor's slack: in Listing 5.1 it is 501 HP, but some of the monsters outside the budget guard stat items and keys that the win needs, and in the optimal order all fights together cost 1,157 HP, 488 more than the 669 HP that the budget counts, which leaves exactly the optimum of 13 HP.
*Justification:* a budget over all monsters, including optional ones, declares a winnable floor unwinnable and licenses expensive fights (Section 6.4.2).

### 5.2.7 The Bare Observation

For the ablations of Chapter 6, the engine can also produce a *bare* observation.
It contains the hero's attributes, the list of remaining items, the boss's attributes and the numbered action list with the exact cost of each fight, but no lookahead tree, no tags, no values and none of the lines of Sections 5.2.3 to 5.2.6.
The engine still enumerates only legal, reachable actions.
The bare observation isolates the contribution of the annotations from that of action enumeration and exact damage.

## 5.3 From Answer to Action

The model answers in free text, ending with the line `FINAL_CHOICE: <number>`.
The engine extracts the number and checks that it denotes one of the listed actions.
Because the model can only name a number from the list, it cannot refer to a target that does not exist or is unreachable; hallucinated targets cannot reach the game.

Two things can still go wrong: the answer can be truncated because the reasoning exhausted the token budget, or it can contain no valid number.
An answer without a valid number goes to one repair call to the same model with reasoning disabled.
This call uses constrained decoding (Willard and Louf, 2023): the answer must be a JSON object with one integer field whose value is one of the listed action numbers.
The repair call may only choose among actions that the mechanical overrides of Section 5.6 would not replace, so it cannot pick an unwinnable fight or a dead-end door.
On single floors, a truncated answer is first sent again.
On the tower, it goes to the repair call at once, because a truncated tower answer has used the whole reasoning budget and a repeated request would cost as much again.
If neither the answer nor the repair yields a valid number, the request is sent again; after three consecutive failed requests at the same decision, the engine takes the rule-based heuristic's action.
Every repair and fallback is logged and stored with the result (Appendix D); Chapter 6 states them where they occur.

## 5.4 The Two System Prompts

Two system prompts are used for all main results: one for single floors (2,526 characters) and one for the tower (6,035 characters).
Both are reproduced verbatim in Appendix A.1 and A.2 (Listings A.1 and A.2).
Appendix F lists the other system prompts used in Chapter 6.
Each consists of three parts:

- **Combat rules.** The damage computation of Section 4.2 in five lines: who strikes first, the damage per strike, when a fight cannot be won, when it costs nothing, and how the special abilities change it.
  The prompt counts one monster strike per round.
  The engine counts one strike fewer per fight, because the hero strikes first and the monster dies before its last strike; the exact cost is printed with every fight.
- **How to read the observation.** The meaning of each annotation of Section 5.2, and the instruction that the lookahead tree is the only reliable map: if an action's tree does not list something, that action does not lead there.
- **Prompt rules.** The prompt rules of Table 4.2.
  Stat items come before the fights they make cheaper.
  Among fights that make progress, the one with the lowest effective cost comes first.
  No fight may cost more than 40 % of current HP (60 % on the tower) unless nothing else can make progress.
  No HP is spent on a fight that unlocks nothing needed.
  Keys are scarce, and a door is opened only when what lies behind it is needed.
  The tower prompt adds two rules.
  Rule 1: take the up-staircase to an unvisited floor before spending resources on the current one, unless a shop not yet used can be reached first.
  Rule 3 governs shops: never buy HP or level-ups; buy DEF before ATK, but enough ATK that the monsters on the way up cost at most 60 % of current HP; and check what an affordable purchase does to a fight before paying HP for it.
  Rule 3 also asks the model to spend EXP before gold, because gold also buys red keys, to buy where a point is cheapest, and to hand in the Cross only when nothing else can still raise ATK or DEF.
  The tower prompt also explains why ATK just above a monster's DEF is not enough.
  The fight becomes winnable, but the number of rounds, and with it the cost, falls only as ATK rises well above the monster's DEF.

The threshold of rule 4 is higher on the tower because, at 40 %, the rule kept the model from early fights towards weapons that the expert walkthrough takes; on single floors, 60 % lowered Qwen3.5-397B's result on the simple floor (Section 6.1.2).
In the final configurations, the engine enforces neither threshold; the first and second tower observations enforced 40 % by a strategic override (Section 5.6).

The prompts deliberately contain no floor-specific knowledge: no coordinates, no lists of allowed or forbidden fights, no routes and no reference numbers from a walkthrough.
The walkthrough principles S11 to S14 of Table 4.2 are therefore never stated.
This rule keeps the model's decisions attributable to its own reasoning over the observation, and for the prompt optimiser it is enforced by the validator of Section 5.7.

One further prompt, the *solver-route prompt*, is used as a labelled experimental condition on the complex floor (Appendix A.5, Listing A.5).
It lists the route found by the published solver (the fights allowed and forbidden by position, the door order and the phases), together with a rule never to take a lethal fight.
It is the plan-execution reference: it measures whether a model can carry out a given route, not whether it can find one.
Because it contains compiled floor-specific knowledge, results obtained with it are reported separately as a compiled-knowledge condition (Chapter 6).
The solver-route prompt and the exact-route prompt of Section 6.6 were run without the mechanical overrides of Section 5.6 and without the automatic 0-HP fights.
The solver-route prompt was developed while the engine's overrides still included the strategic overrides of Section 5.6, which replaced steps of its listed route; its rule never to take a lethal fight took the place of the engine's lethal-fight override, and the exact-route prompt was run in the same configuration so that the two route conditions are comparable.
Items and keys were still collected automatically, and an episode still ended as stuck when only lethal or unwinnable fights remained.
A lethal fight chosen while another action existed was therefore executed; this is how the deaths in these conditions arise (Chapter 6).
Results with the route prompts therefore differ from those with the single-floor prompt in the execution settings as well as in the prompt.

## 5.5 Decision Loop and Planning Modes

### 5.5.1 The Reactive Loop

In the reactive mode, the engine asks the model for one action at every decision.
Each call contains the system prompt with the static floor map appended once, and a user message with the current observation.
In the final configuration, the call contains no earlier turns.
With the six previous observations and answers, which made up about three quarters of each request, Qwen3.6-35B won 1/5 on the simple floor, and without them 10/10 (Section 6.3).
The engine asks the model only when there is a real choice: if exactly one action is legal, or if an assist of Section 5.6 applies, the engine acts without a model call.
Every executed action, whether chosen by the model or taken by the engine, is one *turn*; turns are numbered from 1, and the header of the observation shows the number of turns completed.
A turn at which the model is asked is a *decision*.
On the simple floor, the engine collects the key at (5,1) at turn 1, so the first decision (Listing 5.1) is turn 2; on hand01, the first decision is turn 1.
An episode ends when the goal is reached, when the hero dies, when only lethal or unwinnable fights remain, or after 300 turns on a single floor; tower runs use a turn limit set per run (Appendix D).

### 5.5.2 Committed Planning Modes

To study the planning horizon (RQ3), the same loop can ask the model to commit to several actions per call.
In the **commit-$k$** mode, the model answers with its choice for the current decision followed by a line `NEXT:` listing its next $k - 1$ fights, doors or staircases by type and position (Appendix A.7; Listing A.8 shows the long-plan form).
The engine executes the listed actions in order without calling the model, as long as each is still legal; items are collected in between.
When the list is used up or an entry is no longer legal, the model is called again.
In the **long-plan** mode, the model is asked to commit to as many further actions as it can, up to 59, and is called again in the same way.
The long-plan instruction has two wordings, both reported in Chapter 6: the plan for the rest of the floor up to the goal (*whole-floor wording*) and as many actions as the model can (*max-steps wording*).
In the **single-call** mode, the far end of the planning horizon (Section 2.4.1), the model is called once at the start of the episode (on the tower, once per floor) with the long-plan instruction.
Turns not covered by this *single-call plan* are decided by the rule-based heuristic.
These modes span the range from reactive control ($k = 1$) to a holistic plan for the whole floor, on the same engine, observation and model.
Algorithm 5.1 shows the loop for all modes; the assists and overrides it refers to are described in Section 5.6.

**Algorithm 5.1:** The decision loop. $k = 1$ is the reactive mode; in the single-call mode, the model is called only at the first decision (on the tower, at the first decision on each floor) and the heuristic replaces later calls. The two earlier tower observations (Section 5.5.3) also replaced fights costing more than 40 % of HP at line 17 (Section 5.6).

```
Require: floor F, system prompt P, model M, commitment k, turn limit T (300 on single floors)
 1: s <- initial state of F;  plan <- empty list
 2: for t = 1 to T do
 3:     A <- ENUMERATE(s)                     // legal actions with exact costs and lookahead (5.1)
 4:     if goal reached, hero dead, or A holds only lethal or unwinnable fights then break
 5:     if |A| = 1 then a <- the only action                              // no choice
 6:     else if an assist applies then a <- the assist action             // assisted turn (5.6)
 7:     else if plan is not empty and its next entry is legal in A then
 8:         a <- next entry of plan;  remove it from plan
 9:     else
10:         O <- OBSERVE(s, A)                // state block and annotated action list (5.2)
11:         y <- M(P + static floor map, O)
12:         (i, plan) <- PARSE(y)             // FINAL_CHOICE and, if k > 1, NEXT: with k-1 entries
13:         if i is not a listed number then      // also a truncated y (sent again first on single floors, 5.3)
14:             i <- REPAIR(M, A)             // one constrained-decoding call without reasoning (5.3)
15:         if no valid i after three failed requests then i <- HEURISTIC(s)   // else the request is sent again
16:         a <- action number i of A
17:     if a came from the model or a plan and is a dead-end door, an unwinnable fight,
            or a lethal fight while a non-lethal action exists then
18:         a <- HEURISTIC(s);  plan <- empty list;  log the override
19:     s <- EXECUTE(s, a)                    // walk the shortest path, apply exact consequences
20: return outcome of s
```

### 5.5.3 The Tower Loop

On the tower, the loop is the same; what changes is the observation.
The final tower observation, described below, is the result of several revisions, each made after tower runs had stopped at an obstacle that the observation did not state.
Chapter 6 compares it with two earlier ones (Table 6.13).
The *first tower observation* listed only the current floor's actions, the up-staircase and *return* actions to earlier floors, with each other floor summarised in one line.
The *second tower observation* listed every reachable object on every visited floor, as the final one does, with a tower-wide key budget and the price of the way to a shop not yet reached; the planning modes were compared on the tower with this observation (Table 6.9).
Both earlier observations ran with the 40 % override of Section 5.6, with rule 4 at 40 % and with the item values of another edition of the game (Section 4.5.2).

The rest of this section describes the final tower observation.

**Action list.**
*Purpose:* to offer every object of the tower as one decision, without travel.
*Definition:* the action list contains every reachable object on every visited floor.
The current floor's actions come first, then one block per other visited floor.
Each block is formatted by that floor's own engine instance with the full observation of Section 5.2 (lookahead tree, effective cost, stat-route, order and key lines, status tags).
Choosing an action on another floor walks there, which costs nothing in the game, and performs it in the same turn.
A staircase appears only as the way up to a floor that has not been visited yet, and the engine takes it itself (Section 5.6).
Purchases at every shop the hero has found are listed once and can be used from any floor.
A purchase may carry a quantity: the answer may end with `QUANTITY: n` (at most 10), and the engine repeats the purchase without asking again while it stays affordable.
*Justification:* travel is not a decision in the game, and with return actions to earlier floors, models spent decisions shuttling between floors.

**Cross-floor value.**
*Purpose:* to show what a gain in attributes is worth on all visited floors.
*Definition:* stat items and shop purchases are annotated with their value across all visited floors: which fights they make winnable or free, and how much HP they save on the listed fights.
For ATK purchases, the annotation also counts how many purchases make a fight winnable and how many make it cost at most the rule-4 share of current HP (60 %).
*Justification:* a saving computed for one floor only would omit its scope, which makes it one-sided in the sense of Section 6.4.2.

**Way-up line.**
*Purpose:* to tie each fight and purchase to the next floor.
*Definition:* the *way-up* line gives the cheapest route on the highest visited floor to its up-staircase.
A shortest-path search orders routes by unwinnable fights, then HP, doors and steps.
The line gives the exact cost of every fight on the route at the hero's attributes and marks the fights that lie on every route.
It states the total as a share of current HP and the ATK or DEF at which every fight on it costs at most the rule-4 share.
It also states what one to three of each affordable ATK or DEF purchase does to these costs, with the purchases of one attribute combined across gold and experience shops.
A fight that the hero can win but not survive is marked as lethal with its cost, not as unwinnable.
A last line states whether the route is passable in path order.
It assumes that before each paying fight, the gold and experience in hand, including what earlier fights on the route pay, are spent on the attributes that make that fight cheapest.
It gives the HP left at the staircase or names the fight that cannot be survived.
The action list tags the actions on the route; the line itself states computed costs and names no action to take.
*Justification:* the strongest monster seen is the wrong reference for purchases, because early floors show monsters of later floors that are never on the way.

**Purchase lines.**
*Purpose:* to price each purchase against the fights it changes.
*Definition:* a fight that costs HP states what the purchases affordable now do to it: the fewest DEF purchases that make it free, or else those that make it cheapest.
Each single-attribute purchase states its price per point.
When another open shop sells the same attribute for less per point in the same currency, the line adds that shop's price and how much is still missing.
For example, the gold shop on MT11 sells +20 for 100 gold (5 per point), against +4 for 25 gold on MT3.
A shop that has not been reached yet is priced on the action that leads to it: what the hero's gold or experience would buy there, and the cost of every monster on the way, now and after one to three of the ATK purchases already available.
*Justification:* without these lines, a run paid HP for fights that a DEF purchase it could already afford would have made free.

**Keys, treasures and scripted events.**
*Purpose:* to show the resources whose value is not an attribute.
*Definition:* lines on scripted events (*event lines*) state what a character does, what it gives access to and the exact way there.
If the item or guard of a scripted event lies behind doors, the line names those doors and the keys missing for them (for example, the Ice Pickaxe behind a blue door on MT12: "needs 1 blue key(s), you have 0").
The *seal line* of MT7, in front of the Cross, states the doors in front of the remaining guards and how many keys they need together.
A *treasure* line in the state block lists up to five uncollected treasures on the visited floors (equipment, feathers, key boxes, the Cross, Holy Water and characters that hand such items over), each with the in-order verdict of the way there.
A red door states how many red keys the hero holds and what the key seller charges for one.
A door that is not on the way up and would leave fewer keys of its colour than the doors on the way up still need states so, with the coordinates of those doors (*key-reserve line*).
A door or fight that makes 0-HP fights reachable states their number and the gold and experience they pay.
The Cross states that its gain is a third of the attributes at the moment it is handed in.
The MT15 trades become actions once the hero holds 500 experience or 500 gold.
The engine never takes them, because they spend resources, and the treasure line lists them with their price and what the hero holds.
*Justification:* tower runs stopped where a key spent dozens of turns earlier was needed (Section 6.7.3).

**Vampire tag.**
*Purpose:* to state a damage rule that the DEF threshold does not describe.
*Definition:* monsters whose damage is a share of the hero's current HP (the White Warriors take 25 %) carry the tag "[vampire: takes 25% of your current HP whatever your DEF, so it costs less when your HP is lower]" in place of the DEF threshold.
The prompt's list of special abilities names the ability.
*Justification:* the DEF-threshold form called these monsters "already immune", although each fight cost a quarter of the current HP.

**Engine.**
The engine models the scripted events marked as modelled in Table B.4.
The fight with the Red Demon King strengthens four kinds of monster for the rest of the game, as its script in the game data does.

### 5.5.4 Plan Memory

Without conversation history (Section 5.5.1), each request contains the system prompt and the current observation only.
On the tower, this removes the reason for the previous decision along with the noise.
A model that opened a door towards a weapon can decline the fight on the way to it at the next decision, because nothing in the request records the earlier intention.

*Plan memory*, part of the final tower observation, carries one line from one decision to the next.
The request asks the model to end its answer with a line `PLAN:` before `FINAL_CHOICE`, written as a short to-do list: what it will do next and why, and what it is saving gold, experience or keys for.
The engine stores the last such line and begins the next request with it, together with the turn and floor it was written on and the actions taken since then, including the assisted turns (Listing 5.2).

```text
YOUR PLAN FROM YOUR PREVIOUS DECISION (turn 156, on MT5): Open yellow door at MT7 (8,11), fight two Skeleton
Captains to reach MT8, then scout MT8 before spending more resources.
Done since then (your choice first, then automatic steps): Open yellow door at (8,11).
Follow it if it still holds at the current state; change it if the state below shows a better option.
```

**Listing 5.2:** The plan-memory block at the start of a tower request.

If an answer contains no plan line, the previous plan is shown again with its own turn number, so its age is visible.
Nothing in the plan is executed; it differs from the commitment of Section 5.5.2, where the engine carries out the listed actions without asking again.

The line is read from the visible answer and, if it is absent there, from the reasoning, because DeepSeek-V4-Flash and Qwen3.5-397B write it inside their reasoning.
On single floors, plan memory lowered Qwen3.5-397B's result on the simple floor and is not used (Section 6.1.2).

## 5.6 Engine Assists and Overrides

Some actions need no judgement.
The engine takes them itself and records each as an *assisted* turn with its reason:

- collecting a reachable stat item, key or potion, except, on the tower, the Holy Water of MT14, which doubles current HP and is left to the model;
- fighting a monster that costs 0 HP;
- on the tower, taking the up-staircase of a visited floor whose next floor has never been visited, from whichever floor the hero is on;
- on the tower, opening an ice gate, which needs no key and only frees the way.

The engine also checks every action the model chooses.
A *mechanical override* replaces the choice with the rule-based heuristic's action when the chosen action is a dead-end door, a fight that cannot be won, or a lethal fight while a non-lethal action exists.
If only lethal or unwinnable fights remain, the episode ends as stuck instead of executing a fatal fight.
A dead-end door is one behind which nothing new can be reached with the keys held afterwards, except monsters that cannot be won; a character that gives an item or triggers a scripted event counts as something new.
Every override is logged with the model's choice, the executed action and the reason.

A *strategic override* replaces the model's choice by a judgement of the rule-based heuristic, for example whenever the heuristic judges another action much cheaper.
In the development phase, the engine applied such overrides without logging them, and Chapter 6 shows that every early win on the simple floor contained one (Section 6.4.1).
The two earlier tower observations (Section 5.5.3) also ran with an override that enforced the 40 % rule of the prompt.
A fight costing more than 40 % of current HP whose items made no unwinnable fight winnable was replaced by the cheapest alternative that made progress; if the model chose it again at the same stats, it was executed.
The final tower observation runs without this override, and rule 4 remains a rule of the prompt that the model may break.
Strategic overrides are disabled in the final configuration.
A single-floor result is attributed to the model only when no strategic override occurred; tower runs with the two earlier observations, which ran with the 40 % override, are reported as engine-assisted.

## 5.7 Prompt Optimisation

The prompt optimisation study (RQ2) uses a reflective loop derived from GEPA (Section 2.6).
It keeps GEPA's central operator, the rewriting of a prompt by a *teacher*, a model that reads execution traces, and drops the parts that operate across many task instances.
Each iteration has five steps:

1. **Evaluate.** The current prompt plays one episode on each of three training floors (the simple floor and two generated floors) at temperature 0.
   Its fitness is the mean goal score (Section 5.9.3).
2. **Build the reflection request.** A fixed template contains the scope of the task, a description of the observation the agent receives, the rules a new prompt must follow, the current prompt, one trace per training episode, and up to two earlier rewrites that scored worse.
   Each trace lists every decision with the chosen action, the hero's attributes afterwards, any override, and the end of the agent's reasoning, and ends with the outcome.
3. **Reflect.** The teacher writes a short diagnosis and one complete revised prompt.
4. **Validate.** The *validator*, a fixed check, rejects any candidate that contains coordinates, monster names, routes, lists of allowed fights or numbers of 100 or more.
   A rejected candidate is returned to the teacher once with the reasons.
5. **Select.** The candidate plays the same three floors.
   If its fitness is at least that of the best prompt so far, it becomes the new parent; otherwise the next reflection starts again from the best prompt.

If a candidate is rejected a second time, no candidate is produced in that iteration, and the parent is evaluated again.
Algorithm 5.2 summarises the loop.

**Algorithm 5.2:** Reflective prompt optimisation with a validator (single lineage, elitist).

```
Require: seed prompt P0, training floors F1..F3, task model M, teacher T, validator V, 6 evaluations
 1: P <- P0;  P_best <- none;  f_best <- -infinity;  R <- empty list
 2: for i = 1 to 6 do
 3:     f <- mean goal score of M with P, one episode per floor, temperature 0
 4:     if f >= f_best then P_best, f_best <- P, f
 5:     else append (P, f) to R                          // shown to the teacher as worse rewrites
 6:     if i = 6 then break
 7:     Tr <- traces of the episodes of P_best           // decisions, attributes, overrides, reasoning, outcome
 8:     P' <- T(template, P_best, Tr, last two entries of R)
 9:     if V(P') rejects then P' <- T(same request + the reasons for rejection)
10:     if V(P') accepts then P <- P' else P <- P_best
11: return P_best
```

A run consists of six evaluations, the seed prompt and five rewrites.
The second study uses eight; the runs on the complex floor alone use two episodes per evaluation and six or fifteen evaluations (Section 6.5).
In the terms of Section 2.6, the loop is a (1+1) evolutionary algorithm: the population is one prompt, mutation is the teacher's rewrite, fitness is the mean goal score, and selection is elitist.
It is referred to as the *(1+1) loop*; it corresponds to Naive Prompt Optimization (Chang and Chen, 2026).
Table 5.2 lists which parts of GEPA it uses.

**Table 5.2:** The parts of GEPA (Section 2.6.1) and their use in the two loops of this thesis.

| GEPA part | (1+1) loop | Pareto loop | Reason |
|---|---|---|---|
| Mutation by reflection on traces | yes | yes | the central operator; traces show the decisions that lost the game |
| Acceptance on the same batch | yes (all training floors) | no (every valid candidate joins the population) | with three floors, the batch is the whole training set |
| Pool of candidates | no (one prompt) | yes | |
| Parent selection from the Pareto frontier over instances | no | yes | |
| Merge of two frontier candidates | no | once per run | |
| Separate validation set during the search | no | no | one episode costs up to several dozen model calls; the held-out floors are used only after the search |
| Number of evaluations | 6 (8 in the second study) | 8 candidates | one episode costs up to several dozen model calls |

The *Pareto loop* adds GEPA's selection to the same teacher, validator, trace and harness.
Each candidate is scored on every training floor separately.
The parent of the next rewrite is drawn from the candidates that are best on at least one floor, with a weight equal to the number of such floors, and the teacher sees the parent's traces.
At the last slot, the teacher instead merges the two frontier candidates with the highest mean score, given both prompts and their per-floor outcomes.
The loop is implemented in the framework rather than taken from the GEPA library, because the library's instances are not the engine's floors and its reflection step does not apply the validator.
The two loops therefore differ only in how parents are selected and accepted, plus one merge (Table 5.2), so that a difference between them can be attributed to selection.

One further run removes the validator.
On the complex floor alone, the (1+1) loop starts from the single-floor prompt, and the teacher is told that the prompt will be used on that floor only and may contain positions, orders and conditions learned from the traces.
The teacher sees the traces and the end state of each episode, never the solver's route.
The result, the *evolved-route prompt*, is floor-specific knowledge like the solver-route prompt and is reported as a labelled condition; it tests whether evolution can compile from experience what the solver found by search.

From a methodological perspective, the restriction to small populations and few evaluations follows from the cost of the task.
One episode takes up to several dozen model calls, so a large population evaluated on many instances is not affordable.
The loop runs through the same engine, assists and measures as every other result, so that evolved and hand-written prompts are compared under identical conditions.
The template is reproduced in Appendix A.8 (Listing A.9), and the study design in Section 6.5.

## 5.8 Implementation

The agent, the engine, the solver interface and the evaluation harness are implemented in Python 3.12.
All models are accessed through the OpenAI-compatible interface of the GWDG SAIA service (Doosthosseini et al., 2026).
A repeated-episode harness executes each configuration $N$ times, records the complete configuration with each result, and writes one log per episode with every observation, answer, reasoning text, override and assisted turn.

The code of the framework, the platform and the analysis scripts is available at https://github.com/thetobysiu/mt-ai-lab.

The main models were selected by four criteria: available on the service for the whole study, open weights, a reasoning mode, and a decision time that allows repeated episodes.
Three models without a reasoning mode in these experiments, Mistral Medium 3.5, Llama-3.1-8B and DeepSeek-V4-Flash (no thinking), and the slow Qwen3.8-27B were added for specific contrasts (Section 6.1.1).
From a methodological perspective, this thesis restricts itself to the models served by one inference service.
This choice reflects practical constraints, as each episode needs up to several dozen calls to a large model.
It also places the models' availability outside the author's control: three models used in early experiments were removed from the service during the study (Chapter 7).
Section 6.1 lists the models and their settings.

The experiments are run and inspected through a web platform built for this thesis, the *Magic Tower AI Lab*.
It shows every running episode live on the game map, drawn either as annotated cells or with the original game's tiles, and replays stored episodes with the model's reasoning at each decision (Figure 5.3).
Every experiment of Chapter 6 is listed in a catalogue with its exact configuration and its reported result.
A reader can enter an API key for an OpenAI-compatible service, which is kept in memory only, and re-run any configuration under a new label; stored results are never overwritten.
The same catalogue is available from the command line.
A further page shows every prompt optimisation run iteration by iteration, with the prompt changes, the teacher's diagnosis and the validator's verdict.
An automated test suite pins the engine's rules, the four baseline results of the heuristic and the exact text of the observation at a reference decision.
Any change to the observation is therefore detected before it can affect an experiment.
The platform is described in Appendix C.

![The platform's log page](/thesis/img/fig_dash_04_llm_run_log_cot.png)

**Figure 5.3:** The platform's log page: stored run logs (left), the selected log's summary and hero state (centre left), the simple floor at turn 1 (centre right), and turn cards whose reasoning and action text expand on demand (right).

## 5.9 Measures

### 5.9.1 Success Rate

An episode is successful if the floor's goal is reached with the hero alive (Definition 4.1).
For a configuration run $N$ times with $k$ successes, the success rate is $\hat p = k/N$, reported as `k/N` with the Wilson 95 % interval (Wilson, 1927):

$$\frac{\hat p + \frac{z^2}{2N} \pm z \sqrt{\frac{\hat p (1 - \hat p)}{N} + \frac{z^2}{4N^2}}}{1 + \frac{z^2}{N}}, \qquad z = 1.96.$$

The Wilson interval is preferred to the normal approximation for small $N$ and for rates near 0 or 1 (Brown, L. D. et al., 2001).
At $N = 10$ its width is about ±0.25, so differences in success rate smaller than about 0.3 are not resolved.

### 5.9.2 HP Relative to the Optimum and State Value

Among successful episodes, quality is measured as $\text{HP}_{\text{final}} / \text{HP}_{\text{opt}}$, the final HP relative to the exact optimum of the floor (Section 4.6).
The ratio lies in $(0, 1]$, and 1 means the agent matched the solver.
It is undefined for failed episodes and is reported as the mean over successes.

To locate where a failed episode was lost, the exact solver is also applied to the states along the episode.
The *state value* of a state is the highest final HP that the exact solver can still reach from it; it is none when the boss can no longer be defeated.
A decision lowers the state value by the final HP it costs, and the decision after which the value becomes none is the decision that lost the episode (Section 6.4.5, Figure 6.2).

### 5.9.3 Goal Score

The prompt optimiser needs a single number per episode.
It uses

$$S_{\text{goal}} = \begin{cases} 0.5 + 0.5 \cdot \min\bigl(1, \text{HP}_{\text{final}} / \text{HP}_{\text{opt}}\bigr) & \text{success,} \\ 0.35 \cdot C & \text{failure with the hero alive,} \\ 0.15 \cdot C & \text{hero dead,} \end{cases}$$

where $C$ is the share of the floor's monsters defeated.
The success range lies above both failure ranges, so any success scores higher than any failure.
The two failure ranges, $[0, 0.35]$ and $[0, 0.15]$, overlap; a surviving failure outranks a death only at equal $C > 0$.

### 5.9.4 Paired Comparisons

When two prompts are evaluated on the same set of floors, they are compared with the exact sign test over the discordant pairs, the floor and repetition pairs in which exactly one of the two prompts wins.
With $n$ discordant pairs, of which $b$ favour the first prompt, the one-sided p-value is $\sum_{i=b}^{n} \binom{n}{i} 2^{-n}$.
The test is one-sided for the pre-registered confirmation (Section 6.5.2) and two-sided, twice the smaller tail, for the second study (Table 6.8).

### 5.9.5 Plan Check, Tower Progress and Cost

In the committed planning modes, every stored plan is checked by simulating it on the engine from the state in which it was written, with the assisted turns of the loop in between.
A step *breaks* when its target is not reachable, needs a key the hero does not hold, or is a fight that cannot be won or survived at that point.
*New decisions per plan* is the mean number of entries per plan that name neither an item nor an action already taken, such as a repeat of the chosen action.
A *clean* plan is one in which no step breaks (Table 6.10).

Tower runs are reported by the highest floor reached, whether the hero is alive, and the final HP, ATK and DEF.
A run that defeats the Nether Demon King on MT21 reaches the normal ending (Section 4.5.3) and counts as won.

The cost of a configuration is reported as model calls per episode (Table 6.9) and, where it matters, time per call.
Steps executed from a committed plan are not calls.
