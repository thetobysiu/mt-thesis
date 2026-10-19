# Appendix G: Reasoning Excerpts

This appendix reproduces the models' reasoning at the decisions discussed in Chapter 6, verbatim from the run logs, together with the observation at the first decision on hand01.
Each reasoning listing names its run log, which the platform replays with the full observation (Appendix C); the run logs are archived as a release asset of the public repository (Appendix D).
Omissions are marked "[...]"; nothing else is changed.

## G.1 The Decisive Turn of the Simple Floor

Both episodes stand at turn 9 with 336 HP, ATK 9 and DEF 5 (Listing 6.1).
The first ran on the configuration of Table 6.5, row 2, and failed; the second on row 4, and won.

**Listing G.1:** Qwen3.5-397B at turn 9, row 2 (failure, 3,896 characters; run log `20260924_092937_769885_simple_llm.json`).

```text
The user wants me to choose the best action in this Magic Tower game.

**Current State:**
- HP: 336
- ATK: 9
- DEF: 5
- Keys: Y=2, B=0, R=0
- Position: (1,10)
- Goal: Defeat Boss at (5,10) with max HP.
- Boss Requirement: Need ATK ≥ 13 to deal damage (Boss DEF=12). Current ATK=9. Need +4 ATK.
- Current Gems collected: 1 DEF gem (from T7).
- Remaining Gems on floor: 4 ATK gems, 3 DEF gems.
- Total potential stats if all collected: ATK=13, DEF=8.

**Analysis of Options:**

1.  **Fight Slime Lord at (1,9)**
    - Cost: 95 HP (hpAfter=241).
    - Lookahead: 290 (Blue Potion +200 HP, Blue Gem +1 DEF).
    - EffCost: -195 (Huge gain).
    - Unlocks: +1 DEF, +200 HP.
    - This is right next to me at (1,10). Slime Lord is at (1,9).
    - Getting +1 DEF here brings me to DEF=6.
    - Getting +200 HP brings me to ~536 HP.
    - This seems very efficient.

2.  **Fight Bat at (3,5)**
    - Cost: 168 HP (hpAfter=168). Risky.
    - Lookahead: 205 (Red Potion +75, Red Gem +1 ATK, Yellow Key).
    - EffCost: -37.
    - Unlocks: +1 ATK.
    - This is far away. I am at (1,10). To get there I need to traverse.
    - High HP cost now.

3.  **Fight Slime Lord at (4,2)**
    - Cost: 95 HP.
    - Lookahead: 0.
    - Unlocks path to another Slime Lord -> Red Gem +1 ATK.
    - Far away.

4.  **Fight Red Slime at (5,3)**
    - Optional. Skip.

5.  **Fight Bat at (5,9)**
    - Cost: 168 HP.
    - Leads to Boss (cannot win yet).
    - High cost, no immediate stat gain listed in lookahead compared to option 1.

6.  **Open Yellow Door at (7,0)**
    - Dead end / far away. I am at (1,10).

7.  **Open Yellow Door at (7,5)**
    - Far away.

**Comparison:**
I am currently at (1,10).
Action 1 (Slime Lord at 1,9) is adjacent.
It costs 95 HP but gives 200 HP potion + 1 DEF gem.
Net HP change: -95 + 200 = +105 HP.
Stat gain: +1 DEF.
This is a massive positive value move (effCost = -195).
It also clears the path potentially towards other items.
I need +4 ATK to beat the boss. I need to collect ATK gems.
Option 1 gives DEF and HP.
Option 2 gives ATK but costs 168 HP net (after potion).
Option 1 is safer and builds HP buffer.
Also, I am standing right next to (1,9).
The Slime Lord at (1,9) unlocks Blue Potion (+200 HP) and Blue Gem (+1 DEF).
With 336 HP, spending 95 is safe (leaves 241), then gaining 200 puts me at 441.
This increases my HP budget significantly.
The DEF increase helps reduce future fight costs.
The ATK gems are crucial, but I should grab the "free" HP/DEF first if they are low cost/negative effCost.
Action 1 has effCost = -195. This is the best value on the board.
Action 2 has effCost = -37.
Action 7 has effCost = -36 (net_lookahead=237, cost=162+55+48+95? No, the text says net_lookahead=0 for door, but inside tree it shows gains. Wait, Action 7 says net_lookahead=0(raw=162-gw_cost=198). That implies positive cost.
Action 1 is clearly the winner. It is adjacent, negative effective cost (gain), and provides resources.

[...]

Final decision: Action 1.
```

