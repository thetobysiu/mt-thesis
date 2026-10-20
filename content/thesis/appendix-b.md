# Appendix B: Combat Rules, Exact Solver and Floors

This appendix gives the full damage algorithm of Section 4.2 and the internals of the exact solver of Section 4.6.
It then describes how the generated and hand-designed floors were built and gives the maps and monster tables of the six fixed single floors.
Section B.6 lists where each complex-floor episode was lost (Table B.3), and Section B.7 lists the scripted events of the tower (Table B.4).

## B.1 The Damage Algorithm

Algorithm B.1 is the damage computation of the engine.
It follows the combat rules of the game; on the six fixed single floors, it gives the same cost for every fight as the published solver.

**Algorithm B.1:** Damage of one fight. Ability codes follow the game data (1 first strike, 2 magic attack, 3 solid, 4 double, 5 triple, 6 N-strike, 7 break armour, 8 counter attack, 9 purify, 10 mimic, 11 vampire, 22 fixed damage).

```
Require: hero (HP, ATK, DEF, MDEF), monster (HP, ATK, DEF, abilities, n, vampire ratio, fixed damage)
Ensure:  damage D, HP after, whether the fight can be won
 1: if mimic then monster ATK, DEF <- hero ATK, DEF
 2: if solid and monster DEF < hero ATK - 1 then monster DEF <- hero ATK - 1
 3: h <- hero ATK - monster DEF                     // hero damage per strike
 4: if h <= 0 then return unwinnable
 5: T <- ceil(monster HP / h)                       // hero strikes
 6: if magic attack then d <- monster ATK else d <- max(0, monster ATK - hero DEF)
 7: if double then d <- 2d else if triple then d <- 3d else if N-strike then d <- n * d   (n = 4 by default)
 8: I <- 0                                          // damage before the fight
 9: if first strike then I <- I + d
10: if vampire then I <- I + floor(hero HP * vampire ratio)
11: if break armour then I <- I + floor(0.9 * hero DEF)
12: if purify then I <- I + 3 * hero MDEF
13: c <- floor(0.1 * hero ATK) if counter attack else 0
14: D <- I + (d + c) * (T - 1)                      // the monster strikes T - 1 times
15: if fixed damage then D <- D + fixed amount
16: D <- max(0, D - hero MDEF)
17: return D, hero HP - D, (hero HP - D > 0)
```

The engine treats a fight with $D \ge$ HP as lethal.
If the model chooses it while a non-lethal action exists, the mechanical override replaces the choice by the action of the rule-based heuristic.
If only lethal or unwinnable fights remain, the episode ends as stuck (Section 5.6).
The two route-prompt conditions run without the mechanical overrides, so a lethal fight chosen there while another action exists is executed (Section 5.4).
On the floors of this thesis, only magic attack, first strike, double and triple attack, the four-strike attack, break armour, fixed damage and vampire occur (Table 4.1).

## B.2 The Exact Solver

The solver was published by ckcz123 (2017) in Java.
All optima in this thesis come from a copy with the correction of Section 4.6.2; the published solver is kept unchanged.
The engine of this thesis reads the solver's floor files, so the agent, the solver and the reference agents play identical floors.

### B.2.1 Graph Construction and Merging

Every tile that is not floor or wall, and the hero's start tile, becomes a node.
Two nodes are joined when the hero can walk between them over floor tiles without passing another node (Section 4.6.1).
Two neighbouring nodes are merged when both hold only items, because collecting one always exposes the other.
Under a stricter condition, two neighbouring obstacles are merged as well.
Neither may be the boss, they may share no neighbour, and all their other neighbours must be joined to one another, so that merging hides no choice.
A node that holds an item is never merged with a door or monster, because that would hide the cost of the obstacle.

### B.2.2 Published and Corrected Dominance Test

The published search performs two tests on the *dominance key* of a state, the set of cleared door and monster nodes.
When a successor is added to the queue, it is discarded if a state with the same key and at least as much HP has been seen.
When a state is taken from the queue, a set of keys already expanded is consulted, and the state is discarded if its key is in the set, whatever its HP.
Because the queue orders by the number of decisions first, a state with more HP that reaches the same key in more decisions is taken later and discarded.
The corrected search replaces the second test by the HP comparison (line 6 of Algorithm 4.1).
Table B.1 compares the two versions.

