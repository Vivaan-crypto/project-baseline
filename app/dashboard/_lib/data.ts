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

/**
 * Every feature, with the plain question it answers.
 *
 * The brand names are invented words — Bedrock, Residue, Core mean nothing
 * until someone teaches you, and a screen full of them is a vocabulary test
 * standing between the reader and their own data. So the question leads and
 * the name follows as a label. Nobody has to learn the word to read the
 * number, and the word gets learned anyway by sitting next to its meaning.
 */
export const FEATURES = {
  fragments: {
    name: "Fragments",
    question: "Did focus arrive in one piece or ten?",
    plain: "How broken up the day was",
  },
  bedrock: {
    name: "Bedrock",
    question: "What was your best stretch?",
    plain: "Longest unbroken focus",
  },
  core: {
    name: "Core",
    question: "How much of the day held together?",
    plain: "Share of time in long blocks",
  },
  residue: {
    name: "Residue",
    question: "What did the interruptions cost?",
    plain: "Time to get going again",
  },
  trace: {
    name: "Trace",
    question: "What did the day actually look like?",
    plain: "The day on a clock",
  },
  activity: {
    name: "Activity",
    question: "Where did the time go?",
    plain: "Time by app",
  },
  rhythm: {
    name: "Rhythm map",
    question: "When are you usually at your best?",
    plain: "Your pattern over weeks",
  },
} as const;

/**
 * The day in one plain sentence, plus how it compares to the reader's own
 * median.
 *
 * Strictly descriptive. AGENTS.md hard rule 4 forbids clinical framing, and
 * §8 requires describing the measurement and never what it implies about the
 * person — so this says "more pieces than usual", never "a bad day". The
 * reader is allowed to decide whether a fragmented Tuesday was a problem;
 * plenty of them aren't.
 */
export function verdict(day: Day, all: Day[]): {
  shape: string;
  comparison: string;
} {
  const longest = day.fragments.longestMin;
  const count = day.fragments.count;

  if (count === 0) {
    return {
      shape: "No focus blocks recorded on this day.",
      comparison:
        day.activeSecs > 0
          ? "There was activity, but none of it held together long enough to count."
          : "Nothing was captured.",
    };
  }

  const shape =
    count === 1
      ? `Focus held in a single stretch of ${fmtDuration(longest * 60)}.`
      : `Focus came in ${count} pieces, the longest ${fmtDuration(longest * 60)}.`;

  const medCount = median(all.map((d) => d.fragments.count));
  if (medCount === null || all.length < 3) {
    // Fewer than three days is not a baseline. Saying "typical for you" off
    // two days would be inventing a norm that does not exist yet.
    return { shape, comparison: "Not enough history yet to say if that is usual." };
  }

  const diff = count - medCount;
  if (Math.abs(diff) <= 1) {
    return { shape, comparison: `About typical — you usually see around ${Math.round(medCount)}.` };
  }
  return {
    shape,
    comparison:
      diff > 0
        ? `More broken up than usual — you normally see around ${Math.round(medCount)}.`
        : `Less broken up than usual — you normally see around ${Math.round(medCount)}.`,
  };
}

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
