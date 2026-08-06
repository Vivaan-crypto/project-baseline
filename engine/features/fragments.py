"""Fragments: how many separate focus blocks, and how long each lasted.
AGENTS.md §8: "The only paid feature with no free equivalent anywhere."
"""

from __future__ import annotations

import math

from engine.types import Block, FragmentsResult

# Half-open [lower, upper) in minutes. A block of exactly 5:00 lands in
# "5-15m", not "<5m" — bucket-edge inclusivity isn't specified anywhere in
# AGENTS.md, this is engine's own pinned-down choice, tested explicitly.
BUCKET_EDGES_MIN = [0.0, 5.0, 15.0, 30.0, 60.0, 120.0, math.inf]
BUCKET_LABELS = ["<5m", "5-15m", "15-30m", "30-60m", "1-2h", "2h+"]


def _bucket_label(duration_min: float) -> str:
    for i in range(len(BUCKET_EDGES_MIN) - 1):
        if BUCKET_EDGES_MIN[i] <= duration_min < BUCKET_EDGES_MIN[i + 1]:
            return BUCKET_LABELS[i]
    return BUCKET_LABELS[-1]


def fragments(focus_blocks: list[Block]) -> FragmentsResult:
    """Only closed (non open-ended) blocks count — a block still in progress
    doesn't have a final length yet, so it can't be histogrammed."""
    durations_min = [b.duration_secs / 60 for b in focus_blocks if not b.open_ended]
    histogram = {label: 0 for label in BUCKET_LABELS}
    for d in durations_min:
        histogram[_bucket_label(d)] += 1
    return FragmentsResult(
        count=len(durations_min),
        longest_min=max(durations_min, default=0.0),
        histogram=histogram,
    )