**Table B.1:** Published and corrected solver. Winning sets are counted by the corrected version only. On the complex floor, the published version reports 13 winning routes, the best of which ends at 22 HP. States = states expanded. Time = search time reported by each version in one run, with both versions run one after the other on the same laptop CPU (Intel Core i5-1135G7, Java 26).

| Floor | Version | Optimum HP (ATK, DEF, MDEF) | Winning sets | States | Time |
|---|---|---|---|---|---|
| Simple | published | 13 (13, 8, 0) | — | 412 | 0.12 s |
| Simple | corrected | 13 (13, 8, 0) | 1 | 412 | 0.10 s |
| Complex | published | 22 (14, 17, 20) | — | 703,456 | 38 s |
| Complex | corrected | 68 (16, 20, 20) | 32 | 729,953 | 42 s |

The replay of the 68-HP route and the agreement with an independent Python reimplementation, which prunes by HP only, are reported in Section 4.6.2.
The two multi-floor test maps that ship with the solver have no solution within 45 decisions and are not used.

### B.2.3 Per-Decision Analysis

The per-decision analysis of Section 4.6.3 writes the state after each legal action out as a new floor file and solves that floor.
In that file, the cleared tiles are removed and the hero starts with the current attributes.
The optimum of that floor is the *state value* of the successor state; it is none when the boss can no longer be defeated.
Critical and forced actions are defined in Section 4.5.1.
The analysis of hand03 (118,351 states) takes about 70 s.

## B.3 Generated Floors

One floor is produced per integer seed, deterministically, in six steps:

1. **Rooms.** An 11 × 11 grid of walls holds nine 3 × 3 rooms, separated by the wall lines at $x = 3, 7$ and $y = 3, 7$.
2. **Topology.** The hero starts in a random room of the bottom row and the boss is placed in a random room of the top row.
   A random spanning tree joins all nine rooms, and one or two further links between neighbouring rooms add alternative routes.
3. **Links.** Each link is one tile in the wall between two rooms.
   A link into the boss room is always a Slime Lord or a Bat, so the boss is never reached for free.
   Every other link is a yellow door with probability 0.35, a monster with probability 0.45, and open floor otherwise.
4. **Contents.** No item or extra monster is placed in the boss room.
   Five or six ATK gems, one or two blue potions and three to five further monsters are placed outside the start room.
   Three to five DEF gems and three to five red potions may lie in any other room.
   There is one yellow key per door, or at random one fewer, but at least one.
5. **Tables.** Monsters, item values and the hero's start (470 HP, ATK 9, DEF 4) are those of the simple floor, so only the layout is new.
6. **Acceptance.** The floor is solved exactly and kept only if the boss can be defeated with an optimum between 1 and 250 HP; otherwise the next seed is tried.

The first five floors were drawn from seeds 100 onwards and the other ten from seeds 300 onwards, before any prompt was evaluated on them.
All fifteen were re-solved with the exact solver, and no optimum changed.
Table 6.12 lists their optima.

## B.4 Hand-Designed Floors

Each hand-designed floor was drawn around one difficulty mechanism observed on the simple and complex floors (Table B.2).
The layouts were drafted by Claude Opus 5.5 as text grids, together with a monster table and the hero's start, and each version was accepted only after the loop of Section 4.6.3.

**Table B.2:** Design mechanisms of the hand-designed floors.

| Floor | Mechanism | Size |
|---|---|---|
| hand01 | Key ledger: four yellow doors and one blue door, with the keys inside the rooms they help to reach; every side room can be entered either through a door (costs a key) or past a monster (costs HP). | 11 × 11 |
| hand02 | Defence thresholds: guards become free at DEF 14, the Skeleton needs ATK; two yellow keys for four doors. | 11 × 11 |
| hand03 | The complex floor's special abilities (double and triple attack, magic attack, break armour, first strike, four-strike boss) on a new layout; green gems add MDEF. | 13 × 13 |
| hand04 | Six yellow doors for two keys, a costly shortcut past a Bat, and the boss behind the only blue door. | 11 × 11 |

The first versions and the checks of the final floors against the reference agents are reported in Section 4.6.3.

## B.5 Maps and Monster Tables

