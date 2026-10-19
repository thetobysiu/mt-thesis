# Appendix D: Configuration and Result Files

This appendix lists what is needed to reproduce the results of Chapter 6: the environment, the settings behind each named configuration, the repair call, the names of files and settings, the result file behind every reported cell, the sources of computed facts in other chapters, and the runs excluded from Chapter 6.
The commands that run each configuration are documented in the framework's repository.

## D.1 Environment

The framework is available at https://github.com/thetobysiu/mt-ai-lab.
It requires Python 3.12; the web front end requires Node.js 20.9 or later, and the exact solver a Java development kit.
All commands run from the framework's root directory.
The models are accessed through an OpenAI-compatible endpoint, by default the GWDG SAIA service.
The API key is read from the environment variable `SAIA_API_KEY` (a template `.env.example` lists every variable), and `SAIA_BASE_URL` selects another endpoint.
Table D.1 maps the model names of this thesis to the framework's presets.

**Table D.1:** Model presets.

| Name in this thesis | Preset | Endpoint model | Mode |
|---|---|---|---|
| Qwen3.5-397B | `qwen3.5-397b` | qwen3.5-397b-a17b | thinking |
| Qwen3.6-35B | `qwen3.6-35b` | qwen3.6-35b-a3b | thinking |
| Qwen3.8-27B | `qwen3.8-27b` | qwen3.8-27b | thinking |
| DeepSeek-V4-Flash | `deepseek-v4-flash-think` | deepseek-v4-flash-0731 | thinking |
| DeepSeek-V4-Flash (no thinking) | `deepseek-v4-flash` | deepseek-v4-flash-0731 | instruct |
| Mistral Medium 3.5 | `mistral-medium-3.5` | mistral-medium-3.5-128b | instruct (no reasoning channel) |
| Llama-3.1-8B | `llama-3.1-8b` | meta-llama-3.1-8b-instruct | instruct |

## D.2 Settings

The engine is configured by environment variables.
Table D.2 lists those that distinguish the configurations of Chapter 6.

**Table D.2:** Settings. Final = value in the final configuration.