**Listing G.2:** Qwen3.5-397B at turn 9, row 4 (win, 1,329 characters, complete; run log `20260924_170639_455104_simple_llm.json`).

```text
Looking at the current state:
- HP=336, ATK=9, DEF=5, Y=2 keys
- Need ATK≥13 to damage Boss (currently ATK=9, need +4)
- Several stat gems still available

Key observations from the action list:

1. Action 6 (Open Yellow Door at 7,0) has net_lookahead=237 with effCost showing it unlocks a path to +1 ATK gem with only 16 HP fighting cost. This gives +78 HP net benefit - this is excellent value!

2. Action 1 (Fight Slime Lord at 1,9) has lookahead=290 but costs 95 HP now. The note says it wastes 12 HP if done before getting the ATK from action 6.

3. Action 2 (Fight Bat at 3,5) costs 168 HP and unlocks +1 ATK, but the note says it wastes 22 HP if done before getting ATK from action 6.

4. Action 7 (Open Yellow Door at 7,5) has net_lookahead=0 and would cost 198 HP to get +1 ATK +1 DEF - not as efficient as action 6.

The clear winner is Action 6 - opening the yellow door at (7,0). It:
- Costs 0 HP to open (just uses a key)
- Unlocks a path with only 16 HP fighting cost
- Gets +1 ATK gem
- Saves 94 HP on future fights
- Net +78 HP benefit

This is the most efficient action - it gets us closer to the ATK=13 needed for the boss with minimal HP cost, and the lookahead shows it's highly valuable.

After this, we should collect the ATK gem, then reassess which fights to take with the improved stats.

FINAL_CHOICE: 6
```

## G.2 A Positive Order Line Read as an Instruction

Qwen3.6-35B at turn 4 of the simple floor with 391 HP, on the configuration of Table 6.5, row 8 (Listing 6.2).
The chosen Bat costs 182 HP, 46.5 % of the hero's HP.

**Listing G.3:** Qwen3.6-35B at turn 4, row 8 (failure, 6,459 characters, end of the reasoning; run log `20260927_023900_034601_simple_llm.json`).

```text
[...]
The explicit ordering advice in the action description is a huge hint: "take this fight BEFORE 'Open yellow door at (4,7)'".

What about Action 2? Slime Lord at (4,2). Damage 114. Unlocks another Slime Lord giving +1 ATK. But effCost is None, and it says "wastes 8 HP". So skip.

Action 4 is optional. Skip.
Action 5 leads to boss but can't win. Skip.
Action 6 dead end. Skip.
Action 7 uses last key, bad. Skip.

Therefore, Action 1 is clearly the intended move. It aligns with "Stat items first", gives necessary ATK, has positive effCost (52), and the description explicitly advises doing it before the door.
[...]
Wait, let's look at Action 3 again. "net_lookahead=23". Opening a door costs 0 HP. It just uses a key. But to get the items, you fight Black Slime (55 dmg). So effectively you spend 55 HP to get +2 DEF and +2 keys. That's very cheap! But does it help with ATK? No.
Action 1 gives +1 ATK for 182 dmg. But it also gives a key and potion.
The prompt says for Action 1: "ORDER ... take this fight BEFORE 'Open yellow door at (4,7)'". This is a direct instruction from the engine's lookahead analysis. I should follow it.
Also, priority 1: "Stat items first."
Action 1 is definitely correct.
[...]
```

## G.3 The First Decision on hand01

Listing G.4 shows the observation at this decision, with the explanatory note and repeated gateway annotations shortened; the map of hand01 is given in Appendix B.5.3.
The reasoning excerpts come from episodes of this configuration on an earlier version of the code.
In it, DeepSeek-V4-Flash opened the left door (4,8) in all five episodes and Qwen3.5-397B the right door (6,8) in all five; in the re-run of Table 6.2, 18 of 20 episodes opened the right door first (Section 6.7.1).

**Listing G.4:** The observation at the first decision on hand01 (final configuration). "[...]" marks repeated gateway annotations and the fixed explanatory note.

