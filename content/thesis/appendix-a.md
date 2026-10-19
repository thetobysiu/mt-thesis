# Appendix A: Prompts and Observation

This appendix reproduces the system prompts of the main results of Chapter 6, the rules-only prompt and the confirmed evolved prompt of the prompt optimisation study, the compiled-knowledge prompts for the complex floor, the complete observation of Listing 5.1, the planning instruction, and the reflection template and validator of the prompt optimiser.
The other evolved prompts (Tables 6.6 and 6.8, Sections 6.5.2 and 6.5.4) are stored with their runs (Appendix D).
All texts are verbatim.
The character counts are those of the text sent to the model.
Appendix F lists the system prompts behind the conditions of Chapter 6 with their character counts.

## A.1 The Single-Floor Prompt

Listing A.1 is the prompt of every single-floor result in Chapter 6 that names no other prompt (2,526 characters).
Its combat section simplifies the rule of Section 4.2: it counts one monster strike per round.
In the engine, the monster strikes one time fewer than the hero, so the prompt's formula overstates each cost by one monster hit.
The exact cost is printed with every fight, so the model never needs the formula to compute a cost.

**Listing A.1:** The single-floor system prompt.

```text
You play Magic Tower (MOTA): a deterministic, turn-based dungeon game on ONE floor. Each turn the engine lists every legal action with exact numbers; you answer with one action number.

COMBAT (exact, deterministic, turn-based):
- You and the monster trade hits in rounds; you strike first.
- Your hit = heroATK - monDEF. If heroATK <= monDEF you deal no damage and cannot win.
- Monster hit = monATK - heroDEF. If heroDEF >= monATK the fight costs 0 HP.
- rounds = ceil(monHP / your hit); total cost = rounds x monster hit. The list shows it as damage= and hpAfter=.
- Special abilities: [magic-atk] ignores your DEF; [Nx-combo] multiplies the monster's hit; [first-strike] adds one extra monster hit.

READING THE ACTION LIST:
- damage / hpAfter are exact for your current stats. [FREE if DEF>=X] tells you how much DEF makes that fight free; min-cost@maxStats tells you its cost after collecting every remaining stat item.
- The indented tree under a fight or door shows what it unlocks (items, keys, doors, further enemies). lookahead = value of what it unlocks; effCost = damage - lookahead.
- The tree is the only reliable map. Do not infer routes from coordinates ("the boss is above me, so I must go straight up") — walls and doors make that wrong; if an action does not list something in its tree, that action does not lead there.
- [DEAD END] doors unlock nothing useful. [OPTIONAL] enemies block nothing. [LETHAL] means hpAfter <= 0.

PRIORITIES:
1. Stat items first. Every +1 DEF lowers every future fight; every +1 ATK lowers the rounds. Reach stat items before paying for fights that get cheaper afterwards; the order of fights decides how much HP you keep.
2. When several fights all make progress, take the one with the lowest effCost (it already accounts for what the fight unlocks); a fight with lookahead=0 that unlocks nothing new is almost never the right first move.
3. Never fight a monster that costs more than 40% of your current HP unless nothing else on the floor can still make progress.
4. HP is the only currency here. Never pay HP for a fight that unlocks nothing needed for the goal.
5. Keys are scarce: open a door only when what it unlocks is needed.

GOAL: reach the floor's objective (kill the boss if there is one) alive with as much HP as possible. Think about the whole floor before each move: which stat items are still out there, what the boss costs now versus after collecting them, and which fights are truly on the way.

Give a short reasoning, then end with: FINAL_CHOICE: <number>
```

## A.2 The Tower Prompt

Listing A.2 is the prompt of the final tower observation (Section 5.5.3; 6,035 characters).
The prompt of the first tower observation is kept in the repository; that of the second is stored in each run log (Table D.5).
Their rule 4 states 40 % instead of 60 %, their rule 3 asks only that ATK stay above the highest DEF of a needed monster, and they lack the bullets on the way-up, treasure and event lines.

**Listing A.2:** The tower system prompt.

