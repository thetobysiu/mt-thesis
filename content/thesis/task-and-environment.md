# Chapter 4: Task and Environment

This chapter describes the environment in which all agents of this thesis act and the exact reference against which they are measured.
Section 4.1 introduces Magic Tower and its game rules, and Section 4.2 the deterministic combat formula.
Section 4.3 collects the strategy principles that follow from these rules or from expert play, and states which of them the prompts contain.
Section 4.4 defines the task formally.
Section 4.5 describes the floors used in the experiments, with the simple floor as the running example, and the scripted events of the tower.
Section 4.6 presents the exact solver that provides the optimum for every single floor, and the procedure by which the hand-designed floors were built with it.
Section 4.7 describes the two simple reference agents.

## 4.1 Magic Tower

Magic Tower (Chinese *Mota*) is a family of grid-based puzzle role-playing games.
This thesis uses the 24-floor edition in the open-source HTML5 implementation of the game (ckcz123, 2023), whose floor, monster and item data are read directly by the simulation engine (Chapter 5).

The hero moves on a grid of tiles.
Each floor of the tower is a grid of 13 by 13 tiles; the single-floor test maps measure 11 by 11 or 13 by 13 tiles.
Every tile holds exactly one element:

- **floor** tiles can be walked on, and **walls** cannot;
- **monsters** block the tile they stand on until the hero defeats them;
- **doors** block the tile until they are opened with a key of the same colour (yellow, blue or red), which is consumed;
- **items** are collected by stepping on them: red gems add attack, blue gems add defence, green gems add magic defence, potions add hit points, keys add one key of their colour, and swords and shields add larger amounts of attack or defence;
- **stairs** lead to the next or the previous floor;
- **shops** exchange gold or experience points (EXP) for attributes or keys.

The hero is described by hit points (HP), attack (ATK), defence (DEF), magic defence (MDEF), gold, EXP and the number of keys of each colour.
The hero dies when HP reaches 0.
Monsters, doors and items disappear permanently once they are defeated, opened or collected.

Two properties make the game suitable for studying planning.
First, it is fully deterministic: there are no random events, and the cost of every fight is known before it starts.
Every outcome can therefore be traced to a decision of the agent, not to chance.
Second, all resources are irreversible.
A key spent on one door is not available for another.
HP lost in a fight is recovered only through a limited number of potions and, on the tower, through levels, the Holy Water and shop purchases.
The order in which fights, doors and items are taken therefore decides whether a floor can be won and with how much HP.

## 4.2 Combat

A fight is resolved in rounds.
The hero strikes first; then hero and monster strike alternately until the monster's HP reaches 0.
Let $a_h, d_h$ be the hero's ATK and DEF and $h_m, a_m, d_m$ the monster's HP, ATK and DEF.
The hero deals $a_h - d_m$ damage per strike and therefore needs

$$T = \left\lceil \frac{h_m}{a_h - d_m} \right\rceil$$

strikes; if $a_h \le d_m$, the hero deals no damage and the fight cannot be won.
Because the hero strikes first, the monster strikes $T - 1$ times, each for $\max(0, a_m - d_h)$ damage.
The HP cost of the fight is

$$D = \max(0,\; a_m - d_h) \cdot (T - 1),$$

reduced by the hero's MDEF, and the fight is survivable if $D$ is smaller than the hero's HP.
Two consequences drive the strategy of the game.
Each point of ATK lowers $T$ and thus the number of monster strikes, and each point of DEF lowers the damage of every strike.
A stat item collected before a fight can therefore save more HP than its face value, because the point applies to every later strike.
A monster whose ATK does not exceed the hero's DEF costs nothing at all.

Monsters can carry special abilities that modify the formula; eight of them occur on the floors used in this thesis (Table 4.1; double and triple attack share a row).
The full algorithm, including the order in which the abilities are applied, is given in Appendix B.

**Table 4.1:** Special abilities of monsters that occur on the floors used in this thesis. $d$ = the monster's damage per strike after DEF. The further abilities that the engine implements (solid, counter attack, purify, mimic) and those the game defines without applying them in combat (poison, weaken, curse) occur on none of these floors.

| Ability | Effect on the fight | Where it occurs |
|---|---|---|
| Magic attack | The monster's strikes ignore the hero's DEF: $d = a_m$. | simple, complex, all hand-designed floors, 13 of 15 generated floors |
| First strike | The monster strikes once before the hero: $T$ strikes instead of $T - 1$. | complex, hand01–hand03 |
| Double / triple attack | The monster strikes two or three times per round. | complex, hand03 |
| Four-strike attack | The monster strikes four times per round. | the boss of complex and hand03 |
| Break armour | Adds $\lfloor 0.9 \cdot d_h \rfloor$ damage before the fight; penalises high DEF. | complex, hand03 |
| Fixed damage | Adds a fixed amount of damage to the fight. | tower, wizards from MT6 |
| Vampire | Drains a fixed share of the hero's current HP before the fight. | tower, from MT7 |

