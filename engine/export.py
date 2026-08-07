"""Export a full dashboard snapshot as JSON, for the local dashboard app.

    python -m engine.export --db mock/mock_events.db

Computes every feature for every day in the database and writes
app/_data/dashboard.json, which app/dashboard/ renders.

Why the threshold SWEEPS exist
------------------------------
AGENTS.md §8 requires that every tunable threshold be visible and tunable
in the UI. The obvious way to do that in a web dashboard would be to
reimplement the feature maths in TypeScript so sliders recompute live —
which would immediately give us two implementations of Core and Fragments
that can silently disagree, in a product whose whole pitch is that its
numbers are trustworthy.

Instead the sweep is computed HERE, by the same engine functions the real
app uses, at every threshold value the UI exposes. The slider then just
indexes into precomputed results. Every number the dashboard can display
came out of engine/, so there is exactly one implementation of each
feature and the UI cannot drift from it.

Cost of that choice: the slider is limited to the discrete values swept
below. That's the right trade — a continuous slider whose numbers might
be subtly wrong is worse than a stepped one that's provably right.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, tzinfo
from pathlib import Path
from typing import Any

from engine.blocks import blocks as build_blocks
from engine.categorize import make_category_lookup
from engine.config import (
    CORE_MINUTES,
    IDLE_GAP,
    RESIDUE_CAP_MINUTES,
    SETTLE_MINUTES,
    SWITCH_TOLERANCE,
)
from engine.daily import group_blocks_by_day, trailing_days
from engine.db import read_events
from engine.features.activity import activity
from engine.features.bedrock import bedrock
from engine.features.core import core
from engine.features.fragments import fragments
from engine.features.residue import residue, residue_by_source, residue_median
from engine.features.rhythm_map import rhythm_grid
from engine.features.trace import trace
from engine.types import Block

REPO_ROOT = Path(__file__).parent.parent
DEFAULT_DB = REPO_ROOT / "mock" / "mock_events.db"
DEFAULT_OUT = REPO_ROOT / "app" / "_data" / "dashboard.json"

# Values the UI's threshold sliders expose. Each is swept through the real
# engine functions below — see the module docstring for why.
CORE_MINUTES_SWEEP = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60]
SWITCH_TOLERANCE_SWEEP = [5, 10, 15, 20, 30, 45, 60, 90]
IDLE_GAP_SWEEP = [60, 120, 180, 240, 300, 420, 600, 900]
# IDLE_GAP is the one threshold AGENTS.md never assigned a value to, and
# engine/config.py's 300s is explicitly flagged as an unvalidated guess. It
# is also the most consequential: it decides whether a short break splits a
# block or merges two sessions into one. At 300s the mock set yields a
# median Bedrock of 105 minutes and a maximum of 211 — implausibly long
# unbroken stretches, which is evidence the guess is too generous rather
# than evidence of superhuman focus. Sweeping it lets the value be chosen
# from the curve instead of argued about.


def _minutes_since_midnight(ts: float, tz: tzinfo) -> float:
    """Local time-of-day as float minutes. The dashboard positions timeline
    entries from this rather than from raw epoch seconds, so rendering never
    depends on the *viewer's* timezone matching the machine that captured
    the events — which for a local-first app it usually would, but for a
    snapshot file shared or viewed elsewhere it would not."""
    local = datetime.fromtimestamp(ts, tz)
    return local.hour * 60 + local.minute + local.second / 60


def _round(value: float | None, places: int = 1) -> float | None:
    return None if value is None else round(value, places)


def _day_payload(
    date: str,
    day_blocks: list[Block],
    grouped: dict[str, list[Block]],
    category_of: Any,
    tz: tzinfo,
) -> dict[str, Any]:
    day_focus = [b for b in day_blocks if b.category == "focus"]

    frag = fragments(day_focus)
    bed = bedrock(
        day_focus,
        history_by_day=[
            [b for b in day if b.category == "focus"]
            for day in trailing_days(grouped, date, 14)
        ],
    )
    cor = core(day_blocks)
    measurements = residue(day_blocks)
    act = activity(day_blocks, category_of)
    timeline = trace(day_blocks)

    return {
        "date": date,
        "weekday": datetime.strptime(date, "%Y-%m-%d").strftime("%a"),
        "activeSecs": _round(act.total_active_secs),
        "fragments": {
            "count": frag.count,
            "longestMin": _round(frag.longest_min),
            "histogram": frag.histogram,
        },
        "bedrock": (
            None
            if bed.block is None
            else {
                "durationSecs": _round(bed.block.duration_secs),
                "startMin": _round(_minutes_since_midnight(bed.block.start, tz), 2),
                "endMin": _round(_minutes_since_midnight(bed.block.end, tz), 2),
                "topProcess": bed.block.top_process,
            }
        ),
        "bedrockSparkline": [_round(v) for v in bed.sparkline_14d],
        "core": {
            "pct": _round(cor.pct, 4),
            "qualifyingSecs": _round(cor.qualifying_secs),
            "totalActiveSecs": _round(cor.total_active_secs),
        },
        "residue": {
            "medianSecs": _round(residue_median(measurements)),
            "settledCount": sum(1 for m in measurements if m.settled),
            "unsettledCount": sum(1 for m in measurements if not m.settled),
            "bouncedCount": sum(
                1 for m in measurements if m.settled and (m.churn_secs or 0) > 0
            ),
            "bySource": {
                k: _round(v) for k, v in residue_by_source(measurements).items()
            },
            "measurements": [
                {
                    "source": m.source,
                    "returnMin": _round(_minutes_since_midnight(m.return_ts, tz), 2),
                    "settled": m.settled,
                    "residueSecs": _round(m.residue_secs),
                    "churnSecs": _round(m.churn_secs),
                }
                for m in measurements
            ],
        },
        "activity": {
            "byProcess": [
                {"name": e.name, "secs": _round(e.secs), "share": _round(e.share, 4)}
                for e in act.by_process
            ],
            "byCategory": [
                {"name": e.name, "secs": _round(e.secs), "share": _round(e.share, 4)}
                for e in act.by_category
            ],
        },
        "trace": [
            {
                "kind": e.kind,
                "startMin": _round(_minutes_since_midnight(e.start, tz), 2),
                "endMin": _round(
                    _minutes_since_midnight(e.start, tz) + e.duration_secs / 60, 2
                ),
                "durationSecs": _round(e.duration_secs),
                "category": e.category,
                "topProcess": e.top_process,
                "openEnded": e.open_ended,
            }
            for e in timeline
        ],
    }


def _sweeps(
    keys_ts: list[float],
    mouse_ts: list[float],
    windows: Any,
    category_of: Any,
    tz: tzinfo,
    base_blocks_by_day: dict[str, list[Block]],
) -> dict[str, Any]:
    """Every threshold value the UI can select, computed by the real engine
    functions. See the module docstring."""
    core_sweep: dict[str, dict[str, float | None]] = {}
    for minutes in CORE_MINUTES_SWEEP:
        core_sweep[str(minutes)] = {
            date: _round(core(day, core_minutes=minutes).pct, 4)
            for date, day in base_blocks_by_day.items()
        }

    # switch_tolerance and idle_gap both change blocks() itself, so every
    # feature has to be recomputed from raw events per value — not just
    # re-reduced the way core_minutes can be.
    def rebuild_sweep(param: str, values: list[int]) -> dict[str, dict[str, Any]]:
        out: dict[str, dict[str, Any]] = {}
        for value in values:
            rebuilt = build_blocks(
                keys_ts, mouse_ts, windows, category_of, **{param: value}
            )
            per_day = group_blocks_by_day(rebuilt, tz)
            out[str(value)] = {}
            for date, day in per_day.items():
                day_focus = [b for b in day if b.category == "focus"]
                frag = fragments(day_focus)
                bed = bedrock(day_focus)
                out[str(value)][date] = {
                    "fragmentsCount": frag.count,
                    "longestMin": _round(frag.longest_min),
                    "bedrockMin": _round(
                        0.0 if bed.block is None else bed.block.duration_secs / 60
                    ),
                    "corePct": _round(core(day).pct, 4),
                    "residueMedianSecs": _round(residue_median(residue(day))),
                    "activeSecs": _round(sum(b.duration_secs for b in day)),
                    "blockCount": len(day),
                }
        return out

    return {
        "coreMinutes": core_sweep,
        "switchTolerance": rebuild_sweep("switch_tolerance", SWITCH_TOLERANCE_SWEEP),
        "idleGap": rebuild_sweep("idle_gap", IDLE_GAP_SWEEP),
    }


def build_snapshot(db_path: Path, source: str) -> dict[str, Any]:
    keys_ts, mouse_ts, windows = read_events(db_path)
    category_of = make_category_lookup()
    tz = datetime.now().astimezone().tzinfo
    assert tz is not None  # astimezone() always attaches one

    all_blocks = build_blocks(keys_ts, mouse_ts, windows, category_of)
    grouped = group_blocks_by_day(all_blocks, tz)
    rhythm = rhythm_grid(all_blocks, tz=tz)

    return {
        "generatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "source": source,
        "config": {
            "switchToleranceSecs": SWITCH_TOLERANCE,
            "settleMinutes": SETTLE_MINUTES,
            "residueCapMinutes": RESIDUE_CAP_MINUTES,
            "coreMinutes": CORE_MINUTES,
            "idleGapSecs": IDLE_GAP,
        },
        "sweepValues": {
            "coreMinutes": CORE_MINUTES_SWEEP,
            "switchTolerance": SWITCH_TOLERANCE_SWEEP,
            "idleGap": IDLE_GAP_SWEEP,
        },
        "days": [
            _day_payload(date, grouped[date], grouped, category_of, tz)
            for date in sorted(grouped)
        ],
        "rhythm": {
            "days": rhythm.days,
            "hours": rhythm.hours,
            "grid": rhythm.grid,
        },
        "sweeps": _sweeps(
            keys_ts, mouse_ts, windows, category_of, tz, grouped
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument(
        "--source",
        default="mock",
        help="Provenance label the UI displays. Anything other than 'real' "
        "makes the dashboard show its synthetic-data badge.",
    )
    args = parser.parse_args()

    if not args.db.exists():
        raise SystemExit(
            f"{args.db} not found — generate it first:\n"
            f"  python mock/mockgen.py --out {args.db}"
        )

    snapshot = build_snapshot(args.db, args.source)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    # Compact separators, not indent=2: this file is imported straight into
    # the dashboard bundle, and pretty-printing it costs ~40% more bytes for
    # whitespace no one reads. Pipe it through `python -m json.tool` when
    # debugging by hand.
    args.out.write_text(
        json.dumps(snapshot, separators=(",", ":")) + "\n", encoding="utf-8"
    )

    days = snapshot["days"]
    size_kb = args.out.stat().st_size / 1024
    print(f"{args.out}  ({size_kb:,.0f} KB)")
    print(f"  {len(days)} days, source={snapshot['source']}")
    if days:
        first, last = days[0]["date"], days[-1]["date"]
        total_frag = sum(d["fragments"]["count"] for d in days)
        print(f"  {first} .. {last}, {total_frag} focus blocks total")


if __name__ == "__main__":
    main()