| Variable | Final | Meaning |
|---|---|---|
| `MOTA_EVAL_TEMPERATURE` | 0 | sampling temperature of the task model |
| `LOOKAHEAD_DEPTH` | 3 (tower 2) | gateways searched behind an action (Section 5.2.2) |
| `CONVERSATION_HISTORY_TURNS` | 0 | earlier observations and answers included in each call (default 6) |
| `MOTA_ORDER_TWO_SIDED` | 1 | print the fight-order line in both directions, with the guard at the rule-4 threshold (40 %; tower 60 %) |
| `MOTA_FIGHT_KEY_FLOOD` | 1 | key line on fights, computed over the whole reachable region |
| `THINKING_MAX_TOKENS` | 16,384 or 32,768 (tower 8,192) | reasoning cap per call (Table 6.1) |
| `LLM_TIMEOUT` | 600 (planning study 1,800) | seconds per call |
| `MOTA_PLAN_STEPS` | 1 | commitment $k$ (Section 5.5.2); 60 = long plan |
| `MOTA_PLAN_NO_REPLAN` | unset | with $k = 60$: single call |
| `MOTA_PLAN_WORDING` | unset | `floor` = whole-floor wording of the long plan; unset = max-steps wording |
| `MOTA_BARE_OBS` | unset | 1 = bare observation (Section 5.2.7) |
| `MOTA_DISABLE_OVERRIDES` | unset | 1 = mechanical overrides and automatic 0-HP fights off; on single floors, items and keys are still collected and only-lethal positions still end as stuck; on the tower, collection and the climb to unvisited floors are off as well; set for the solver-route and exact-route prompts (Section 5.4) |
| `MOTA_SUPPRESS_HINTS` | unset | 0 or 1 = show or hide the annotations independently of the previous variable; unset = follows `MOTA_DISABLE_OVERRIDES`, which then also hides the annotations of fight actions (Appendix E, incident 8) |
| `MOTA_STRATEGIC_OVERRIDES` | unset | 1 = strategic overrides of the rule-based heuristic (Table 6.5, row 1) |
| `MOTA_OFFER_LEVELUPS` | 1 (tower) | 1 = offer level-ups in the experience shops of the tower (the prompt still forbids them) |
| `MOTA_TOWER_HP_FLOOR` | unset (off) | 1 = enforce the prompt's 40 % rule on the tower (the first and second tower observations ran with it) |
| `MOTA_HP_RULE_PCT` | unset | pins the threshold quoted by the engine lines that refer to rule 4; unset = 40 on single floors, 60 on the tower (the first and second tower observations pin 40) |
| `MOTA_WAY_UP` | 1 (final tower observation) | way-up line, actions on the route tagged |
| `MOTA_TOWER_FIDELITY` | 1 (final tower observation) | item values and scripted events of the game data: MT4 thief event, the Cross at the MT0 fairy, hero level, Small Feather (MT6), wizard with the Big Feather (MT13), the MT7 seal that opens after all four White Warriors, ice gates opened by the engine (Section 4.5.2) |
| `MOTA_PLAN_MEMORY` | 1 (final tower observation) | the answer ends with a one-line plan that is shown at the next decision (Section 5.5.4) |
| `MOTA_NO_KEY_PURCHASE` | 1 (final tower observation) | yellow and blue keys are not offered for sale; red keys are |
| `MOTA_WAYUP_COMBINED` | 1 (final tower observation) | way-up line: purchases combined across shops, lethal fights named as such, route passable in order with the gold/EXP of each fight spent before the next |
| `MOTA_FREE_AFFORD` | 1 (final tower observation) | a fight that costs HP states what the DEF or ATK purchases affordable now do to it (free, or the cheapest cost); a purchase states its price per point and a better-priced open shop; doors and fights state the gold/EXP of the 0-HP fights behind them; red doors state the red-key price; the Cross states how its gain is computed; treasure state line |
| `MOTA_NPC_TRADES` | 1 (final tower observation) | the MT15 trades (Holy Sword for 500 EXP, Holy Shield for 500 gold) are actions once affordable, never taken by the engine (Section 4.5.3) |
| `MOTA_KEY_RESERVE` | 1 (final tower observation) | a door off the way up that leaves fewer keys of its colour than the way up still needs states so |
| `MOTA_AFTER_BATTLE` | 1 (final tower observation) | the `setEnemy` calls of a fight's afterBattle script change those monsters for the rest of the run (MT16, MT19; Table B.4) |
| `MOTA_BUY_QUANTITY` | 1 (final tower observation) | a shop purchase may carry `QUANTITY: n` (at most 10); the engine repeats it without a new call while it is affordable (`quantity` event, `repeat` flag on the repeated turns) |
| `MOTA_VAMPIRE_TAG` | 1 (final tower observation) | monsters that take a share of the current HP (special 11) carry the vampire tag instead of the DEF threshold |
| `MOTA_EVENT_WAY` | 1 (final tower observation) | event lines of item-gated characters and seal lines state the way to the item or guard with its doors and missing keys |
| `MOTA_BLUE_KEY_PURCHASE` | unset | 1 = blue keys are for sale although `MOTA_NO_KEY_PURCHASE` hides yellow keys (continuations from MT18, Section 6.7.3) |
| `MOTA_RESUME_LOG`, `MOTA_RESUME_BEFORE_TURN` | unset | continue a stored tower run: its turns before the given turn are replayed on the current engine (tagged "replayed"), then the model takes over |
| `MOTA_REMOTE_ACTIONS` | 1 (second and final tower observation) | action list = every reachable object on every visited floor, travel inside the action, stairs only to unvisited floors, tower key budget (Section 5.5.3); unset = first tower observation with return actions |
| `MOTA_SHOP_ROUTE` | 1 (second and final tower observation) | price the monsters on the way to a shop not yet reached, now and after 1–3 available ATK purchases |
| `MOTA_MULTI_FLOOR_MAX_TURNS` | per run | turn limit of a tower run |