On the simple floor, hand04 and the generated floors, magic attack is the only ability; hand01 and hand02 add one first-strike monster each.
The complex floor and hand03 combine six abilities, which is one reason they are harder.
On the tower up to MT21, where defeating the Nether Demon King brings the game's *normal ending* (Section 4.5.3), only fixed damage and vampire occur.

On the simple floor, the hero starts with 470 HP, ATK 9 and DEF 4.
A Green Slime (HP 50, ATK 7, DEF 3) takes $\lceil 50/6 \rceil = 9$ strikes and costs $3 \cdot 8 = 24$ HP.
A Black Slime (HP 45, ATK 5, DEF 5) has magic attack: it takes 12 strikes and costs $5 \cdot 11 = 55$ HP, where the same monster without the ability would cost 11.
The boss (HP 50, ATK 20, DEF 12) cannot be fought at all with ATK 9.
At the optimal final state of ATK 13 and DEF 8, it takes 50 strikes and costs $12 \cdot 49 = 588$ HP.
To win, the hero must therefore reach the boss with ATK above 12 and more HP than the boss fight costs.

## 4.3 Strategy Principles

The game rules of Sections 4.1 and 4.2 say what is allowed; they do not say what is good.
A *strategy principle* is a regularity of good play that the game does not enforce.
Table 4.2 lists the principles used in this thesis, each labelled by its source.
The sources are mainly the combat formula, the exact solver of Section 4.6 and an expert walkthrough of the 24-floor edition (Expert walkthrough, n.d.).
The walkthrough is a community text in Chinese whose author is unknown; it is archived with the repository.
In four cases, the source is a game rule, the game data, the tower's structure or a design choice of this thesis.
The last column states how the agent meets each principle: as a numbered *prompt rule* of a system prompt (Section 5.4, Appendix A), as a computed line of the observation (Section 5.2, Section 5.5.3), or not at all.
The prompts may state general principles but no floor-specific knowledge (Section 5.4).
The walkthrough principles S11 to S14 are specific to floors of the tower and therefore never appear as prompt rules.
Where the engine shows a fact that bears on them, the fact is computed for the current state, and the decision is left to the model.

**Table 4.2:** Strategy principles, their source and how the agent meets them. Rule n = prompt rule n of the tower prompt (Appendix A.2). The single-floor prompt (Appendix A.1) states tower rules 2, 4, 5 and 6 as its rules 1, 3, 4 and 5; its rule 3 uses 40 % instead of 60 % and omits the clause on gold and EXP. It states the lowest-effective-cost preference of tower rule 5 as its rule 2, and tower rules 1 and 3 have no single-floor counterpart.

| # | Principle | Source | How the agent meets it |
|---|---|---|---|
| S1 | DEF lowers every strike; a monster whose ATK does not exceed the hero's DEF costs nothing. | combat formula | rule 2; `[FREE if DEF>=X]` on every fight except magic-attack fights and, on the tower, vampire fights |
| S2 | ATK lowers the number of rounds; just above a monster's DEF it is winnable but still expensive, and the cost falls only at the values of ATK where $\lceil h_m / (a_h - d_m) \rceil$ drops. | combat formula | rule 3; `[WINNABLE at ATK>=X]` on lethal fights |
| S3 | Take a stat item before the fights it makes cheaper. | combat formula, exact solver | rule 2; net stat-route and fight-order lines (Sections 5.2.3, 5.2.4) |
| S4 | Potions add HP whenever they are taken; their order does not change any fight. | combat formula | potions listed separately from the lookahead value (Section 5.2.2) |
| S5 | Never pay HP for a fight that unlocks nothing that is needed. | exact solver | rule 5; lookahead tree |
| S6 | A key spent on one door is lost for every other, and keys lie behind doors; the choice of door can decide the floor. | exact solver (on the simple floor, opening the yellow door (7,0) at the first decision makes the floor unwinnable, Figure 4.3) | rule 6; key lines and key budget (Section 5.2.5) |
| S7 | Do not take a fight that costs a large share of the current HP while anything else can still make progress. | design of this thesis (irreversibility of HP) | rule 4 (60 %); single-floor rule 3 (40 %) |
| S8 | On the tower, see the next floor before spending on the current one. | tower structure | rule 1; the engine takes the staircase to an unvisited floor itself (Section 5.6) |
| S9 | In shops, never buy HP; buy DEF before ATK, but enough ATK for the fights on the way up; buy where a point is cheapest. | combat formula, expert walkthrough (Expert walkthrough, n.d.) | rule 3; way-up line, purchase and shop-price lines (Section 5.5.3) |
| S10 | Hand in the Cross late: its gain is a third of the stats at that moment. | game rule of the Cross | rule 3; Cross line |
| S11 | The first Red Bat on MT8 needs far more ATK than the monsters before it; the walkthrough pays about 72 % of the hero's HP for it. | expert walkthrough (Expert walkthrough, n.d.) | not stated; way-up line computes the cost |
| S12 | Keep a red key for the door in front of the Red Demon King on MT16; red keys are the scarcest resource of the tower. | expert walkthrough (Expert walkthrough, n.d.) | not stated; key-reserve line (Section 5.5.3) |
| S13 | Save 500 EXP and 500 gold for the Holy Sword (+120 ATK) and the Holy Shield (+120 DEF) on MT15; the Holy Sword raises ATK towards the King's DEF of 1,000, and the Holy Shield lowers or removes his cost. | expert walkthrough (Expert walkthrough, n.d.), game data | not stated; trade actions and treasure line (Section 5.5.3) |
| S14 | Take the Holy Water (HP doubled) on MT14 as late as possible. | expert walkthrough (Expert walkthrough, n.d.) | not stated; the engine collects the other potions itself but leaves the Holy Water to the model |