```text
=== Floor: hand01 | Turn 0/300 ===
Hero: HP=400 (100.0% [OK]) ATK=9 DEF=4 MDEF=0 Gold=0 EXP=0
Keys: Y=1 B=0 R=0
Key budget: yellow 1 in hand + 3 on this floor = 4 for 4 closed yellow door(s); blue 0 in hand + 1 on this floor = 1 for 1 closed blue door(s)
Position: (5,10)
Enemies remaining: 13/13
Uncollected items still on floor: ATK+1@(0,0), DEF+1@(10,0), ATK+1@(1,1), Red Potion (+75 HP)@(9,1)(+75HP), Yellow Key@(0,4), DEF+1@(2,4), ATK+1@(8,4), Yellow Key@(10,4), ATK+1@(0,6), ATK+1@(1,7), DEF+1@(9,7), Red Potion (+75 HP)@(0,10)(+75HP), Yellow Key@(2,10), Blue Key@(8,10), Red Potion (+75 HP)@(10,10)(+75HP)
DEF threshold tip: Collect +3 more DEF gems → Green Slime ×3 become FREE (saves 72 HP; +3 DEF gems remain on map)
Goal: defeat Boss while keeping maximum HP. You do NOT need to kill all enemies — only fight enemies that grant stat gems, keys, or HP needed to reach and defeat the boss. There is NO shop on this floor. Boss at (5,0): ATK=20 DEF=12 HP=50 | if fought now: UNWINNABLE — need ATK≥13 to deal damage (you have ATK=9) Use LOOKAHEAD TREE to find the cheapest path to the boss.
HP budget at max stats (all 5 ATK / 3 DEF gems collected): 625 HP available (HP + 225 potions) vs 468 HP for the 1 monsters that block the way to the boss + the boss → margin +157 HP. 11 other monsters (228 HP at max stats) block nothing on the way to the boss; they are not in this budget — fight one only if its tree shows a stat gem or potion you need, and its cost then comes off this margin.

Available actions:
  (Note: lookahead = total item/stat value unlocked by this action [HP-equivalent]. [...])
  1. [open_door] Yellow Door at (4,8) — net_lookahead=121(raw=233-gw_cost=112) | +75 HP potions behind it (collect any time)
 → next fight: ⚔ Green Slime@(1,3) dmg=24(6.0%), FREE@DEF≥7(+3), ⚔ Red Slime@(1,5) dmg=56(14.0%), FREE@DEF≥11(+7), ⚔ Red Slime@(1,6) dmg=56(14.0%), FREE@DEF≥11(+7), ⚔ Bat@(2,8) dmg=182(45.5%), FREE@DEF≥17(+13)
 → unlocks: Red Potion (+75 HP), Yellow Key
   → via [Red Slime@(1,6) [dmg=56 (14%), FREE if DEF≥11 (+7 needed)]]: Red Gem (+1 ATK) [STAT] ×2
     → via [Red Slime@(1,6) [...] → Red Slime@(1,5) [...]]: Blue Gem (+1 DEF) [STAT], Yellow Key
 → stat gems behind it (+2 ATK +1 DEF): 112 HP of fighting to reach them, then they save 20 HP on the other fights listed now → net -92 HP
 → keys: uses 1 yellow (yellow 1→2 after collecting what is behind it); behind it: +2 yellow; it exposes yellow door (1,2) → none
  2. [fight] Black Slime at (5,4) — monATK=5 monDEF=5 [magic-atk] [magic-atk: DEF useless — only ATK+MDEF reduce cost] — damage=55 (13.8%) hpAfter=345 [SAFE]  ⚡[OPTIONAL — NOT required for boss, skip to conserve HP]
 → ORDER (this Black Slime at (5,4)): taking this fight now wastes 15 HP — after "Open yellow door at (6,8)" (+1 ATK +1 DEF; 48 HP of fighting to reach them) it costs 40 instead of 55; fight + route together: 88 instead of 103
  3. [open_door] Yellow Door at (6,8) — net_lookahead=170(raw=218-gw_cost=48) | +75 HP potions behind it (collect any time)
 → next fight: ⚔ Green Slime@(9,5) dmg=24(6.0%), FREE@DEF≥7(+3), ⚔ Green Slime@(9,6) dmg=24(6.0%), FREE@DEF≥7(+3), ⚔ Black Slime@(8,8) dmg=55(13.8%), magic-atk, ⚔ Red Slime@(9,3) dmg=56(14.0%), FREE@DEF≥11(+7)
 → unlocks: Blue Key, Red Potion (+75 HP)
   → via [Green Slime@(9,6) [...]]: Blue Gem (+1 DEF) [STAT]
     → via [Green Slime@(9,6) [...] → Green Slime@(9,5) [...]]: Red Gem (+1 ATK) [STAT], Yellow Key
 → stat gems behind it (+1 ATK +1 DEF): 48 HP of fighting to reach them, then they save 15 HP on the other fights listed now → net -33 HP
 → keys: uses 1 yellow (yellow 1→1 after collecting what is behind it); behind it: +1 yellow, +1 blue; it exposes yellow door (9,2) → none

Choose the best action. After your analysis, end your response with:
FINAL_CHOICE: <number>
```

