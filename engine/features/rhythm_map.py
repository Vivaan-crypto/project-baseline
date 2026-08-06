"""Rhythm Map: weekday x hour intensity of sustained input, over whatever
history exists. AGENTS.md §8: single-hue ramp light to dark; ship it from
day one, ungated, labeled "fills in as you go".

This aggregates active seconds from blocks() — not raw event counts, which
is what the mock-data version (mock/rollup.py, pre-engine) did as a proxy.
The quantile-binning logic below is ported unchanged from that mock
version; it was already proven there. Only the input source changes: real
block-derived active seconds instead of raw keys+mouse event counts.
"""

from __future__ import annotations

import bisect
import statistics
from datetime import tzinfo

from engine.config import RHYTHM_MAP_LEVELS
from engine.timegrid import split_interval_into_calendar_buckets
from engine.types import Block, RhythmMapResult

DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _levels_from_seconds(
    grid: list[list[float]], levels: int
) -> tuple[list[list[int]], list[float]]:
    flat = [c for row in grid for c in row]
    try:
        cutpoints = statistics.quantiles(flat, n=levels)
    except statistics.StatisticsError:
        # Degenerate input (e.g. near-zero variance, or too little history
        # yet) — flat mid-level grid beats crashing the aggregation step.
        # This is exactly what "fills in as you go" needs: a thin dataset
        # must still render something, not error out.
        mid = levels // 2
        return [[mid] * 24 for _ in range(7)], []

    grid_levels = [
        [min(levels - 1, bisect.bisect_right(cutpoints, c)) for c in row] for row in grid
    ]
    return grid_levels, cutpoints


def rhythm_grid(
    all_blocks: list[Block],
    *,
    tz: tzinfo,
    category_filter: set[str] | None = None,
    levels: int = RHYTHM_MAP_LEVELS,
) -> RhythmMapResult:
    """`category_filter=None` (default) counts all-category active seconds,
    matching the pre-engine mock behavior — "sustained input" reads more
    like general activity than specifically focused work. Pass
    `{"focus"}` for a focus-only view if that turns out to be wrong;
    it's a one-line change here, not a rewrite.
    """
    seconds = [[0.0] * 24 for _ in range(7)]
    for b in all_blocks:
        if category_filter is not None and b.category not in category_filter:
            continue
        for weekday, hour, overlap in split_interval_into_calendar_buckets(b.start, b.end, tz):
            seconds[weekday][hour] += overlap

    grid, cutpoints = _levels_from_seconds(seconds, levels)
    return RhythmMapResult(
        days=DAY_LABELS,
        hours=list(range(24)),
        grid=grid,
        seconds=seconds,
        cutpoints=cutpoints,
    )