The following grids show the six fixed single floors as text: `@` hero, `B` boss, `#` wall, `.` empty floor, letters for doors, keys and items as listed under each grid.
Coordinates are (x, y) with the origin at the top left, as in the observation.
Digits are monster types, numbered per floor in the order of the floor's monster table.
Monster names are those that the engine shows to the model; on the complex floor and hand03 they label monster types of the solver's test map and do not match the game's monsters of the same name.

### B.5.1 Simple Floor

The map is drawn with the game's tiles in Figure 4.1.

```
     x = 0 1 2 3 4 5 6 7 8 9 10
y =  0   . a # # # @ . Y Y 1 .
y =  1   k . 4 . # k # # # a .
y =  2   # # # . 4 . . . # p P
y =  3   # a # # # 2 . # # # #
y =  4   k . p # # . 3 . # # d
y =  5   . . . 5 . . # Y . 3 .
y =  6   # # # # # 1 # . # . p
y =  7   d # # 3 Y . # p # # 2
y =  8   . # k . # . # # # # .
y =  9   P 4 . # # 5 # . . 4 .
y = 10   # k d # # B # a d . #
```

Start: 470 HP, ATK 9, DEF 4, no keys. `Y` yellow door, `k` yellow key, `a` red gem (+1 ATK), `d` blue gem (+1 DEF), `p` red potion (+75 HP), `P` blue potion (+200 HP).

| Symbol | Monster | HP | ATK | DEF | Ability |
|---|---|---|---|---|---|
| 1 | Green Slime | 50 | 7 | 3 | – |
| 2 | Red Slime | 70 | 11 | 1 | – |
| 3 | Black Slime | 45 | 5 | 5 | magic attack |
| 4 | Slime Lord | 80 | 10 | 5 | – |
| 5 | Bat | 100 | 17 | 2 | – |
| B | Boss | 50 | 20 | 12 | – |

### B.5.2 Complex Floor

Figure B.1 shows the floor with the game's tiles.