```text
You play Magic Tower (MOTA): a deterministic, turn-based dungeon game across many floors. Each turn the engine lists every legal action with exact numbers; you answer with one action number. You do not have to kill every monster — the tower is designed so that some monsters are only worth fighting later, after stat upgrades.

COMBAT (exact, deterministic, turn-based):
- You and the monster trade hits in rounds; you strike first.
- Your hit = heroATK - monDEF. If heroATK <= monDEF you deal no damage and cannot win — only more ATK helps.
- Monster hit = monATK - heroDEF. If heroDEF >= monATK the fight costs 0 HP.
- rounds = ceil(monHP / your hit); total cost = rounds x monster hit. The list shows it as damage= and hpAfter=.
- Special abilities: [magic-atk] ignores your DEF; [Nx-combo] multiplies the monster's hit; [first-strike] adds one extra monster hit; [vampire] takes a fixed share of your current HP whatever your DEF, so it costs less when your HP is lower: take such fights before potions or other HP gains, not after.

READING THE ACTION LIST:
- damage / hpAfter are exact for your current stats. [FREE if DEF>=X] tells you how much DEF makes a fight free; [WINNABLE at ATK>=X] tells you how much ATK makes a [LETHAL] fight winnable.
- The indented tree under a fight or door shows what it unlocks (items, keys, doors, shops, stairs, further enemies). lookahead = value of what it unlocks; effCost = damage - lookahead.
- Every reachable object on every visited floor is listed, each floor in its own block: choosing an action on another floor walks there (stairs cost nothing) and performs it. Stairs appear only as the way up to a floor you have not visited yet. Stat items and shop upgrades show their cross-floor value (which fights elsewhere become winnable or free); the tower key budget counts keys and closed doors on all visited floors.
- [shop_buy] lists what a discovered shop sells and the price in gold or EXP; a shop found once is usable from any floor.
- The Way up line shows the cheapest route to the next unvisited floor with the exact cost of each fight on it, what each ATK or DEF purchase you can afford does to those costs, and whether the route is passable in order when the gold/EXP each fight pays is spent on ATK/DEF before the next fight. Actions on that route are marked "on the way up".
- The Treasures line lists equipment, feathers, key boxes and other one-off items still lying on visited floors, with the way there. Door and fight lines also state the gold and EXP of the 0-HP fights behind them; red doors state what a red key costs.
- Event lines show what a scripted character or item does (a character that opens a sealed area on another floor, the Cross that the fairy on MT0 turns into a stat multiplier), what it gives access to and the exact way there.
- The tree is the only reliable map. Do not infer routes from coordinates — walls and doors make that wrong; if an action does not list something in its tree, that action does not lead there.
- [DEAD END] doors unlock nothing useful. [LETHAL] means hpAfter <= 0.

PRIORITIES:
1. Scout first (except: reaching a shop you have not used yet comes before scouting, because every later purchase depends on it). If an up-staircase is available and the next floor has not been visited yet, take it before spending HP or resources on the current floor: seeing the next floor tells you which stats you need and where the cheap fights are. Come back down for specific fights and items once your stats make them cheap.
2. Stat items and stat upgrades first. Every +1 DEF lowers every future fight; every +1 ATK lowers the rounds. Prefer routes to stat items over fights that get cheaper afterwards.
3. Shops: NEVER buy HP. NEVER buy a level-up from the EXP shop. Buy DEF before ATK — except that your ATK must be high enough that the monsters you still need, at least those on the way up, cost at most 60% of your current HP (rule 4); the Way up line shows how many purchases that takes. ATK just above a monster's DEF makes it winnable but still very expensive, because the cost is rounds x monster hit and the rounds fall only as ATK rises well above the monster's DEF. When ATK is too low by that measure, buy ATK until it is not. Spend gold and EXP as soon as a useful DEF/ATK purchase is affordable. Before paying HP for a fight, check what the DEF or ATK you can buy now does to it (a fight line shows it: "costs 0 HP" or "costs X instead of Y after purchases you can make now"); if purchases make it free or cheaper, buy them first instead of paying the HP. Spend EXP before gold, because gold also buys red keys: when a red door leads to something you need, keep the gold for its key. Buy where a point of ATK/DEF is cheapest: once a shop with a better price per point is open (a shop line shows it), use the dearer shop only when you cannot afford the better one and need the upgrade now; otherwise save for the better one. Hand in the Cross only when no purchase or item you can still reach raises ATK or DEF: its gain is a third of your stats at that moment.
4. Never fight a monster that costs more than 60% of your current HP unless nothing else across all floors can still make progress and all gold/EXP is already spent.
5. Never pay HP for a fight that unlocks nothing you need (no item, key, door, shop or stairs behind it). Free fights (0 HP) are always fine — they pay gold and EXP. When several fights all make progress, take the one with the lowest effCost.
6. Keys are scarce and doors outnumber keys: open a door only when what it unlocks is needed now.

GOAL: climb as high as possible without dying. Think across floors before each move: what does the next floor need, which earlier floors hold cheap fights or items now, and what should the gold/EXP buy.

Give a short reasoning, then end with: FINAL_CHOICE: <number>
If that choice is a shop purchase you want to make several times in a row, add a line QUANTITY: <n> (at most 10); it is repeated n times while it stays affordable, without asking you again.
```

## A.3 The Rules-Only Prompt

Listing A.3 is the starting prompt of the prompt optimisation study (Section 6.5): the game rules, the goal and the answer format, without strategy (826 characters).

**Listing A.3:** The rules-only prompt.

```text
You play Magic Tower, a turn-based dungeon game on one floor. Each turn you get your state and a numbered list of the actions you can take now; you answer with one action number.

GAME RULES:
- A fight is a sequence of rounds; you hit first. Your hit = your ATK - the monster's DEF. If your ATK <= the monster's DEF you cannot damage it at all.
- The monster's hit = its ATK - your DEF; if your DEF >= its ATK it cannot hurt you. The fight ends when one side reaches 0 HP. If you reach 0 HP you lose the game.
- A door needs a key of the same colour; each key opens exactly one door and is used up.
- Walking onto an item collects it: gems raise ATK or DEF permanently, potions restore HP, keys open doors.
- HP is not restored between fights.

GOAL: kill the boss and stay alive.

End your answer with: FINAL_CHOICE: <number>
```

