import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { MissionControlStats } from "../components/MissionControlStatusBar";

type MissionControlStatsState = {
  stats: MissionControlStats;
  loading: boolean;
  error: string | null;
};

const EMPTY_STATS: MissionControlStats = {
  openTasks: 0,
  runningTasks: 0,
  blockedTasks: 0,
  waitingTasks: 0,
  doneToday: 0,
  activeAgents: 0,
};

export function useMissionControlStats() {
  const [state, setState] = useState<MissionControlStatsState>({
    stats: EMPTY_STATS,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const stats = await invoke<MissionControlStats>("get_mission_control_stats");
        if (!cancelled) {
          setState({ stats, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : String(error);
          setState({
            stats: EMPTY_STATS,
            loading: false,
            error: `Mission Control stats unavailable: ${message}`,
          });
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