![The complex floor drawn with the game's own tiles](/thesis/img/B.1.png)

**Figure B.1:** The complex floor, drawn with the game's own tiles; positions as in Figure 4.1. The tiles show monster types by their engine names; their attributes are those of the table below, not those of the game's monsters of the same name. (1) the yellow door (8,7), which the single-floor episodes open early; (2) the Red Slime (11,8), the decision that lost most complex-floor episodes (Table B.3). Blue doors and keys are drawn in blue, green gems give +5 MDEF.

```
     x = 0 1 2 3 4 5 6 7 8 9 10 11 12
y =  0   k K # g d # B # p d .  2  p
y =  1   . a b p . # a # # 6 #  #  g
y =  2   6 # # # 7 . b . 5 . #  #  b
y =  3   . d . # . # # # . 2 p  #  d
y =  4   3 # 5 . d . 1 # Y # .  5  p
y =  5   . a . # b # p # d # Y  #  #
y =  6   6 # # # g . 1 # p # 1  .  d
y =  7   . p . # 4 # # # Y # #  .  p
y =  8   # # . 1 . Y . k . . #  2  #
y =  9   7 d 3 . . # K # # . .  .  3
y = 10   b # # 4 # # . # a # 4  #  k
y = 11   . P # . 7 . . # g # .  #  p
y = 12   a a # d d # @ . 1 # P  .  6
```

Start: 1,000 HP, ATK 10, DEF 10, no keys. `Y` yellow door, `b` blue door, `k` yellow key, `K` blue key, `a` red gem (+1 ATK), `d` blue gem (+1 DEF), `g` green gem (+5 MDEF), `p` red potion (+75 HP), `P` blue potion (+200 HP).

| Symbol | Monster | HP | ATK | DEF | Ability |
|---|---|---|---|---|---|
| 1 | Green Slime | 42 | 20 | 0 | triple attack |
| 2 | Red Slime | 50 | 20 | 7 | – |
| 3 | Black Slime | 32 | 49 | 4 | break armour |
| 4 | Slime Lord | 90 | 30 | 0 | magic attack |
| 5 | Bat | 63 | 34 | 1 | double attack |
| 6 | Big Bat | 120 | 33 | 2 | – |
| 7 | Red Bat | 54 | 56 | 3 | first strike |
| B | Boss | 178 | 26 | 0 | four-strike attack |

The floor holds three yellow keys for four yellow doors and two blue keys for five blue doors.
Only the blue door (6,2) gates the boss: with every other door open and this one closed, the boss cannot be reached.
The exact optimum (68 HP, ATK 16, DEF 20, MDEF 20) opens five doors in the order yellow (5,8), blue (0,10), yellow (8,7), blue (6,2) and yellow (8,4).
It never opens the yellow door (10,5) or the blue doors (2,1), (4,5) and (12,2).
It fights 15 of the 24 monsters besides the boss and still collects all 20 gems.
The nine monsters it leaves are the Bat (8,2), the Black Slime (0,4), the Green Slimes (3,8) and (10,6), the Red Bat (4,11), the Red Slimes (9,3) and (11,0), and the Slime Lords (4,7) and (10,10).
The published solver's route, which the solver-route prompt lists, opens yellow (8,7), yellow (8,4), blue (6,2), blue (12,2) and yellow (5,8).
Opening (8,7) first and (8,4) second lowers the state value to 42 and then 22 HP.

### B.5.3 hand01

Figure B.2 shows the floor with the game's tiles and the three actions of the first decision discussed in Section 6.7.1.

![hand01 drawn with the game's own tiles](/thesis/img/B.2.png)

**Figure B.2:** hand01, drawn with the game's own tiles; positions as in Figure 4.1. The hero starts at (5,10) with one yellow key. The marks are the actions of the first decision, numbered as in Listing G.4: (1) the yellow door (4,8) to the left wing, (2) the Black Slime (5,4) in the central room, which blocks nothing, and (3) the yellow door (6,8) to the right wing, which holds the blue key (8,10) for the blue door (5,2) in front of the Big Bat and the boss.

```
     x = 0 1 2 3 4 5 6 7 8 9 10
y =  0   a . 4 # . B . # 4 . d
y =  1   . a . # . 6 . # . p .
y =  2   # Y # # # b # # # Y #
y =  3   . 1 . # . . . # . 2 .
y =  4   k . d # . 3 . # a . k
y =  5   # 2 # # . . . # # 1 #
y =  6   a 2 . . # . # . . 1 .
y =  7   . a # . # . # . # d .
y =  8   . . 5 . Y . Y . 3 . .
y =  9   # # . . # . # . . # #
y = 10   p . k . # @ # . K . p
```

Start: 400 HP, ATK 9, DEF 4, one yellow key. `Y` yellow door, `b` blue door, `k` yellow key, `K` blue key, `a` red gem (+1 ATK), `d` blue gem (+1 DEF), `p` red potion (+75 HP).

| Symbol | Monster | HP | ATK | DEF | Ability |
|---|---|---|---|---|---|
| 1 | Green Slime | 50 | 7 | 3 | – |
| 2 | Red Slime | 70 | 11 | 1 | – |
| 3 | Black Slime | 45 | 5 | 5 | magic attack |
| 4 | Slime Lord | 80 | 10 | 5 | – |
| 5 | Bat | 100 | 17 | 2 | – |
| 6 | Big Bat | 120 | 20 | 4 | first strike |
| B | Boss | 50 | 20 | 12 | – |

### B.5.4 hand02

```
     x = 0 1 2 3 4 5 6 7 8 9 10
y =  0   . . . # a . d # d . d
y =  1   . B . 5 . P . Y . a .
y =  2   . . . # . . . # . . .
y =  3   # 3 # # # b # # # 4 #
y =  4   a . p # . K . # d . p
y =  5   . 1 . Y . 2 . 5 . 5 .
y =  6   . . . # . . . # . . .
y =  7   # 5 # # # 2 # # # Y #
y =  8   k . . # a . . # d . k
y =  9   . @ . Y . 2 . 1 . 1 .
y = 10   p . . # . . . # . . .
```

Start: 62 HP, ATK 9, DEF 4, no keys. `Y` yellow door, `b` blue door, `k` yellow key, `K` blue key, `a` red gem (+1 ATK), `d` blue gem (+1 DEF), `p` red potion (+75 HP), `P` blue potion (+200 HP).

| Symbol | Monster | HP | ATK | DEF | Ability |
|---|---|---|---|---|---|
| 1 | Green Slime | 50 | 7 | 3 | – |
| 2 | Black Slime | 45 | 5 | 5 | magic attack |
| 3 | Bat | 100 | 17 | 2 | – |
| 4 | Skeleton | 40 | 12 | 8 | first strike |
| 5 | Yellow Guard | 60 | 14 | 6 | – |
| B | Boss | 100 | 18 | 10 | – |

### B.5.5 hand03

```
     x = 0 1 2 3 4 5 6 7 8 9 10 11 12
y =  0   B 6 . . # a . d # . g  .  P
y =  1   . . 7 . . . 1 . b . #  .  .
y =  2   # # # # Y # # # . # #  2  #
y =  3   d . 3 . . . # . 4 . #  .  a
y =  4   . # . # . # k # . # .  #  .
y =  5   a # g # . 2 . . . Y .  .  d
y =  6   . # . # Y # . # . # #  #  5
y =  7   5 . 1 . # . @ . # p .  1  .
y =  8   # Y # # # . . . # # #  Y  #
y =  9   . d . # 4 . K . 4 # .  a  .
y = 10   . p . # . . . . . # .  g  .
y = 11   a . k # . Y # Y . # k  .  d
y = 12   . . 3 . . p # p . . 7  .  .
```

Start: 649 HP, ATK 10, DEF 10, no keys. Symbols as on the complex floor; the monster table is that of the complex floor.

### B.5.6 hand04

```
     x = 0 1 2 3 4 5 6 7 8 9 10
y =  0   a . 6 . # B # . 3 . d
y =  1   # Y # . # b # . # Y #
y =  2   k . 2 . . . Y . . . p
y =  3   # # # 4 # # # 1 # # #
y =  4   d . p . . # . . a . k
y =  5   # 3 # # # # Y # # 2 #
y =  6   . . a . p . . . . . 4
y =  7   # Y # # # 5 # # # Y #
y =  8   p . . 2 . @ . 1 . . d
y =  9   # . # # # # # # # . #
y = 10   K . 4 . a . d . 3 . P
```

Start: 94 HP, ATK 9, DEF 4, no keys. Symbols as on hand02.

| Symbol | Monster | HP | ATK | DEF | Ability |
|---|---|---|---|---|---|
| 1 | Green Slime | 50 | 7 | 3 | – |
| 2 | Red Slime | 70 | 11 | 1 | – |
| 3 | Black Slime | 45 | 5 | 5 | magic attack |
| 4 | Slime Lord | 80 | 10 | 5 | – |
| 5 | Bat | 100 | 17 | 2 | – |
| 6 | Skeleton | 60 | 15 | 7 | – |
| B | Boss | 60 | 22 | 10 | – |

## B.6 Where the Complex-Floor Episodes Are Lost

Table B.3 lists, per configuration, the decision after which the boss could no longer be defeated in each complex-floor episode.
It covers the episodes of the re-run of Table 6.2 and two earlier Qwen3.5-397B configurations with the single-floor prompt (Section 6.4.5).
The per-decision analysis of Section B.2.3 gives the state value after every decision of an episode.
A decision lowers the state value by the final HP it costs, and the decision after which the state value becomes none is the decision that lost the episode.
Figure 6.2 in Chapter 6 plots the state value along every episode of Table B.3.

**Table B.3:** The decision after which the boss of the complex floor can no longer be defeated, per configuration. Exact state values along every episode of the re-run of Table 6.2 and of two earlier Qwen3.5-397B configurations (Section 6.4.5). Turn = game turn. Earlier value losses = decisions that lowered the state value before it.

| Configuration | Episodes | Wins | Decision that lost the episode | Earlier value losses |
|---|---|---|---|---|
| Single-floor prompt, DeepSeek-V4-Flash | 5 | 0 | Red Slime (11,8), turn 9 (5) | yellow door (8,7): 68 → 42 (4) or 30 (1) |
| Single-floor prompt, Mistral Medium 3.5 | 5 | 0 | Red Slime (11,8), turn 9 (5) | yellow door (8,7): 68 → 30 (5) |
| Single-floor prompt, Qwen3.5-397B | 5 | 0 | Red Slime (11,8), turn 9 (4); Red Bat (4,11), turn 9 (1) | yellow door (8,7): 68 → 42 (3) or 30 (2) |
| Single-floor prompt, Qwen3.6-35B | 5 | 0 | Red Slime (11,8), turn 9 (5) | yellow door (8,7): 68 → 30 (5) |
| Single-floor prompt, Qwen3.5-397B, earlier configurations (Table 6.5, rows 5 and 6) | 10 | 0 | Red Slime (11,8), turn 9 (8) or 12 (2) | yellow door (8,7): 68 → 42 (6) or 30 (2); Black Slime (12,9) at turn 6: 68 → 26 (2) |
| Solver-route prompt, DeepSeek-V4-Flash | 5 | 4 | Red Slime (11,8), turn 12 (1) | yellow doors (8,7), (8,4): 68 → 42 → 22 |
| Solver-route prompt, Mistral Medium 3.5 | 5 | 0 | Red Slime (11,8), turn 16 (5) | same |
| Solver-route prompt, Qwen3.5-397B | 5 | 3 | Red Slime (11,8), turn 13 (1); Big Bat (9,1), turn 24 (1) | same |
| Solver-route prompt, Qwen3.6-35B | 10 | 4 | Red Slime (11,8), turn 12 (3); Big Bat (9,1), turn 24 (1); Big Bat (0,6), turns 47–49 (2) | same, and Green Slimes (6,4), (6,6) at turns 37–39 |

The traces and the scripts that compute them are listed in Table D.4.

## B.7 Scripted Events of the Tower

Table B.4 lists the scripted events of the tower summarised in Section 4.5.3.

**Table B.4:** Scripted events of the tower, from the floor files of the game data. Modelled = whether the engine of the final tower observation models the scripted event.

| Floor | Tile | Trigger | Effect | Modelled |
|---|---|---|---|---|
| MT0 | fairy (6,9) | talk | gives one yellow, one blue and one red key; the fairy moves to (5,9) | yes (keys granted at the start) |
| MT0 | fairy (5,9) | talk, holding the Cross | HP, ATK and DEF increased by a third, once; also opens the way from MT20 to MT21 | yes (stat increase) |
| MT1 | (2,11) | pick up | monster manual; no effect on play | not needed |
| MT2 | old man (8,11), trader (10,11) | talk | Steel Sword (+70 ATK), Silver Shield (+30 DEF) | yes |
| MT4 | thief (6,1) | talk | opens the sealed passage (2,7) on MT2 to the two MT2 characters | yes |
| MT4 | thief (6,1) | talk again, holding the ice pickaxe of MT12 | clears (6,9) and (6,10) on MT18 | yes |
| MT5, MT14 | key box (1,1), (4,1) | pick up | one yellow, one blue and one red key | yes |
| MT6 | Small Feather (1,1) | pick up | one level: +1,000 HP, +10 ATK, +10 DEF | yes |
| MT7 | Cross (6,5), behind a seal | pick up | Cross for the MT0 fairy; also removes the old man on MT16 | yes (seal, Cross); removal not modelled |
| MT9 | (1,1) | pick up | floor-flying item; walking between visited floors is already free in the engine | not needed |
| MT10 | ice gates | step on | open without a key | yes |
| MT12 | ice pickaxe (11,1) | pick up | needed for the second MT4 dialogue | yes (item only) |
| MT13 | wizard (8,11) | talk | Big Feather: three levels, +3,000 HP, +30 ATK, +30 DEF | yes |
| MT14 | Holy Water (6,4) | pick up | doubles the current HP | yes |
| MT15 | old man (5,4) | talk, with at least 500 EXP | Holy Sword, +120 ATK, for 500 EXP | yes |
| MT15 | trader (7,4) | talk, with at least 500 gold | Holy Shield, +120 DEF, for 500 gold | yes |
| MT16 | old man (5,5) | talk | a story item for the MT0 fairy (needed only for the ending); no effect on combat | no |
| MT16 | Red Demon King (6,6) | after the fight | Spirit Warrior, Nether Captain, Spirit Mage and the King himself become stronger for the rest of the game | yes |
| MT18 | princess (6,5), behind two red doors and the tiles the thief clears | talk | shows the up-staircase (11,11), hidden until then | yes |
| MT19 | Nether Demon King (6,7) | after the fight | the Nether Demon King becomes stronger (45,000 HP, ATK 2,550, DEF 2,250) for the fight on MT21 | yes |
| MT20 | up-staircase (6,8) | handing the Cross to the fairy on MT0 | shows the staircase to MT21, hidden until then | yes |
| MT21 | Nether Demon King (6,2) | after the fight | the normal ending of the game | yes |
| MT21–MT23 | Nether Demon King (MT21), fairy | after the fight, talk | further monster upgrades, the three staffs and the hidden ending | no |
