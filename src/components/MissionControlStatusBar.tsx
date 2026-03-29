type MissionControlStats = {
  openTasks: number;
  runningTasks: number;
  blockedTasks: number;
  waitingTasks: number;
  doneToday: number;
  activeAgents: number;
};

type MissionControlStatusBarProps = {
  stats: MissionControlStats;
  loading?: boolean;
  error?: string | null;
};

type StatTone = "peach" | "blue" | "yellow" | "red" | "green" | "mauve";

type StatCardProps = {
  label: string;
  value: number;
  tone: StatTone;
};

const toneClasses: Record<StatTone, string> = {
  peach: "border-ctp-peach/40 bg-ctp-peach/10 text-ctp-peach",
  blue: "border-ctp-blue/40 bg-ctp-blue/10 text-ctp-blue",
  yellow: "border-ctp-yellow/40 bg-ctp-yellow/10 text-ctp-yellow",
  red: "border-ctp-red/40 bg-ctp-red/10 text-ctp-red",
  green: "border-ctp-green/40 bg-ctp-green/10 text-ctp-green",
  mauve: "border-ctp-mauve/40 bg-ctp-mauve/10 text-ctp-mauve",
};

function StatCard({ label, value, tone }: StatCardProps) {
  return (
    <div className={`min-w-[96px] rounded-md border px-3 py-2 ${toneClasses[tone]}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] opacity-80">{label}</div>
      <div className="mt-1 text-lg font-semibold leading-none">{value}</div>
    </div>
  );
}

export function MissionControlStatusBar({
  stats,
  loading = false,
  error = null,
}: MissionControlStatusBarProps) {
  if (loading) {
    return (
      <div className="border-b border-ctp-surface1 bg-ctp-mantle/70 px-4 py-3">
        <div className="text-xs uppercase tracking-[0.18em] text-ctp-overlay0">Mission Control</div>
        <div className="mt-2 text-sm text-ctp-subtext">Loading operational stats…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-b border-ctp-surface1 bg-ctp-mantle/70 px-4 py-3">
        <div className="text-xs uppercase tracking-[0.18em] text-ctp-overlay0">Mission Control</div>
        <div className="mt-2 text-sm text-ctp-red">{error}</div>
      </div>
    );
  }

  return (
    <div className="border-b border-ctp-surface1 bg-ctp-mantle/70 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-ctp-overlay0">Mission Control</div>
          <div className="mt-1 text-sm text-ctp-subtext">
            Quick operational snapshot for the Ambrosio task loop.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Open" value={stats.openTasks} tone="peach" />
          <StatCard label="Running" value={stats.runningTasks} tone="blue" />
          <StatCard label="Blocked" value={stats.blockedTasks} tone="red" />
          <StatCard label="Waiting" value={stats.waitingTasks} tone="yellow" />
          <StatCard label="Done today" value={stats.doneToday} tone="green" />
          <StatCard label="Active agents" value={stats.activeAgents} tone="mauve" />
        </div>
      </div>
    </div>
  );
}

export type { MissionControlStats };