## D.3 The Repair Call

When an answer contains no valid action number, or a tower answer is truncated (Section 5.3), the engine repeats the request once with reasoning disabled and a budget of 256 output tokens; a truncated single-floor answer is first sent again.
The answer must be a JSON object whose single integer field `action_id` is restricted to the listed action numbers, excluding those the mechanical overrides would replace.
The schema is enforced by the service's structured-output interface.
If the service rejects the schema, the engine falls back to a list of allowed answers and then to an unconstrained short prompt.
If all routes fail, the turn counts as a parse error.
If no valid action is obtained in three consecutive attempts, the engine takes the rule-based heuristic's action for that turn (Section 5.3).
The mechanism can therefore only reduce the number of failed turns; `MOTA_DISABLE_STRUCTURED_OUTPUT=1` switches it off.

## D.4 Names and Labels

**Table D.3:** Names used in this thesis and the corresponding internal labels.

| Name in this thesis | Internal label |
|---|---|
| effective cost | `effCost` |
| alternative-route tag | `[ALTERNATIVE ROUTE]`, file label `altroute` |
| net stat-route line | file label `order_aware` (with the fight-order line) |
| fight-order line | `ORDER` line |
| individual item counts, potion-free effective cost, affordability guard on the order line, required-monster budget (Table 6.5, row 5) | D1 to D4, file label `d1d4` |
| key budget, per-door key lines (Table 6.5, row 6) | K1, K2, file label `k1k2` |
| two-sided fight-order line | F-ORD2, `MOTA_ORDER_TWO_SIDED` |
| key line on fights | F-K3, `MOTA_FIGHT_KEY_FLOOD` |
| final configuration | final stack, file label `final2` |
| re-run of Table 6.2 | file label `canon` |
| single-floor prompt | `floor_basic.txt`, basic prompt |
| tower prompt | `tower_basic.txt` (final tower observation), `tower_basic_v1_stairs.txt` (first tower observation); the prompt of the second tower observation is stored in each run log |
| rules-only prompt | `core_rules.txt`, core prompt |
| solver-route prompt | `complex_bfs_strategy_survival.txt`, BFS prompt, survival prompt, route prompt |
| exact-route prompt | `complex_exact68_sequence.txt`, exact-68 prompt |
| (1+1) loop | constrained GEPA, cGEPA, `mota/optimizer/constrained_gepa.py` |
| Pareto loop | `constrained_gepa.run_pareto_loop`, labels `gs5_pareto_*` |
| teacher | reflection model, reflector |
| evolved-route prompt | `seed_prompts/gepa_study/evolved_route_deepseek.txt` |
| bare observation | `MOTA_BARE_OBS=1` |
| map-only condition | `--mode map-enum` |
| item values and scripted events of the game data | `MOTA_TOWER_FIDELITY=1`, fidelity mode |
| first, second and final tower observation | `final2`, `final3`, `final11` (Table D.5) |
| rule 4 threshold | `MOTA_HP_RULE_PCT` |
| 40 % override of the first and second tower observations | HP floor, `hp_floor_40`, `MOTA_TOWER_HP_FLOOR` |
| plan memory | `MOTA_PLAN_MEMORY`, plan note |
| way-up line | `MOTA_WAY_UP`, "Way up to MTn" |
| strategic override | strategic rules of `_safety_correct` |
| mechanical override | mechanical rules of `_safety_correct` |
| a configuration of Chapter 6 | registry code in `scripts/run_followups.py` (for example `VQS`, `T11QR`), used by `run_catalog.py --codes` |

## D.5 Result Files