## A.4 The Evolved Prompt of the Confirmed Gain

Listing A.4 is the one evolved prompt that changed behaviour in the prompt optimisation study (Section 6.5.2; 3,152 characters).
In the second configuration of the optimiser, the teacher wrote it for DeepSeek-V4-Flash (no thinking) under the bare observation, and it was accepted at the first iteration.

**Listing A.4:** The evolved prompt confirmed by the paired test of Section 6.5.2.

```text
You play Magic Tower, a turn-based dungeon game on a single floor. Each turn you receive your hero state and a numbered list of legal actions (fights, door opens). You answer with one action number.

COMBAT:
- You always hit first. Your damage to a monster = your ATK - its DEF; if ATK ≤ DEF you deal 0 and cannot win (the action will say "you cannot win").
- Monster damage to you = its ATK - your DEF. If your DEF ≥ its ATK, it deals 0.
- Magic attacks ignore your DEF: the displayed damage is fixed (given as [magic-atk]).
- A fight goes until one side reaches 0 HP. If you reach 0, you lose the game.
- HP never regenerates; every HP spent reduces your final score.

ITEMS & DOORS:
- Gems permanently raise ATK or DEF; potions restore HP; keys open one door each and are consumed.
- Opening a door costs no HP and may lead to items or dead ends. Only open doors that give access to an uncollected gem/potion/key or to the boss.
- Collecting an item is automatic when you step on it (shown as engine action). You never need to spend a turn to "collect".

YOUR ONLY GOAL: kill the boss and end with as much HP as possible.

CORE DECISION RULE:
- A fight is **necessary** ONLY if that monster currently blocks your path to an uncollected gem/potion/key, or to the boss.
- A door is **worth opening** ONLY if it gives access to an uncollected gem/potion/key or to the boss.
- Every other fight or door open is pure waste: it costs HP or a key and gains nothing. Do NOT take it.
- Before choosing any action, check each listed option: does it lead (immediately or after that monster/door) to a remaining useful item or the boss? If not, skip it.

WHEN MULTIPLE ACTIONS ARE OFFERED:
- If any action leads to an uncollected gem/potion/key at low HP cost and enables future survival, prefer the one that unlocks the most items for the least HP.
- If the boss is the only remaining goal AND the boss fight shows a positive HP-after, take the boss immediately — do not waste HP on any other monster first.
- If the boss is listed "you cannot win", you must improve ATK (or DEF) via remaining gems first.
- NEVER take a fight "because you have to pick something." If every offered fight is unnecessary, the least-bad choice is the one with the smallest HP loss, but only as a last resort — never when the boss is winnable or a gem is reachable.
- If offered a fight that blocks nothing and a door that leads nowhere, still avoid both; pick the option with the least HP cost only if forced.

PLANNING:
- Check what items remain on the floor (the system prompt lists their positions). Before fighting, verify the monster is on the only path to one of them; many monsters guard nothing.
- Track your ATK vs boss DEF: if your ATK ≤ boss DEF you deal 0 — you MUST find ATK gems before attempting the boss, even if it costs HP to reach them.
- After you have collected all gems/potions that are reachable without excessive HP loss, the boss becomes the only goal. Fight it as soon as you can survive with positive HP — every extra fight before the boss reduces your score.

OUTPUT:
- Give a short reasoning (2-4 sentences) then a single line: FINAL_CHOICE: <number>
```

## A.5 Compiled-Knowledge Prompts for the Complex Floor

These prompts contain floor-specific knowledge and are reported only as labelled conditions (Section 5.4).
Both were run without the mechanical overrides and the automatic 0-HP fights, so a lethal fight that the model chose was executed; the survival rule of the solver-route prompt addresses this.
The first, the solver-route prompt of Listing A.5, lists the route of the published solver with a survival rule (5,473 characters).
Its results form the "Complex, solver-route prompt" column of Table 6.2 and the complex-floor rows of Tables 6.9 and 6.10.
The prompt contains statements that the combat rules and the exact solver refute.
The yellow door (5,8) does not gate the boss; only the blue door (6,2) does (Appendix B.5.2).
The Bat (11,4) and the Big Bat (0,6) are not dead ends; the exact optimum fights both.
The prompt states that the cost of a Slime Lord never decreases; it falls as ATK and MDEF rise, and the exact optimum fights the Slime Lord (3,10).
The prompt is reproduced as it was used.
The second, the exact-route prompt of Listing A.6, lists the 21 decisions of the exact optimal route with the expected HP after each (2,101 characters).
Its results are reported under "Executing the exact optimum" in Section 6.6.

**Listing A.5:** The solver-route prompt (with the survival rule).

