// Run-log event types; mirror of the evaluator's log contract (adapted from mt-ai-lab's dashboard).

export type Hero = {
  hp: number; atk: number; def: number; mdef?: number; money?: number; exp?: number;
  keys?: { yellow: number; blue: number; red: number }; x: number; y: number; lv?: number;
};

export type MapCell = (
  | { t: "." }
  | { t: "#" } | { t: "?" } | { t: "T" }
  | { t: "E"; name: string; hp: number; atk: number; def: number; money?: number; specials?: number[]; dmg?: number; canWin?: boolean;
      fixed?: number; vampire?: number; n?: number }
  | { t: "I"; name: string }
  | { t: "Y" } | { t: "B" } | { t: "R" }
  | { t: "S"; dir?: string }
  | { t: "N"; name?: string }
) & { id?: number };  // id = the game's tile number (absent in logs recorded before 2026-09-29)

export type MapData = { floor_id?: string; width: number; height: number; grid: (MapCell | string)[][]; hero?: Hero };

export type ActionDetail = {
  type: string; x: number; y: number; name: string; is_dead_end?: boolean;
  damage?: number; damage_pct?: number; hp_after?: number; lookahead_value?: number; effective_cost?: number | null; unlocks?: string[];
};

export type RunEvent = {
  type: string; turn?: number; floor_id?: string; floor_idx?: number; hero?: Hero; map?: MapData;
  action?: string; action_id?: number; forced?: boolean; fallback?: boolean; elapsed_ms?: number | null;
  forced_reason?: string; repeat?: boolean; corrected_from?: number | null; corrected_from_label?: string; corrected_reason?: string;
  state_text?: string; enemies_remaining?: number; removed?: number[][];
  action_detail?: ActionDetail; action_path?: number[][]; llm_response?: string;
  thinking?: string; response_preview?: string; user_message?: string;
  reason?: string; message?: string; response?: string; parsed_id?: number | null; repaired_id?: number | null;
  total?: number; success?: boolean | null; alive?: boolean; hp_ratio?: number | null; goal_score?: number | null; goal_reached?: boolean | null;
  details?: Record<string, unknown>; max_floor_id?: string; floors_reached?: number; total_floors?: number; failure_reason?: string | null;
  initial_enemies?: number; mode?: string; task_model?: string; task_mode?: string; runtime_system_prompt?: string | null;
  multi_floor?: boolean; floor_range?: string[]; coords?: number[][]; note?: string;
  [k: string]: unknown;
};

export type RunLog = {
  floor_id: string; mode: string; prompt?: string; runtime_prompt?: string; task_model?: string; task_mode?: string;
  started_at?: string; finished_at?: string; turns: RunEvent[]; result?: RunEvent | null;
};
