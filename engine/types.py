"""Shared data types for engine/. See AGENTS.md §8 for what each feature
means; this module only defines the shapes, not the logic."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

Category = Literal["focus", "mixed", "comms", "background"]


@dataclass(frozen=True)
class Segment:
    """One (category, process) run, already clipped to a single active run
    (no idle time inside it). The raw material blocks() merges."""

    t0: float
    t1: float
    category: Category
    process: str | None

    @property
    def duration_secs(self) -> float:
        return self.t1 - self.t0


@dataclass
class Block:
    """A maximal span of one category, per the tolerance-merge rule in
    blocks.py. Every second of active time belongs to exactly one Block —
    blocks() returns a strict, non-overlapping partition, never overlapping
    spans of different categories."""

    start: float
    end: float
    category: Category
    process_secs: dict[str, float] = field(default_factory=dict)
    open_ended: bool = False
    # True only for a block truncated by the end of the queried range, not a
    # real boundary — the caller decides whether to include it in aggregates.

    @property
    def duration_secs(self) -> float:
        return self.end - self.start

    @property
    def top_process(self) -> str | None:
        if not self.process_secs:
            return None
        return max(self.process_secs, key=lambda p: self.process_secs[p])


@dataclass
class ResidueMeasurement:
    """One interruption's outcome. `settled=False` means it must be excluded
    from any median — never treated as a zero. See AGENTS.md §8: 'If they
    never settle before the next interruption, mark it unsettled and exclude
    from the median — do not treat it as zero.'"""

    source: str | None
    interruption_start: float
    return_ts: float
    settled: bool
    residue_secs: float | None
    # None when settled=False. Capped at RESIDUE_CAP_MINUTES*60 when settled.


@dataclass
class FragmentsResult:
    count: int
    longest_min: float
    histogram: dict[str, int]


@dataclass
class BedrockResult:
    block: Block | None
    sparkline_14d: list[float]


@dataclass
class CoreResult:
    pct: float | None
    # None (not 0.0) when there's no active time at all that day — a no-data
    # day shouldn't read as "0% core".
    threshold_minutes: float
    qualifying_secs: float
    total_active_secs: float


@dataclass
class RhythmMapResult:
    days: list[str]
    hours: list[int]
    grid: list[list[int]]
    seconds: list[list[float]]
    cutpoints: list[float]