Principles S1 to S7 are told or shown on every floor, and S8 to S10 on the tower.
S11 to S14 are knowledge that an expert brings to the tower and the agent does not; it must find them from the computed lines.
Several tower runs of Section 6.7.3 stop where they apply: at the Red Bats on MT8, and at the red door and the Red Demon King on MT16.

## 4.4 Task Definition

The task studied in this thesis is to win a floor: to defeat its boss and survive, or, on floors without a boss, to reach a given goal.
The agent never moves tile by tile.
At every turn, the engine enumerates the *targets* the hero can reach and act on, and the agent chooses one of them; the engine then walks the shortest path and performs the action.

> **Definition 4.1 (Floor task).**
> A floor task is a tuple $(S, s_0, A, \delta, G)$.
>
> - A **state** $s \in S$ consists of the hero's position, HP, ATK, DEF, MDEF, gold, experience and keys per colour, together with the set of monsters, doors and items remaining on the floor.
> - $s_0$ is the initial state defined by the floor file.
> - The **legal actions** $A(s)$ are the actions on targets reachable from the hero's position without passing a monster or a closed door: fight a reachable monster that the hero can damage ($a_h > d_m$), open a reachable door for which a key is held, collect a reachable item, use a shop, or take a reachable staircase.
>   A fight that would kill the hero is legal and ends the episode; under the final configuration, the engine lists it with a tag and does not execute it (Section 5.6).
> - The **transition** $\delta(s, a)$ is deterministic: it applies the combat formula of Section 4.2 or the effect of the item, door, shop or staircase, and removes the monster, door or item.
> - The episode ends when the goal is reached, when the hero dies, or when $A(s)$ contains no action that keeps the hero alive.
> - The episode is **successful** if the goal $G$ is reached with $\text{HP} > 0$.
>   Among successful episodes, the outcome is the final HP.

The optimum of a floor, $\text{HP}_{\text{opt}}$, is the largest final HP of any successful action sequence.
It exists for every single floor used here, because the state space is finite and at least one winning sequence exists.
It is computed exactly by the solver of Section 4.6.
Chapter 5 defines how success rates and the ratio of final HP to $\text{HP}_{\text{opt}}$ are measured over repeated episodes.

For the tower, the task spans consecutive floors, the hero keeps its state between them, and staircases connect the floors.
In the game, walking between visited floors costs nothing.
A tower state's legal actions are therefore the actions on every reachable target of every visited floor.
A staircase appears only when it leads to a floor not yet visited, and the engine then takes it itself (Sections 5.5.3 and 5.6).
Tower runs are measured by the highest floor reached and by whether the normal ending on MT21 is reached (Section 5.9.5).

## 4.5 Floors

Table 4.3 lists the floors used in the experiments.

**Table 4.3:** Floors used in this thesis. Monsters = monster tiles including the boss; Start = hero HP / ATK / DEF at the start; $\text{HP}_{\text{opt}}$ = exact optimum with the hero's final ATK and DEF (the complex optimum also has MDEF 20); Winning sets = distinct sets of monsters and doors cleared on the way to a win, not computed for the generated floors; States = states expanded by the exact solver. "—" = not applicable. Maps of the six fixed single floors in Appendix B.5.

| Floor | Size | Monsters | Start | $\text{HP}_{\text{opt}}$ (ATK, DEF) | Winning sets | States | Role |
|---|---|---|---|---|---|---|---|
| Simple | 11 × 11 | 14 | 470 / 9 / 4 | 13 (13, 8) | 1 | 412 | development, main evidence and running example |
| Complex | 13 × 13 | 25 | 1000 / 10 / 10 | 68 (16, 20) | 32 | 729,953 | boundary of the agent |
| hand01 | 11 × 11 | 13 | 400 / 9 / 4 | 14 (14, 7) | 1 | 461 | not used in development |
| hand02 | 11 × 11 | 13 | 62 / 9 / 4 | 13 (13, 9) | 1 | 1,539 | not used in development |
| hand03 | 13 × 13 | 16 | 649 / 10 / 10 | 9 (14, 14) | 1 | 118,351 | not used in development |
| hand04 | 11 × 11 | 14 | 94 / 9 / 4 | 3 (13, 8) | 1 | 7,917 | not used in development |
| Generated (15) | 11 × 11 | 8–14 | 470 / 9 / 4 | 13–250 | not computed | 36–652 | prompt optimisation |
| Tower MT0–MT23 | 13 × 13 per floor | — | 1000 / 10 / 10 | — | — | — | long horizon |