Table D.4 gives the result file behind each reported table, figure and paragraph of Chapter 6.
Each file stores the configuration and, for every episode, its outcome and the name of its run log.
The run logs are archived as a release asset of the public repository (`run_logs.zip`).
`<m>` stands for the model's file tag: `qwen3.5-397b`, `qwen3.6-35b`, `qwen3.8-27b`, `deepseek-v4-flash` or `mistral-medium-3.5`.

**Table D.4:** Result files (in `results/reliability/` unless stated).

| Result | File |
|---|---|
| Table 6.2, single-floor columns (re-run of Table 6.2, $N = 5$) | `simple_<m>_canon`, `complex_<m>_canon` (single-floor prompt), `complex_route_<m>_canon` (solver-route prompt; Qwen3.6-35B $N = 10$), `hand0<i>_<m>_canon`; table compiled by `analysis/table62_canon.py` |
| Table 6.2, heuristic and random play | `simple_heuristic_reactive`, `complex_heuristic_reactive`; hand-designed floors: `scripts/floor_lab.py analyse <floor>` (heuristic and 500 random games) |
| Table 6.2, tower column | the final-observation rows of Table 6.13 |
| Temperatures 0.6 and 1.0 (Section 6.3, Table 6.3) | the file of the temperature-0 cell with the suffix `_t06` or `_t10`: `simple_<m>_canon_t06`, `complex_<m>_canon_t06`, `complex_route_<m>_canon_t06` and the same with `_t10` (Qwen3.5-397B, DeepSeek-V4-Flash) |
| Table 6.3, bare observation | `results/gepa_study/gs_397b_bare.json`, `gs_35b_bare.json` |
| Tables 6.3 and 6.4, map only | `simple_qwen3.5-397b_mapenum`, `simple_qwen3.6-35b_mapenum`; Table 6.4 counted from the visible answers by `analysis/mapenum_rescore.py` (the `map_enum` fields of the result files also count options named in the reasoning) |
| Section 6.2 and Table 6.3 (earlier episodes of the final configuration, depth 3), Table 6.5 (row 9) | `simple_<m>_final2_la3` (Qwen3.5-397B, Qwen3.6-35B) |
| Section 6.3, hand01 and hand02 at depth 3 | `hand0<i>_deepseek-v4-flash_final2` (32,768 tokens: `…_reactive_t32`) |
| Section 6.1.2, tower settings on single floors | `<floor>_<m>_canon_hp60` (prompt `floor_basic_hp60.txt`, `MOTA_HP_RULE_PCT=60`; the solver-route cells keep their prompt) and `…_canon_planmem` (`MOTA_PLAN_MEMORY=1`), Qwen3.5-397B and DeepSeek-V4-Flash |
| Section 6.3, hand01 and hand02 at depth 1 and with the bare observation | `hand0<i>_deepseek-v4-flash_final2_la1`, `…_bare` |
| Table 6.3, lookahead depth | `simple_<m>_final2_la<d>` |
| Table 6.3, conversation history | `simple_qwen3.5-397b_basic_k1k2`, `simple_qwen3.6-35b_basic_k1k2_16k`; without history `…_hist0` |
| Table 6.5 and Figure 6.1, rows 1 to 9 | `simple_<m>_` followed by `legacy_strategic_control`, `basic_mechanical_override`, `basic_mech_altroute`, `basic_order_aware`, `basic_d1d4`, `basic_k1k2` (Qwen3.6-35B: `basic_k1k2_16k`), `basic_k1k2_hist0` (Qwen3.6-35B: `basic_k1k2_16k_hist0`), `final_la3`, `final2_la3` |
| Section 6.4.1, override census | `analysis/override_census.py` over the stored run logs (94 replaced turns in 68 episodes) |
| Section 6.4.5, Table B.3 and Figure 6.2 | `complex_value_trace_[a-e].json`, written by `analysis/complex_value_trace.py` and summarised by `analysis/complex_value_summary.py` |
| Table 6.6 and Section 6.5.2 (second configuration, reference episodes on the simple floor) | `results/gepa_study/gs_*` (first configuration), `gs2_*` (second configuration); loops in `results/gepa/gepa_result_gs_*.json` and `…_gs2_*.json`; reference runs on the simple floor `gs_397b_*`, `gs_35b_*` |
| Table 6.7 | `analysis/gepa_rule_themes.py` over the candidates in `results/gepa/gepa_result_gs*_*.json` |
| Section 6.5.2 and Figure 6.3, paired confirmation | `results/gepa_study/gs3_dsbare_confirm.json` |
| Section 6.5.2, complex floor | `results/gepa_study/gs4_complex_35b.json` (loop: `results/gepa/gepa_result_gs4_complex_35b.json`) |
| Table 6.8, second study | `results/gepa_study/gs5_pareto_dsthink_bare.json`, `gs5_oneplusone_dsthink_bare.json` (loops: `results/gepa/gepa_result_gs5_*.json`) |
| Section 6.5.4, evolved-route prompt | loop `results/gepa/gepa_result_evolved_route_complex_deepseek.json`; evaluation `complex_evolved_route_deepseek-v4-flash` |
| Tables 6.9 and 6.10 and Figure 6.4, single floors | `simple_<m>_final2_plan<k>`, `…_planf` (long plan, whole-floor wording, re-planned), `…_oneshot_plan` (single call, whole-floor wording), `…_maxsteps`, `…_maxsteps_once`; reactive arms `simple_qwen3.5-397b_final2_la3`, `simple_deepseek-v4-flash_final2_reactive` and `…_reactive_t32`, `complex_deepseek-v4-flash_survival_final2_reactive` and `…_reactive_t32`, `hand0<i>_deepseek-v4-flash_final2` and `…_reactive_t32`, `simple_qwen3.8-27b_final2_reactive_t32_t06`, `complex_qwen3.8-27b_survival_final2_reactive_t32_t06`; committed modes `complex_deepseek-v4-flash_survival_final2_*`; `hand0<i>_deepseek-v4-flash_final2_plan<k>`, `…_maxsteps`; Qwen3.8-27B: `simple_qwen3.8-27b_final2_*_t06`, `complex_qwen3.8-27b_survival_final2_*_t06` |
| Table 6.9, tower row (second tower observation) | `tower_deepseek-v4-flash_final3_reactive`, `…_plan<k>`, `…_maxsteps`, `…_maxsteps_once` |
| Section 6.6, exact route | `complex_<m>_exact68_final2` |
| Table 6.11, hand-designed floors | `hand0<i>_<m>_canon` |
| Appendix G.3, earlier episodes on hand01 | `hand01_qwen3.5-397b_final2`, `hand01_deepseek-v4-flash_final2` |
| Table 6.12, generated floors | `gen0<i>_qwen3.5-397b_final2` (gen01 to gen03), `gen<i>_deepseek-v4-flash_final2` (gen03 to gen15); pooled counts from all files that name the floor, except `gs3_dsbare_confirm` |
| Table 6.13, tower | `tower_<m>_<label>_reactive` with the labels of Table D.5 (Qwen3.5-397B, first observation: `tower_qwen3.5-397b_final2`); continuations from MT18 `tower_<m>_final11_resume_blue`; heuristic `tower_MT0-MT23w_heuristic_final3`, with the game's item values `tower_MT0-MT23w_heuristic_final7` |
| Figures 6.1 to 6.4 | plotted by `scripts/thesis_figures.py` from the files of Table 6.5 (Figure 6.1), the value traces (6.2), `gs3_dsbare_confirm.json` (6.3) and the planning files (6.4) |

