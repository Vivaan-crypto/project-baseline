import snapshot from "@/app/_data/dashboard.json";

/**
 * Shapes of the snapshot written by `python -m engine.export`. These mirror
 * engine/export.py's payload — if you change one, change the other.
 *
 * The import is cast through `unknown` deliberately. TypeScript would
 * otherwise infer a literal type for a 200KB JSON file, which is both
 * enormously slow to check and useless (it would type `count` as the
 * specific numbers present rather than `number`).
 */

export type Category = "focus" | "mixed" | "comms" | "background";

export interface TraceEntry {
  kind: "block" | "away";
  startMin: number;
  endMin: number;
  durationSecs: number;
  category: Category | null;
  topProcess: string | null;
  openEnded: boolean;
}

export interface ActivityEntry {
  name: string;
  secs: number;
  share: number;
}

export interface ResidueMeasurement {
  source: string | null;
  returnMin: number;
  settled: boolean;
  residueSecs: number | null;
  churnSecs: number | null;
}

export interface Day {
  date: string;
  weekday: string;
  activeSecs: number;
  fragments: {
    count: number;
    longestMin: number;
    histogram: Record<string, number>;
  };
  bedrock: {
    durationSecs: number;
    startMin: number;
    endMin: number;
    topProcess: string | null;
  } | null;
  bedrockSparkline: number[];
  core: {
    pct: number | null;
    qualifyingSecs: number;
    totalActiveSecs: number;
  };
  residue: {
    medianSecs: number | null;
    settledCount: number;
    unsettledCount: number;
    bouncedCount: number;
    bySource: Record<string, number>;
    measurements: ResidueMeasurement[];
  };
  activity: { byProcess: ActivityEntry[]; byCategory: ActivityEntry[] };
  trace: TraceEntry[];
}

export interface SweepRow {
  fragmentsCount: number;
  longestMin: number;
  bedrockMin: number;
  corePct: number | null;
  residueMedianSecs: number | null;
  activeSecs: number;
  blockCount: number;
}

export interface Snapshot {
  generatedAt: string;
  source: string;
  config: {
    switchToleranceSecs: number;
    settleMinutes: number;
    residueCapMinutes: number;
    coreMinutes: number;
    idleGapSecs: number;
  };
  sweepValues: {
    coreMinutes: number[];
    switchTolerance: number[];
    idleGap: number[];
  };
  days: Day[];
  rhythm: { days: string[]; hours: number[]; grid: number[][] };
  sweeps: {
    coreMinutes: Record<string, Record<string, number | null>>;
    switchTolerance: Record<string, Record<string, SweepRow>>;
    idleGap: Record<string, Record<string, SweepRow>>;
  };
}

export const DATA = snapshot as unknown as Snapshot;

export const FRAGMENT_BUCKETS = [
  "<5m",
  "5-15m",
  "15-30m",
  "30-60m",
  "1-2h",
  "2h+",
] as const;

export const CATEGORY_COLOR: Record<Category, string> = {
  focus: "var(--cat-focus)",
  mixed: "var(--cat-mixed)",
  comms: "var(--cat-comms)",
  background: "var(--cat-background)",
};

/** "1h 24m" / "9m" / "45s". Never "0m" for a non-zero duration — a short
 *  block rounding away to nothing is exactly the thing Fragments exists to
 *  make visible, so sub-minute values keep their seconds. */
export function fmtDuration(secs: number | null | undefined): string {
  if (secs === null || secs === undefined) return "—";
  if (secs < 60) return `${Math.round(secs)}s`;
  const total = Math.round(secs / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Minutes-since-local-midnight to "09:15". Values past 1440 (a block that
 *  ran over midnight, attributed to the day it started) wrap rather than
 *  rendering as "25:30". */
export function fmtClock(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = Math.floor(wrapped % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function fmtPct(value: number | null | undefined): string {
  return value === null || value === undefined
    ? "—"
    : `${Math.round(value * 100)}%`;
}

export function fmtDate(iso: string): string {
  // Parsed as explicit parts, not `new Date(iso)` — that would treat the
  // date as UTC midnight and shift it a day back for anyone west of GMT.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function median(values: number[]): number | null {
  const clean = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 === 0
    ? (clean[mid - 1] + clean[mid]) / 2
    : clean[mid];
}