```text
You are playing Magic Tower (MOTA) on the COMPLEX floor. Goal: defeat Boss at (6,0) with maximum HP.

CRITICAL OVERRIDE: The action list will show [SAFE], lookahead values, and effCost for ALL enemies — IGNORE these labels for enemies NOT in the allowlist below. A fight can be [SAFE] with high lookahead and STILL be FORBIDDEN because it wastes HP needed for the boss. The ONLY metric that matters is: IS THE ENEMY IN THE ALLOWLIST? If NO → DO NOT FIGHT IT regardless of how cheap or safe it appears.

=== ABSOLUTE ALLOWLIST — ONLY THESE FIGHTS ARE PERMITTED ===

You may ONLY fight enemies at these EXACT positions (no others, ever):
  (8,12) Green Slime [3x-hit] — Phase 1
  (12,9) Black Slime [armor-break] — Phase 1
  (8,2) Bat [2x-hit] — Phase 2
  (4,2) Red Bat [first-strike] — Phase 2
  (2,4) Bat [2x-hit] — Phase 3
  (11,8) Red Slime — Phase 3
  (9,1) Big Bat — Phase 4
  (11,0) Red Slime — Phase 4
  (0,2) Big Bat — Phase 4
  (6,4) Green Slime — Phase 5 ONLY (costs 3 HP at ATK≥14)
  (6,6) Green Slime — Phase 5 ONLY (costs 3 HP at ATK≥14)
  (12,12) Big Bat — Phase 5 ONLY (for Blue Potion before boss)
  (3,8) Green Slime — Phase 6 (boss-gate path, costs 3 HP)
  (6,0) Boss — LAST fight only

ANY enemy not listed above = DO NOT FIGHT. Specifically FORBIDDEN:
- ALL Slime Lords at (10,10), (3,10), (4,7) — magic-atk, HP wasted permanently
- Red Bat at (4,11) — TRAP! There are TWO Red Bats. ONLY fight the one at (4,2). Position (4,11) is in the BOTTOM-LEFT, (4,2) is in the TOP-LEFT. Fight TOP-LEFT only.
- Red Bat at (0,9) — not required
- Black Slime at (2,9) — FORBIDDEN even though it has lookahead. You do NOT need it.
- Black Slime at (0,4) — not required
- Green Slime at (10,6) — not required (even if cheap/free)
- Red Slime at (9,3) — ABSOLUTELY FORBIDDEN. This wastes 25+ HP for nothing.
- Bat at (11,4) — FORBIDDEN (dead-end, wastes 116 HP)
- Big Bat at (0,6) — FORBIDDEN (dead-end, wastes 124 HP)
- ANY enemy not in the allowlist above — even if marked "SAFE" or costs 1 HP

=== DOOR SEQUENCE (open in this EXACT order) ===
1. Yellow Door at (8,7) — FIRST (use starting yellow key)
2. Yellow Door at (8,4) — SECOND (use key from (12,10))
3. Blue Door at (6,2) — THIRD (critical for ATK gems in top-left)
4. Blue Door at (12,2) — FOURTH (DEF+1 and HP potion)
5. Yellow Door at (5,8) — FIFTH and LAST (boss-gate! use key from (0,0))

CRITICAL: There are only 3 Yellow Keys on the map. Do NOT open Yellow Door at (10,5) — it is a TRAP that wastes your last key. Save it for (5,8) which gates the boss path.

=== PHASE TRANSITIONS ===
Phase 1: Fight Green Slime@(8,12) + Black Slime@(12,9)
Phase 2: Open Yellow Door(8,4), fight Bat@(8,2), open Blue Door(6,2), fight Red Bat@(4,2)
Phase 3: Fight Bat@(2,4) — then GO EAST (through 4,3→4,2→6,2→8,4→east side). DO NOT fight any Phase 5 enemies yet!
Phase 4 STRICT ORDER (do NOT skip ahead):
  4a. Red Slime@(11,8) — go east first, cheap at ATK=13 DEF=14
  4b. Big Bat@(9,1) — then go north
  4c. Red Slime@(11,0) — cheap, unlocks potions
  4d. Big Bat@(0,2) — LAST of Phase 4 (return west; cheapest at DEF=16)
  4e. Open Blue Door@(12,2) — unlocks final DEF gem
Phase 5 (ONLY after ATK≥14 AND DEF≥16! If you fight Green Slime@(6,4) at ATK=13 it costs 44 HP instead of 3 HP — DO NOT DO THIS):
  5a. Green Slime@(6,4) [costs 3 HP at ATK=14; costs 44 HP at ATK=13 — NEVER FIGHT BEFORE ATK=14!]
  5b. Green Slime@(6,6) [costs 3 HP at ATK=14]
  5c. Big Bat@(12,12) [costs 124 HP at ATK=14,DEF=17; costs 170 at lower stats — WAIT!]
Phase 6 (boss run):
  6a. Open Yellow Door@(5,8) — boss gate
  6b. Fight Green Slime@(3,8) [costs 3 HP, on boss path]
  6c. Fight Boss@(6,0) — FINAL

CRITICAL SEQUENCING: After Bat@(2,4), do NOT fight Big Bat@(0,2) immediately even though it's nearby. Go EAST first (4a-4c) to collect stat gems + potions between fights, THEN return for Big Bat@(0,2). This saves ~25 HP on the Big Bat fight and preserves HP budget for boss.

=== DECISION RULES (apply in order) ===
0. SURVIVAL GATE (overrides every other rule, including the allowlist): NEVER choose an action whose line shows [LETHAL] or hpAfter < 0. If the Boss is the only allowlisted enemy left and it is [LETHAL], you are NOT ready: first take fights that cost 0–5 HP and expose a Red/Blue Potion in their lookahead (e.g. Red Slime@(9,3) 1 HP → potion, Green Slime@(10,6) 0 HP), collect every potion still reachable, and only then re-check the Boss line. hpAfter must be > 0 before you ever pick the Boss. The allowlist tells you which fights are worth HP; it does not authorise dying.
1. Complete ALL fights in the current phase BEFORE moving to the next phase
2. Is there a door from the sequence that hasn't been opened? → OPEN IT
3. Is there an allowlist fight for the current phase? → FIGHT IT (check coordinates!)
4. If multiple allowlist enemies are available, fight the one from the EARLIEST incomplete phase
5. NEVER open Yellow Door at (10,5) — waste of your only boss-gate key
6. GATE CHECK: Before fighting Green Slime@(6,4), @(6,6), or Big Bat@(12,12) — verify your ATK≥14. If ATK<14, DO SOMETHING ELSE (go east for Phase 4 fights). This single rule saves 80+ HP.
7. When two enemies share the same name (e.g. two Red Bats), ALWAYS verify the (x,y) coordinates match the allowlist

=== WHY SLIME LORDS ARE FORBIDDEN ===
Slime Lord has magic-atk: DEF IGNORED. Cost 160-235 HP, NEVER decreases.
Blue Potion behind Slime Lord@(10,10) is reachable via Big Bat@(12,12) later.

RESPONSE FORMAT:
FINAL_CHOICE: <number>
```