**Table D.5:** Tower observations (Section 5.5.3, Table 6.13) and their result-file labels. Flags = settings added to the row above, relative to the defaults of the code at the time of the runs (the defaults have since changed, so that Table D.2 lists some of these settings as unset). Every tower run also uses the settings of the final configuration and lookahead depth 2; reactive runs use a reasoning cap of 8,192 tokens. The first tower observation ran under the single-floor final configuration of its time, whose result files share the label `final2`.

| Observation | Label | Flags added | Tower prompt (characters) |
|---|---|---|---|
| first | `final2` | none; the 40 % override was on by default | `tower_basic_v1_stairs.txt` (3,629) |
| second | `final3` | `MOTA_REMOTE_ACTIONS=1`, `MOTA_SHOP_ROUTE=1` | stored in each run log (3,725) |
| final | `final11` | `MOTA_WAY_UP=1`, `MOTA_TOWER_FIDELITY=1`, `MOTA_TOWER_HP_FLOOR=0`, `MOTA_OFFER_LEVELUPS=1`, `MOTA_PLAN_MEMORY=1`, `MOTA_NO_KEY_PURCHASE=1`, `MOTA_WAYUP_COMBINED=1`, `MOTA_FREE_AFFORD=1`, `MOTA_NPC_TRADES=1`, `MOTA_KEY_RESERVE=1`, `MOTA_AFTER_BATTLE=1`, `MOTA_BUY_QUANTITY=1`, `MOTA_VAMPIRE_TAG=1`, `MOTA_EVENT_WAY=1`; rule 4 at 60 % | `tower_basic.txt` (6,035) |
| final, resumed on MT18, blue keys for sale | `final11_resume_blue` | `MOTA_RESUME_LOG=20261004_052939_498308_MT0-MT23w_llm.json`, `MOTA_RESUME_BEFORE_TURN=708`, `MOTA_BLUE_KEY_PURCHASE=1`, `MOTA_MULTI_FLOOR_MAX_TURNS=860` | `tower_basic.txt` (6,035) |