**Listing G.5:** DeepSeek-V4-Flash at the first decision on hand01 (1,368 characters, complete; run log `20260929_073109_306644_hand01.txt_llm.json`).

```text
Looking at the floor:

- We start with 400 HP, ATK=9, DEF=4, 1 yellow key.
- The boss needs ATK≥13 to even damage it. We currently have ATK=9, so we need at least +4 ATK from gems.
- Available ATK gems: (0,0), (1,1), (8,4), (0,6), (1,7) — five total.
- The two yellow doors both lead to stat gems and potions.

Action 1 (Yellow Door at (4,8)) leads to +2 ATK and +1 DEF, plus a potion and a yellow key. It costs some fights but those fights are cheap (Green Slimes 24, Red Slimes 56). This gets us closer to ATK≥13.

Action 3 (Yellow Door at (6,8)) leads to +1 ATK and +1 DEF, plus a blue key and a potion. Also cheap fights.

Both are good. Which should be taken first?

Action 1 gives more ATK (+2) and also a DEF gem. Action 3 gives +1 ATK and +1 DEF. Since we need ATK badly, Action 1 seems slightly better because it provides +2 ATK.

Also, Action 1 has a higher net lookahead (121 vs 170? Wait, actually Action 3 has net_lookahead=170, Action 1 has 121). But lookahead includes potions and keys. Both give a potion. Action 3 gives a blue key which might be needed later for the blue door near the boss area.

However, the priority is getting ATK to 13. Action 1 gives +2 ATK, Action 3 gives +1 ATK. So Action 1 gets us closer faster.

Also, the fights behind Action 1 are similar cost to Action 3. Both are safe.

I'll choose Action 1 first to boost ATK quickly.
```

**Listing G.6:** Qwen3.5-397B at the first decision on hand01 (12,168 characters, end of the reasoning; run log `20260929_185121_900081_hand01.txt_llm.json`).

```text
[...]
   - Check Action 1 again. "net_lookahead=121". Action 3 "net_lookahead=170".
   - Higher lookahead means more value. Action 3 has higher value (170 vs 121).
   - Action 3 effCost is lower (better).
   
   - Final check:
   - I need to open a door. I have 1 Yellow Key.
   - Action 3 opens (6,8).
   - Action 1 opens (4,8).
   - Action 3 is recommended by the hint in Action 2 description ("after Open yellow door at (6,8)...").
   - Action 3 provides the Blue Key needed for the Boss door (5,2).
   - Action 3 is cheaper to clear.
   
   - Therefore, choose Action 3.
[...]
   - Reasoning summary:
   - Goal: Beat Boss. Need Blue Key (for door 5,2) and ATK gems (need +4).
   - Action 3 provides Blue Key and +1 ATK/+1 DEF for 48 HP cost.
   - Action 1 provides +2 ATK/+1 DEF for 112 HP cost.
   - Doing Action 3 first reduces the cost of Action 1 (the larger cost) via stat gain.
   - Action 2 hint explicitly suggests opening (6,8) [Action 3] before fighting Black Slime.
   - Action 3 has higher net_lookahead (170 vs 121).
   - Thus, Action 3 is the best choice.
```

Both models read the same two measures.
DeepSeek-V4-Flash notes that the right door rates higher and overrides the measure with the count of ATK gems.
Qwen3.5-397B follows the measures and the fight-order line of the optional Black Slime.