The **simple** and **complex** floors are the single-floor test maps of the published reference solver (ckcz123, 2017).
The simple floor has exactly one winning set and an optimum of 13 HP.
This final HP of the optimal route is the floor's *slack*: a decision that wastes 13 HP or more loses the floor.
It is the floor on which the agent was developed and on which the error analysis of Chapter 6 is carried out.
The complex floor has more doors, monsters with magic attack and break armour, and many more states.
Its optimum requires taking the expensive fights only after the stat items that make them cheap.

The four **hand-designed floors** were built for this thesis.
Their layouts were drafted by a large language model, Claude Opus 5.5 (Anthropic), used as a coding assistant.
Every version was solved exactly.
A version was kept only when it met four design targets: exactly one winning set, a small slack, failure of the rule-based heuristic, and no win in 500 random games (Section 4.6.3).
They are used only for evaluation.
The fifteen **generated floors** come from a generator that joins nine 3 × 3 rooms by a random spanning tree with one or two extra links (Appendix B.3).
Each link becomes a door, a monster or an open passage, and the rooms are filled with the simple floor's monsters and items.
A floor is kept only if the exact solver wins it with an optimum between 1 and 250 HP.
The rule-based heuristic wins 8 of them.
They are the training and held-out floors of the prompt optimisation study.

### 4.5.1 The Running Example: the Simple Floor

Figure 4.1 shows the simple floor in full.
The hero starts at the top with 470 HP, ATK 9, DEF 4 and no key; the boss stands at the bottom and is reached only past a Bat.
The floor has four yellow doors and five yellow keys, four red and four blue gems, and six potions; besides the boss, the thirteen monsters are slimes, Slime Lords and two Bats.

The floor falls into regions, each opened by a door or a monster.
Below the start, the Black Slime (6,4) or the Red Slime (5,3) opens a *central corridor*.
From it, the Bat (3,5) leads to a *left corridor* with a red gem, a key and a potion, the yellow door (7,5) to the *right-hand rooms*, and the Green Slime (5,6) to the *boss corridor*, which ends with the Bat (5,9) and the boss (5,10).
Off the boss corridor, the yellow door (4,7) and the Black Slime (3,7) lead into a *lower-left room* with two keys and a blue gem; at its far end, the Slime Lord (1,9) guards a blue gem and a blue potion.
At the top, the yellow doors (7,0) and (8,0) and the Green Slime (9,0) lead to a *top-right room* with a red gem and two potions, and the Slime Lords (4,2) and (2,1) guard a *top-left corner* with a red gem and a key.
The right-hand rooms hold a potion behind the door, a blue gem and a potion behind the Black Slime (9,5), and a red gem and a blue gem behind the Red Slime (10,7) and the Slime Lord (9,9).

The exact solver finds a single winning set: the optimal route opens all four doors and fights thirteen of the fourteen monsters, ending with 13 HP at ATK 13 and DEF 8.
Only the Red Slime at (5,3) is left.
Table 4.4 lists the route action by action, and Figure 4.1 numbers it on the map.
In terms of regions, the route enters the central corridor, the boss corridor and the lower-left room, then takes the top-right room and the left corridor, enters the right-hand rooms, fights the Slime Lord (1,9) at the far end of the lower-left room, finishes the right-hand rooms and the top-left corner, and ends with the Bat (5,9) and the boss.
Counting each monster and door separately, the route has seventeen actions; the published solver merges some neighbouring obstacles and counts twelve decisions (Section 4.6.1).
For each of these seventeen actions, the solver also evaluates every legal alternative.
At all seventeen, at least one alternative makes the boss unwinnable (the action is *critical*), and at ten of them every alternative does (the action is *forced*).
On average, 87 % of the legal alternatives at an action of the optimal route lose the game.
The first of these actions answers the first decision of Figure 2.4.

**Table 4.4:** The optimal route of the simple floor. Cost = HP lost in the action; ATK / DEF = before the action; Behind it = what the action makes reachable (collected without a decision); Losing = legal alternatives after which the boss can no longer be defeated, of all legal alternatives; Turn = turn of the same action on the winning trajectory of the model's episodes (Section 6.4), which takes action 11 before action 8 and ends at 2 HP.