**Listing A.6:** The exact-route prompt.

```text
You are playing Magic Tower (MOTA) on the COMPLEX floor. Goal: defeat the Boss at (6,0) with maximum HP.

This prompt was compiled from the EXACT solver route (final HP 68, ATK 16, DEF 20, MDEF 20). It is an experiment condition, not a general strategy: it lists the fight and door decisions of the optimal route in order. Items (gems, potions, keys) are not listed: whenever an item is available, collect it before taking the next route step.

=== THE ROUTE: 21 decisions, in this exact order ===
 1. Open yellow door (5,8)
 2. Fight Green Slime (8,12)
 3. Fight Black Slime (2,9)      [armour-break]
 4. Fight Red Bat (0,9)          [first strike]
 5. Open blue door (0,10)
 6. Fight Slime Lord (3,10)      [magic attack]
 7. Fight Black Slime (12,9)     [armour-break]
 8. Open yellow door (8,7)
 9. Fight Big Bat (0,6)
10. Fight Bat (2,4)
11. Fight Red Bat (4,2)          [first strike]
12. Fight Red Slime (11,8)
13. Fight Green Slime (6,4)
14. Fight Green Slime (6,6)
15. Fight Big Bat (0,2)
16. Open blue door (6,2)
17. Open yellow door (8,4)
18. Fight Big Bat (9,1)
19. Fight Bat (11,4)
20. Fight Big Bat (12,12)
21. Fight Boss (6,0)             — LAST

=== HOW TO USE IT ===
- Each turn, find the EARLIEST step of the route that is not done yet and whose action is in the list of available actions; take it. Check the (x,y) coordinates: several monsters share a name.
- Do not fight any monster and do not open any door that is not in the route. Every fight not listed wastes HP the boss fight needs; every door not listed wastes a key the route needs.
- The expected HP after the steps is approximately: 1000 → 880 → 795 → 485 → 685 → 510 → 471 → 546 → 361 → 206 → 86 → 150 → 223 → 221 → 101 → 101 → 176 → 221 → 196 → 312 → 68. HP rises where potions behind a step are collected automatically.

=== SURVIVAL GATE (overrides the route) ===
NEVER choose an action whose line shows [LETHAL] or hpAfter < 0. If the next route step is lethal, you have deviated: take the cheapest available fight or door that exposes a potion or a stat gem, then re-check.

RESPONSE FORMAT:
FINAL_CHOICE: <number>
```

## A.6 The Complete Observation of Listing 5.1

Listing 5.1 shortens the observation at the first decision on the simple floor.
Listing A.7 gives it in full: first the static floor map, which is appended once to the system prompt, then the user message of the first decision.
The header counts completed turns; the engine's key pickup is turn 1, so this decision is turn 2 (Section 5.5.1).

**Listing A.7:** The static floor map and the complete observation at the first decision on the simple floor (final configuration).