The continuations from MT18 resume the run log `20261004_052939_498308_MT0-MT23w_llm.json`, a run of Qwen3.5-397B with a predecessor of the final observation (label `final10`).
That run was played before the hidden staircases of MT18 and MT20 were modelled; its result file records MT21, and MT18 is its highest floor on the current engine (Appendix E, incident 17).

For tower runs, the field `llm_calls` of a result file counts every turn not taken by the engine, including executed plan steps (Appendix E, incident 15).
The number of model calls reported in Table 6.9 is the number of `thinking` events in the run log (`analysis/tower_calls.py`).
Later result files also store it as `model_calls`.

Table D.6 gives the sources of facts that were computed or checked rather than read from a result file.

**Table D.6:** Sources of computed facts.

| Fact | Source |
|---|---|
| Table 4.1, special abilities per floor | `analysis/special_abilities_census.py` over the floor files and `data/games/24/project/enemys.js` |
| Table B.4, scripted events | `scripts/inventory_floor_events.py` over `data/games/24/project/floors/*.js` |
| Sections 4.5.1 and 4.6.3, Tables 4.3 to 4.5, Figure 4.3, floor facts | `scripts/floor_lab.py analyse <floor> --decisions`; generated floors: `data/floors/gen/manifest.json` |
| Figures 2.4, 4.1, 4.2, B.1 and B.2 | `scripts/thesis_floor_figure.py` (game sprites), `scripts/solver_graph_figure.py` (node graph before merging) |
| Table B.1, solver timings | published solver `magic-tower-AI/AI/src`; exact solver `tools/java_bfs` (`--summary`) |
| Listing 5.1, Listing A.7 and Listing G.4 | `analysis/render_first_prompt.py` (final configuration, first decision; simple floor by default, after the engine has collected the key at (5,1); hand01 for Listing G.4) |
| Character counts of Appendices A and F | length of the prompt file without leading and trailing white space (`analysis/appI_prompt_chars.py`); prompts not stored as files: the `prompt` field of the run log (`analysis/appI_runlog_prompt.py`) |
| Appendix G, reasoning excerpts | `analysis/extract_cot.py <label> <run> <turn>` |
| Verification of the references (Chapter 3) | `thesis/reference/gemini_review_verification_2026-09-21.md`, `perplexity_review_verification_2026-09-21.md` |
| Section 6.5, noise floor, G4, trial floors and paired counts | `analysis/ch6b1_gs.py`, `analysis/ch6b1_pairs.py` over `results/gepa_study/gs*_*.json` |
| Section 6.6 and Table 6.9, tower planning runs | `analysis/ch6b1_plan.py`, `analysis/ch6b1_tower.py`; tower calls = `thinking` events in the run log (`analysis/tower_calls.py`) |
| Section 6.7.1, first door on hand01 and mechanical overrides | `analysis/ch6b_hand_canon.py`, `analysis/ch6b2_hand_ov.py`, `analysis/ch6b2_hand01_cot.py` over the `hand0<i>_<m>_canon` run logs |
| Sections 6.2 to 6.4, simple floor: first decision, winning trajectory and departures | `analysis/simple_turns.py <result files>` (the model's turns per episode); state values from `scripts/floor_lab.py analyse data/floors/simple.txt --decisions` |
| Table 4.4 and Section 6.4, costs along the optimal route and the winning trajectory, state values at turns 18 and 22 | `analysis/simple_route_costs.py`; `analysis/simple_turn_values.py <result file> <run>` (state value after every legal action at each decision of an episode) |
| Section 6.7.3, the stored position on MT18 | `analysis/ch6b2_tower_more.py`, `analysis/ch6b2_blue.py`; run log `20261004_052939_498308` |

## D.6 Results Excluded from Chapter 6

Results whose harness or setup was defective are kept under a file-name prefix that names the defect and are not pooled with valid results (Table D.7).
Most of them come from the planning study (Section 6.6).
After a first trial in which the plan line was not yet parsed, the plan harness was corrected four times before valid data were obtained: a plan line was discarded when reasoning preceded it, the parser of an earlier single-plan mode matched almost no plan, models repeated the chosen action as the first planned step, and a planned step that had become unwinnable was handed to the heuristic instead of ending the plan.
In addition, the reasoning cap was raised, because short caps truncated plan answers.
The earlier episodes of Qwen3.8-27B at temperature 0 are not reported, because their committed plans exist only in the defective `_v1next_` version; Table 6.9 reports this model from later episodes at temperature 0.6.

**Table D.7:** Excluded results (prefixes in `results/reliability/`).

| Prefix | Defect | Effect | Episodes |
|---|---|---|---|
| `_void_nexttrunc_` | The answer extractor kept only the `FINAL_CHOICE` line when reasoning preceded it, so the `NEXT:` plan line was lost. | DeepSeek-V4-Flash executed no commitments (its planning cells were reactive in effect); Qwen3.5-397B about half. | 32 (simple, tower) |
| `_void_oneshotparser_` | An earlier single-plan mode expected coordinates in a `PLAN:` line; Qwen3.5-397B wrote none, and the other plans listed items and unreachable tiles. | In 9 of 10 episodes, the heuristic chose every decision. | 10 (simple) |
| `_v1next_` | The instruction "the next $k-1$ actions after it" was read as including the chosen action; a committed step that had become unwinnable was handed to the heuristic instead of ending the plan. In two cells, the daily request limit of the API key was also exhausted (Appendix E, incident 14). | DeepSeek-V4-Flash repeated the chosen action as the first planned step in every plan; three to eight heuristic turns per cell. | 44 (simple, complex, tower) |
| `_void_preoverridefix_` | Same defect as `_v1next_`; one episode started before the fix. | — | 1 (simple) |
| `_void_…_noparse` | First planning trial, before the plan line was parsed. | — | 2 (simple) |
| `_ablation_effcost_numeric` | A placeholder in the effective-cost annotation was replaced by a number (Appendix E, incident 1). | Kept as an unintended ablation: 0 of 20. | 20 (simple) |
| `_stale_shop_prompt` | A surviving process ran an obsolete configuration alongside the corrected one (Appendix E, incident 4). | — | 3 (simple) |
| `_partial_` | Cell stopped at the user's request after one episode. | — | 1 (complex) |