| # | Action | Cost | ATK / DEF | Behind it | Losing | Turn |
|---|---|---|---|---|---|---|
| 1 | Black Slime (6,4) | 55 | 9 / 4 | central corridor | 3 of 3 | 2 |
| 2 | Green Slime (5,6) | 24 | 9 / 4 | boss corridor | 3 of 5 | 3 |
| 3 | door (4,7) | 0 | 9 / 4 | Black Slime (3,7) | 6 of 6 | 4 |
| 4 | Black Slime (3,7) | 55 | 9 / 4 | lower-left room: two keys, blue gem | 4 of 4 | 5 |
| 5 | door (7,0) | 0 | 9 / 5 | door (8,0) | 5 of 6 | 9 |
| 6 | door (8,0) | 0 | 9 / 5 | Green Slime (9,0) | 5 of 6 | 10 |
| 7 | Green Slime (9,0) | 16 | 9 / 5 | top-right room: red gem, two potions | 5 of 5 | 11 |
| 8 | Bat (3,5) | 144 | 10 / 5 | left corridor: red gem, key, potion | 3 of 4 | 18 |
| 9 | door (7,5) | 0 | 11 / 5 | right-hand rooms: potion | 4 of 4 | 22 |
| 10 | Black Slime (9,5) | 35 | 11 / 5 | blue gem, potion | 4 of 4 | 24 |
| 11 | Slime Lord (1,9) | 52 | 11 / 6 | blue gem, blue potion | 3 of 4 | 15 |
| 12 | Red Slime (10,7) | 24 | 11 / 7 | Slime Lord (9,9) | 3 of 3 | 27 |
| 13 | Slime Lord (9,9) | 39 | 11 / 7 | red gem, blue gem | 3 of 3 | 28 |
| 14 | Slime Lord (4,2) | 22 | 12 / 8 | Slime Lord (2,1) | 1 of 2 | 31 |
| 15 | Slime Lord (2,1) | 22 | 12 / 8 | top-left corner: red gem, key | 1 of 2 | 32 |
| 16 | Bat (5,9) | 81 | 13 / 8 | boss | 1 of 1 | 35 |
| 17 | boss (5,10) | 588 | 13 / 8 | — | 1 of 1 | 36 |