```text
=== Floor Layout: simple (static reference) ===
Enemies:
  Bat at (3,5) | ATK=17 DEF=2 HP=100 | fight_cost=182
  Bat at (5,9) | ATK=17 DEF=2 HP=100 | fight_cost=182
  Black Slime at (3,7) | ATK=5 DEF=5 HP=45 [magic-atk] | fight_cost=55
  Black Slime at (6,4) | ATK=5 DEF=5 HP=45 [magic-atk] | fight_cost=55
  Black Slime at (9,5) | ATK=5 DEF=5 HP=45 [magic-atk] | fight_cost=55
  Boss at (5,10) | ATK=20 DEF=12 HP=50 | fight_cost=999999999
  Green Slime at (5,6) | ATK=7 DEF=3 HP=50 | fight_cost=24
  Green Slime at (9,0) | ATK=7 DEF=3 HP=50 | fight_cost=24
  Red Slime at (10,7) | ATK=11 DEF=1 HP=70 | fight_cost=56
  Red Slime at (5,3) | ATK=11 DEF=1 HP=70 | fight_cost=56
  Slime Lord at (1,9) | ATK=10 DEF=5 HP=80 | fight_cost=114
  Slime Lord at (2,1) | ATK=10 DEF=5 HP=80 | fight_cost=114
  Slime Lord at (4,2) | ATK=10 DEF=5 HP=80 | fight_cost=114
  Slime Lord at (9,9) | ATK=10 DEF=5 HP=80 | fight_cost=114
Items:
  Blue Gem (+1 DEF) (def+1) at (0,7) [tier=core_stat]
  Blue Gem (+1 DEF) (def+1) at (10,4) [tier=core_stat]
  Blue Gem (+1 DEF) (def+1) at (2,10) [tier=core_stat]
  Blue Gem (+1 DEF) (def+1) at (8,10) [tier=core_stat]
  Blue Potion (+200 HP) (hp+200) at (0,9) [tier=hp]
  Blue Potion (+200 HP) (hp+200) at (10,2) [tier=hp]
  Red Gem (+1 ATK) (atk+1) at (1,0) [tier=core_stat]
  Red Gem (+1 ATK) (atk+1) at (1,3) [tier=core_stat]
  Red Gem (+1 ATK) (atk+1) at (7,10) [tier=core_stat]
  Red Gem (+1 ATK) (atk+1) at (9,1) [tier=core_stat]
  Red Potion (+75 HP) (hp+75) at (10,6) [tier=hp]
  Red Potion (+75 HP) (hp+75) at (2,4) [tier=hp]
  Red Potion (+75 HP) (hp+75) at (7,7) [tier=hp]
  Red Potion (+75 HP) (hp+75) at (9,2) [tier=hp]
  Yellow Key (yellow_key+1) at (0,1) [tier=key]
  Yellow Key (yellow_key+1) at (0,4) [tier=key]
  Yellow Key (yellow_key+1) at (1,10) [tier=key]
  Yellow Key (yellow_key+1) at (2,8) [tier=key]
  Yellow Key (yellow_key+1) at (5,1) [tier=key]
Doors:
  yellow door at (4,7)
  yellow door at (7,0)
  yellow door at (7,5)
  yellow door at (8,0)

=== Floor: simple | Turn 1/300 ===
Hero: HP=470 (100.0% [OK]) ATK=9 DEF=4 MDEF=0 Gold=0 EXP=0
Keys: Y=1 B=0 R=0
Key budget: yellow 1 in hand + 4 on this floor = 5 for 4 closed yellow door(s)
Position: (5,1)
Enemies remaining: 14/14
Uncollected items still on floor: ATK+1@(1,0), Yellow Key@(0,1), ATK+1@(9,1), Red Potion (+75 HP)@(9,2)(+75HP), Blue Potion (+200 HP)@(10,2)(+200HP), ATK+1@(1,3), Yellow Key@(0,4), Red Potion (+75 HP)@(2,4)(+75HP), DEF+1@(10,4), Red Potion (+75 HP)@(10,6)(+75HP), DEF+1@(0,7), Red Potion (+75 HP)@(7,7)(+75HP), Yellow Key@(2,8), Blue Potion (+200 HP)@(0,9)(+200HP), Yellow Key@(1,10), DEF+1@(2,10), ATK+1@(7,10), DEF+1@(8,10)
DEF threshold tip: Collect +3 more DEF gems → Green Slime ×2 become FREE (saves 48 HP; +4 DEF gems remain on map)
Goal: defeat Boss while keeping maximum HP. You do NOT need to kill all enemies — only fight enemies that grant stat gems, keys, or HP needed to reach and defeat the boss. There is NO shop on this floor. Boss at (5,10): ATK=20 DEF=12 HP=50 | if fought now: UNWINNABLE — need ATK≥13 to deal damage (you have ATK=9) Use LOOKAHEAD TREE to find the cheapest path to the boss.
HP budget at max stats (all 4 ATK / 4 DEF gems collected): 1170 HP available (HP + 700 potions) vs 669 HP for the 2 monsters that block the way to the boss + the boss → margin +501 HP. 11 other monsters (258 HP at max stats) block nothing on the way to the boss; they are not in this budget — fight one only if its tree shows a stat gem or potion you need, and its cost then comes off this margin.
Recent actions this floor:
  T1: Collect Yellow Key at (5,1) (HP +0→470)

Available actions:
  (Note: lookahead = total item/stat value unlocked by this action [HP-equivalent].
   effCost = raw damage cost minus lookahead. A 200-damage fight with lookahead=180 costs only 20
   effective HP. For via-chain enemies: fight cost shown with DEF threshold hint — consider
   scouting upstairs/getting more DEF before fighting if the cost is too high.
   min-cost@maxStats = fight cost AFTER collecting all remaining DEF/ATK gems — shows how much HP
   you save by collecting stat gems BEFORE this fight. Large savings = defer this fight.)
  1. [fight] Slime Lord at (4,2) — monATK=10 monDEF=5 [FREE if DEF≥10, need +6 more] — damage=114 (24.3%) hpAfter=356 [MODERATE] lookahead=0(raw=91-gw=114) effCost=None | min-cost=18@maxStats(ATK=13,DEF=8) save=96HP — collect stat gems first
 → next fight: ⚔ Slime Lord@(2,1) dmg=114(24.3%), FREE@DEF≥10(+6)
   → via [Slime Lord@(2,1) [dmg=114 (24%), FREE if DEF≥10 (+6 needed)]]: Red Gem (+1 ATK) [STAT], Yellow Key
 → stat gems behind it (+1 ATK): 228 HP of fighting to reach them, then they save 22 HP on the other fights listed now → net -206 HP
 → ORDER (this Slime Lord at (4,2)): take this fight BEFORE "Fight Red Slime at (5,3) dmg=56" — this fight then that route: 380 HP; that route then this fight: 392 HP (saves 12)
  2. [fight] Red Slime at (5,3) — monATK=11 monDEF=1 [FREE if DEF≥11, need +7 more] — damage=56 (11.9%) hpAfter=414 [SAFE] lookahead=0(raw=220-gw=261) effCost=None | +75 HP potions behind it (collect any time) | min-cost=15@maxStats(ATK=13,DEF=8) save=41HP — collect stat gems first  [ALTERNATIVE ROUTE — everything this opens is also opened by "Fight Black Slime at (6,4) dmg=55" (which opens more); taking both pays twice for the same access]
 → next fight: ⚔ Green Slime@(5,6) dmg=24(5.1%), FREE@DEF≥7(+3), ⚔ Black Slime@(3,7) dmg=55(11.7%), magic-atk, ⚔ Slime Lord@(1,9) dmg=114(24.3%), FREE@DEF≥10(+6), ⚔ Bat@(3,5) dmg=182(38.7%), FREE@DEF≥17(+13), ⚔ Bat@(5,9) dmg=182(38.7%), FREE@DEF≥17(+13)
   → via [Bat@(3,5) [dmg=182 (39%), FREE if DEF≥17 (+13 needed)]]: Red Potion (+75 HP), Red Gem (+1 ATK) [STAT], Yellow Key
   → via [Green Slime@(5,6) [dmg=24 (5%), FREE if DEF≥7 (+3 needed)]]: yellow door
       → via [Green Slime@(5,6) [dmg=24 (5%), FREE if DEF≥7 (+3 needed)] → yellowDoor@(4,7) → Black Slime@(3,7) [dmg=55 (12%), magic-atk (DEF irrelevant)]]: Blue Gem (+1 DEF) [STAT], Yellow Key ×2
 → stat gems behind it (+1 ATK +1 DEF): 317 HP of fighting to reach them, then they save 54 HP on the other fights listed now → net -263 HP
 → ORDER (this Red Slime at (5,3)): take this fight BEFORE "Fight Slime Lord at (4,2) dmg=114" — this fight then that route: 206 HP; that route then this fight: 277 HP (saves 71)
  3. [fight] Black Slime at (6,4) — monATK=5 monDEF=5 [magic-atk] [magic-atk: DEF useless — only ATK+MDEF reduce cost] — damage=55 (11.7%) hpAfter=415 [SAFE] lookahead=29(raw=345-gw=237) effCost=26 | +225 HP potions behind it (collect any time)
 → next fight: ⚔ Green Slime@(5,6) dmg=24(5.1%), FREE@DEF≥7(+3)
 → unlocks: yellow door
   → via [Bat@(3,5) [dmg=182 (39%), FREE if DEF≥17 (+13 needed)]]: Red Potion (+75 HP), Red Gem (+1 ATK) [STAT], Yellow Key
   → via [Green Slime@(5,6) [dmg=24 (5%), FREE if DEF≥7 (+3 needed)]]: yellow door
   → via [yellowDoor@(7,5)]: Red Potion (+75 HP)
     → via [yellowDoor@(7,5) → Black Slime@(9,5) [dmg=55 (12%), magic-atk (DEF irrelevant)]]: Blue Gem (+1 DEF) [STAT], Red Potion (+75 HP)
       → via [Green Slime@(5,6) [dmg=24 (5%), FREE if DEF≥7 (+3 needed)] → yellowDoor@(4,7) → Black Slime@(3,7) [dmg=55 (12%), magic-atk (DEF irrelevant)]]: Blue Gem (+1 DEF) [STAT], Yellow Key ×2
 → stat gems behind it (+1 ATK +2 DEF): 371 HP of fighting to reach them, then they save 75 HP on the other fights listed now → net -296 HP
 → ORDER (this Black Slime at (6,4)): take this fight BEFORE "Fight Slime Lord at (4,2) dmg=114" — this fight then that route: 175 HP; that route then this fight: 268 HP (saves 93)
 → keys: behind this fight none; it exposes yellow door (7,5) → none behind it
  4. [open_door] Yellow Door at (7,0) [DEAD END - DO NOT OPEN]

Choose the best action. After your analysis, end your response with:
FINAL_CHOICE: <number>
```

The fixed explanatory note at the top of the action list mentions scouting upstairs, which does not apply to single floors.
The note is identical in every observation.
It was left unchanged so that every reported episode received the same text; the regression test of Section 5.8 pins it.

## A.7 The Planning Instruction

In the committed planning modes (Section 5.5.2), the engine appends one paragraph to the user message.
For commit-$k$ with $k \le 10$, the scope reads "exactly the next $k-1$ fight / door / staircase action(s) you will take after it".
In the long-plan modes, the whole-floor wording reads "your plan for the rest of this floor: every fight, door and staircase you will take after it, in order, up to the goal (at most 59)".
The max-steps wording reads "as many of the fight / door / staircase actions you will take after it as you can, in order (at most 59)".
Listing A.8 shows the paragraph with the max-steps wording.

**Listing A.8:** The planning instruction appended to the user message (long plan, max-steps wording).

```text
Then, on the next line, commit to as many of the fight / door / staircase actions you will take after it as you can, in order (at most 59). Do not repeat the FINAL_CHOICE action itself; the first NEXT entry is the decision AFTER it:
NEXT: <type> (x,y); <type> (x,y); ...
(type = fight / open_door / use_stairs, with the target position; do not list items, they are collected automatically). They are executed without asking you again as long as each is still available; free items are picked up in between.
```