![The simple floor drawn with the game's own tiles](/thesis/img/4.1.png)

**Figure 4.1:** The simple floor, drawn with the game's own tiles; the numbers 1 to 17 mark the actions of the optimal route in the order of Table 4.4. Positions are (x, y), with column x counted from the left and row y from the top, both starting at 0. The hero starts at (5,0) with 470 HP, ATK 9, DEF 4 and no key; the boss (5,10) is reached only past the Bat (5,9). Other objects: yellow doors and keys, red gems (+1 ATK), blue gems (+1 DEF), red potions (+75 HP), blue potions (+200 HP), green, red and black slimes, four Slime Lords and a second Bat (3,5); brown tiles are walls. The same map as a text grid is given in Appendix B.5.1.

### 4.5.2 The Tower

The tower consists of floors MT0 to MT23; the last floor is split into three parts in the game data.
Stairs connect neighbouring floors in both directions, and the hero may go back to any visited floor at no cost to collect what was left.
The monsters' attributes are taken from the game data.
All six shops of the game are modelled, as are the gift characters on the second floor.
With the final tower observation, no shop sells yellow or blue keys, although the original game does: an expert never buys them, and the gold is needed for attributes.
Blue keys are offered again only for the continuation from MT18 in Section 6.7.3.
Two shops shape the early tower: the gold shop on MT3, reached once its yellow door is open, and the experience shop on MT5, where 30 EXP buy 5 ATK or 5 DEF.
The only way to the experience shop passes a Big Bat (150 HP, ATK 65, DEF 30).
It costs 1,470 HP at ATK 33 and DEF 35 but 322 HP at ATK 40 and DEF 42.
The scripted events of the tower, and which of them the engine models, are summarised in Section 4.5.3.

The two earlier tower observations of Section 5.5.3 ran with the values of nine items (three swords, four shields, the green gem and the pack) from another edition of the game.
The engine of the final tower observation uses the item values of the game data.
It models the hero's level and the two items that raise it besides the experience shops: the Small Feather on MT6 (one level: +1,000 HP, +10 ATK, +10 DEF) and the Big Feather, which the wizard on MT13 hands over (three levels: +3,000 HP, +30 ATK, +30 DEF).
It also models the MT4 thief, the Cross at the MT0 fairy and the seal in front of the Cross on MT7, which opens only when all four White Warriors on that floor are dead.
Some scripts of the upper floors are not modelled (Section 4.5.3).
The engine's map can therefore differ from the game's in the tiles these scripts change; the highest floor reached is a result on the engine, not a claim about the original game.

### 4.5.3 Scripted Events of the Tower

A *scripted event* is a script attached to a tile that changes the map or the hero beyond what the tile's kind does.
Shops are part of the game rules (Section 4.1) and are not counted here.
Table B.4 in Appendix B.7 lists every scripted event of the game data up to MT21, where the normal ending is reached, and summarises the floors above it.
It includes the items whose effect is itself a script (key box, Holy Water, feathers, Cross), because the engine had to model each of them separately.
The events that change play are of four kinds.
Characters give or trade items: the fairy's keys on MT0, the sword and shield on MT2, the Big Feather on MT13 and the two trades on MT15.
Scripts change the map: the MT4 thief opens a passage on MT2 and later two tiles on MT18, a seal on MT7 guards the Cross, and the up-staircases of MT18 and MT20 stay hidden until their events.
Items act through scripts: the key box, the Small Feather, the Holy Water and the Cross, which raises HP, ATK and DEF by a third at the fairy.
Boss fights upgrade monsters: after the Red Demon King on MT16, three monster kinds and the King himself become stronger, and after the first fight with the Nether Demon King on MT19, he becomes stronger for the second fight on MT21.
Of the 23 rows of Table B.4, the engine of the final tower observation models 19, one of them only in part.
Two need no model, the monster manual and the floor-flying item; two are not modelled, the story item of MT16, which matters only for the ending, and the events after the normal ending.

The two MT15 trades and the red door in front of the Red Demon King decide whether MT16 can be passed.
The King (15,000 HP, ATK 1,000, DEF 1,000) can be fought once the hero's ATK exceeds 1,000 and costs nothing once DEF reaches 1,000.
The door needs a red key that must be kept or bought (principles S12 and S13 of Table 4.2).

## 4.6 The Exact Reference Solver

The reference solver was published for the game series by ckcz123 (2017).
It searches for the best possible result of a floor, the win with the most HP left, over the decisions that matter instead of over the hero's steps on the grid.
Its published implementation contains an error in the pruning of states; the corrected version, described at the end of Section 4.6.2, is the *exact solver* used throughout this thesis.
It works in two stages: it first turns the grid into a graph of the things the hero can interact with (Section 4.6.1), and then searches over orders in which those things can be cleared (Section 4.6.2).
Section 4.6.3 describes how the solver is used as the baseline of all experiments and as the tool with which the hand-designed floors were built.

### 4.6.1 From Grid to Graph

Every tile that holds something is a **node**: each monster, door and item, the boss, and the hero's starting position.
Two nodes are joined by an **edge** when the hero can walk from one to the other over empty floor, moving in the four grid directions.
The walk may not pass through another node (the hero's start tile counts as empty floor), so an edge means "once one of the two is cleared, the other is directly reachable".
Figure 4.2 shows the result for the simple floor before merging: 38 nodes and 55 edges.
The graph drops grid distances and keeps only which objects block which.
The yellow key at (5,1), directly below the start, is joined to the start, to the yellow door (7,0) and to three monsters, the Slime Lord (4,2), the Red Slime (5,3) and the Black Slime (6,4); once the key is taken, these are the four choices of Figure 2.4.
The boss at (5,10) has a single neighbour, the Bat at (5,9), so every win fights the Bat before the boss.

![The exact solver's node graph of the simple floor](/thesis/img/fig_solver_graph_simple.png)

**Figure 4.2:** The exact solver's node graph of the simple floor before merging, drawn at the map positions. Circles: monsters (numbers as in Appendix B.5.1), boss, keys (k), gems (a = +ATK, d = +DEF), potions (p = +75 HP, P = +200 HP); squares: doors (Y yellow); @ = the hero's start. An edge joins two nodes that are connected by empty floor; grey tiles are walls.

When a node is cleared, the hero stands on its tile and inherits its edges.
The set of nodes adjacent to the hero is therefore always the set of things the hero can reach next, which corresponds to the action list the engine offers the language model (Chapter 5).
The solver also merges neighbouring items into one node, because they are always taken together.
Under a strict condition (Appendix B.2.1), it merges neighbouring obstacles as well, so that one of its decisions can clear more than one monster or door.
Neither merge changes any result.

### 4.6.2 Search

A **state** of the search is the hero's attributes (HP, ATK, DEF, MDEF, keys), the node the hero stands on, and the set of nodes already cleared.
A **decision** clears one adjacent monster or door (or a merged group of them, Section 4.6.1): the solver subtracts the exact damage of Section 4.2 or uses a key.
A decision that would kill the hero or needs a missing key is not allowed.
After every decision, the solver takes every adjacent item and fights every adjacent monster that costs 0 HP, repeatedly until none is left.
On the single floors solved here, doing so never lowers the final result: items only add to the hero's attributes, and a free fight only removes an obstacle.
The two abilities under which an item could raise a later cost do not interfere.
Vampire, whose drain grows with the hero's HP, occurs on no single floor.
Break armour adds $\lfloor 0.9 \cdot d_h \rfloor$, but every break-armour monster on these floors strikes at least twice, so a point of DEF saves more than it adds.
This step is why the search runs over decisions rather than moves: collecting a potion is never a choice.

The solver keeps a queue of states, ordered by the number of decisions made and then by HP.
It repeatedly takes the first state, stops that line of search when the boss has been defeated or after 45 decisions, and otherwise adds one successor state for every adjacent monster or door.
A state in which the boss is defeated is a **win**; the set of monsters and doors cleared on the way is its **winning set**, and the optimum $\text{HP}_{\text{opt}}$ is the highest HP among all wins.

The search stays small because of **dominance** (Section 2.7).
Since every item on the way is collected automatically, the set of cleared monsters and doors fixes the hero's ATK, DEF, MDEF and keys.
Two states with the same cleared set can differ only in HP and in the hero's node.
The cleared nodes form one connected region that the hero crosses at no cost, so the node does not change what can be reached next, and the state with less HP can never do better.
The solver therefore keeps, for every cleared set, only the state with the most HP.
The cleared set is stored as a 64-bit mask, which limits a floor to 64 monsters and doors.
Algorithm 4.1 summarises the search.

**Algorithm 4.1:** Exact search over decisions with dominance (corrected version).

```
Require: node graph G, start state s0 (attributes, start node, cleared set = {})
Ensure:  optimum HP_opt and the set W of winning sets
 1: s0 <- AUTO(s0)                          // take adjacent items and 0-HP fights
 2: Q <- queue ordered by (decisions, -HP);  push s0 into Q
 3: best[cleared(s0)] <- HP(s0);  HP_opt <- none;  W <- {}
 4: while Q is not empty do
 5:     s <- pop(Q)
 6:     if HP(s) < best[cleared(s)] then continue         // dominated after it was queued
 7:     if the boss is defeated in s then
 8:         HP_opt <- max(HP_opt, HP(s));  add cleared(s) to W;  continue
 9:     if decisions(s) = 45 then continue
10:     for each monster or door n adjacent to the hero in s do
11:         if n is a door and s holds no key of its colour then continue
12:         s' <- s with n cleared (exact damage subtracted or key used), hero on n
13:         if HP(s') <= 0 then continue                  // lethal or unwinnable
14:         s' <- AUTO(s')
15:         if cleared(s') is new or HP(s') > best[cleared(s')] then
16:             best[cleared(s')] <- HP(s');  push s' into Q
17: return HP_opt, W
```

Line 6 is the test that the published implementation gets wrong, as described below.

Figure 4.3 adds the solver states to the first decision of Figure 2.4.
After the key at (5,1) has been taken, four choices are possible.
Each leads to a new state, and the value shown is its state value, the best HP that any continuation reaches.

```
after the key at (5,1): HP 470, ATK 9, DEF 4, 1 yellow key
├─ fight Slime Lord (4,2)   → HP 356, 1 yellow key
│                               state value: none, the boss cannot be defeated
├─ fight Red Slime (5,3)    → HP 414, 1 yellow key
│                               state value: none
├─ fight Black Slime (6,4)  → HP 415, 1 yellow key
│                               state value: 13 HP                        ← optimal
└─ open yellow door (7,0)   → HP 470, no key
                                state value: none
```

**Figure 4.3:** The first decision of the simple floor in the solver's search tree. The state value of each branch comes from solving the resulting state exactly. Only the Black Slime keeps a win reachable. The Red Slime is not in the floor's only winning set: everything behind it is also reached past the Black Slime, so its 56 HP are wasted. The Slime Lord is in it, but costs 114 HP now against 22 HP where the optimal route fights it, far more than the floor's slack of 13 HP. The door spends the only key, which the optimal route needs at its third action for the door (4,7), behind which the next two keys lie; the observation tags this door as a dead end, and the engine replaces a choice of it (Listing 5.1, Section 5.6). The tag is recomputed at every decision; at turn 9, with two keys in hand, the same door is no longer a dead end.

In the published implementation, the dominance comparison is made when a state is added to the queue.
A second test, made when a state is taken from the queue, keeps whichever state with a given cleared set comes first, regardless of its HP.
Because the queue orders states by the number of decisions before HP, a state with more HP that needs one more decision is discarded.
On the complex floor, the published solver therefore reports an optimum of 22 HP.
The exact solver, which also compares HP when a state is taken from the queue, finds 68 HP with ATK 16, DEF 20 and MDEF 20.
The 21-decision route to 68 HP was executed action by action in the game engine; every action is legal and the boss is defeated with 68 HP remaining.
On the simple floor and all fifteen generated floors, the exact solver and an independent Python reimplementation agree.
All optima in this thesis come from the exact solver.

### 4.6.3 The Solver as Baseline and as Design Tool

The solver is not an agent that the language model competes with; it is the reference against which every episode is measured.
It provides three things.
First, the optimum $\text{HP}_{\text{opt}}$ of each floor, against which the final HP of a successful episode is expressed (Section 5.9).
Second, the number of distinct winning sets, which tells how many essentially different ways of winning a floor exist: the simple floor has one, the complex floor 32.
Third, a per-decision analysis.
From any state of an episode, each legal action is applied and the resulting state is written out as a new floor.
The solver then determines whether that floor can still be won and with how much HP.
Applied along the optimal route, this yields the critical and forced actions of Section 4.5.1.
Applied to an agent's episode, it gives the *state value* after every decision, the highest final HP that can still be reached, and so locates the decision after which the boss can no longer be defeated (Section 6.4.5).

The same analysis was used to build the four hand-designed floors (Appendix B).
Random layouts leave much slack: 13 of the 15 generated floors have an optimum of 150 to 250 HP, and the heuristic wins eight of them, so a model can win them without choosing well.
The hand-designed floors were meant to be as tight as the simple floor.
Each was built in a loop:

1. **Draft.** A layout is written as a text grid (walls, doors, keys, gems, potions, monsters, boss, start), together with a monster table and the hero's starting attributes.
   Each draft is built around one difficulty mechanism observed on the simple and complex floors (the four mechanisms are listed in Appendix B).
   The drafts were written by the language model named in Section 4.5 from this description.
2. **Solve.** The draft is converted into a floor file and solved exactly.
   The solver reports the optimum, the states expanded, the number of winning sets and the number of optimal ones.
3. **Change the layout while there is more than one way to win.** If two different winning sets reach the same optimum, no change of the hero's attributes can separate them.
   The layout is changed instead, typically by removing an alternative entrance: on hand01, into the two wings behind the doors (4,8) and (6,8) (Figure B.2); on hand02, one of two identical monsters guarding the same room.
4. **Tune the start HP.** Once the layout admits a single winning set, the start HP decides how many sets are affordable.
   The solver is run for every start HP from the smallest winnable value upwards (Table 4.5).
   More HP pays for extra fights, so the number of winning sets grows quickly.
   The start HP is set to a value at which the winning set is still unique and a slack of a few HP remains at the optimum.
   On hand03 and hand04, the layout and the start HP were changed together.
5. **Check the reference agents.** The per-decision analysis gives the critical and forced actions, and the rule-based heuristic and random play (Section 4.7) are run.
   A floor is kept only if both fail.

**Table 4.5:** Start HP against the optimum and the number of distinct winning sets, from the exact solver. The first row of each floor is the smallest start HP at which the floor can be won; bold = the start HP used.

| Floor | Start HP | $\text{HP}_{\text{opt}}$ | Winning sets |
|---|---:|---:|---:|
| hand01 | 395 | 9 | 1 |
| | **400** | **14** | **1** |
| | 405 | 19 | 1 |
| | 410 | 24 | 3 |
| | 420 | 34 | 5 |
| | 460 | 74 | 15 |
| | 700 | 314 | 48 |
| hand02 | 50 | 1 | 1 |
| | **62** | **13** | **1** |
| | 75 | 26 | 4 |
| | 100 | 51 | 15 |
| | 200 | 151 | 183 |
| | 400 | 351 | 702 |
| hand03 | 641 | 1 | 1 |
| | 645 | 5 | 1 |
| | **649** | **9** | **1** |
| | 655 | 15 | 2 |
| | 670 | 30 | 10 |
| | 700 | 60 | 55 |
| | 800 | 160 | 711 |
| hand04 | 92 | 1 | 1 |
| | **94** | **3** | **1** |
| | 142 | 51 | 82 |
| | 242 | 151 | 982 |
| | 492 | 401 | 2,684 |

The first versions of all four floors failed the uniqueness target, with 4, 2, 2 and 5 winning sets.
The final versions have one winning set each, optima of 14, 13, 9 and 3 HP, and between 461 and 118,351 solver states.
On each, the heuristic fails and random play never wins.
The floors are therefore tight by construction and not representative of the game.
Because they were built to defeat the rule-based heuristic, its failure on them is a design property, not a finding.

The solver's internals, the correction and the tooling are documented in Appendix B.

## 4.7 Reference Agents

Two simple agents bracket the LLM agents from below.

The **rule-based heuristic** chooses the first available action in a fixed priority order.
It collects swords and shields, then gems, then keys, then potions.
At a shop, it buys ATK when a reachable monster's DEF is at least the hero's ATK, and DEF otherwise.
If no item or purchase is available, it takes the door or winnable fight whose cost, net of the items behind it, is lowest, preferring the cheapest of near-equal fights.
When no such door or fight is left, it takes the stairs.
It needs no model calls.
It reaches MT8 of the tower but fails the simple floor (the boss survives, and the hero ends with 443 HP), the complex floor and all four hand-designed floors.
Preferring the cheapest fight is the choice that the ordering structure of these floors punishes.

**Random play** chooses uniformly among the legal actions that do not kill the hero.
It wins none of the 500 games played on each hand-designed floor.

In the following chapter, the hybrid agent that acts in this environment is described: what the engine computes, what the language model sees, and how its choice is turned into an action.