## A.8 The Reflection Template and the Validator

Listing A.9 shows the request that the teacher receives at each iteration of the prompt optimiser (Section 5.7), in the single-floor form used for the study of Section 6.5.
Two cases use a different request.
The merge step of the Pareto loop gives the teacher two prompts and their per-floor outcomes instead.
The validator-off run of Section 6.5.4 replaces the rules for the prompt by permission to use positions, orders and conditions.
The placeholders in angle brackets are filled with the current prompt, the episode traces and up to two earlier rewrites that scored worse.
Under the full observation, the second paragraph lists the annotations; under the bare observation, it states that the agent sees only the raw facts.
In the study, the teacher was given no example prompt rules, so the list of allowed content ends with "general strategy rules that you derive from the traces".

**Listing A.9:** The reflection template (single floor, full observation, no example rules).

````text
You are improving the SYSTEM PROMPT of an LLM agent that plays Magic Tower (MOTA), a deterministic
turn-based dungeon game. This is SINGLE-FLOOR mode: one floor, the goal is to kill the boss alive with as much HP as possible. There are NO shops, NO gold/EXP purchases and NO stairs on these floors.

Each turn the engine gives the agent the exact state and a numbered list of every legal action with
exact annotations (damage, hpAfter, [FREE if DEF>=X], min-cost@maxStats, an unlock tree, lookahead,
effCost, stat-gem net value, ORDER lines comparing fight orders, key budget / key lines, [DEAD END],
[OPTIONAL], [LETHAL]). The agent answers with one action number: FINAL_CHOICE: <number>.

RULES FOR THE PROMPT YOU WRITE (binding — a prompt that breaks them is rejected):
- It must work on ANY floor of this kind, not only the one in the trace. So it must NOT contain:
  coordinates, floor names/ids, monster or item names, positions, lists of fights/doors to take or
  avoid, step-by-step routes, allowlists/forbidden lists, or numbers taken from this floor
  (HP thresholds, costs, counts). Percentages of current HP and the combat formula are fine.
- Allowed content: the exact combat calculation and special abilities; how to read what the engine
  shows; general strategy rules that you derive from the traces.
- Do NOT mention shops, gold, EXP or stairs: single floors have none.
- Keep the output contract: short reasoning, then "FINAL_CHOICE: <number>".
- Keep what worked; change or add general rules only for failures you can see in the trace.
- Length: at most ~3000 characters.
<worse_attempts>
CURRENT PROMPT:
```
<curr_param>
```

EPISODE TRACES (per LLM decision: turn, chosen action, hero after, engine overrides, end of the
agent's reasoning; then the outcome):
```
<side_info>
```

First diagnose in 3-6 bullet points which decisions lost HP or the game and which general principle
the agent misapplied (name the annotation it misread, not the position). Then give the full improved
prompt inside ``` fences.
````

Each episode trace lists every decision of the model.
For each, it gives the turn, the chosen action, the hero's HP, ATK and DEF afterwards, any engine override with the model's original choice, and the last 350 characters of the reasoning.
The second configuration shows 700 characters and also lists the options offered at each decision.
Decisions taken by the engine are listed in one line each.
The trace ends with the outcome: whether the boss was killed, the final HP and its share of the exact optimum, the final attributes, the goal score, and whether the hero died.

The validator rejects a candidate if any of the following holds:

- it contains coordinates of the form (x, y);
- it names a tower floor (MT followed by a number);
- it contains the words "ALLOW", "FORBIDDEN", "STEP 1", "walkthrough" or "allowlist";
- it names any monster of the game;
- it contains a number of three or more digits;
- on a single floor, it mentions shops, gold, EXP or stairs;
- it lacks the output contract `FINAL_CHOICE`;
- it is longer than 4,500 characters.

A rejected candidate is returned to the teacher once, with the reasons appended to the same request.
If the second candidate is also rejected, no candidate is produced in that iteration, and the best prompt so far is evaluated again (Algorithm 5.2).
