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
    title: str | None = None
    # Carried so `engine.titles` can attribute time to what you were doing
    # inside an app, and so intent rules are auditable after the fact. The
    # engine never displays it and export.py never serialises it.
    key_count: int = 0
    mouse_count: int = 0
    # Input that landed inside this span. Presence already told us someone
    # was here; these say how hard they were working, which is what separates
    # writing code in a browser from watching a video in one.

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
    key_count: int = 0
    mouse_count: int = 0
    process_keys: dict[str, int] = field(default_factory=dict)
    # Input intensity, per block and per app within it. Distinguishes
    # production from consumption — NOT productive from unproductive.
    # Reading documentation is low-input and valuable; no timing signal
    # separates those two, so nothing in engine/ scores a block on this.
    open_ended: bool = False
    # True only for a block truncated by the end of the queried range, not a
    # real boundary — the caller decides whether to include it in aggregates.

    @property
    def duration_secs(self) -> float:
        return self.end - self.start

    @property
    def keys_per_min(self) -> float:
        """Keystrokes per minute across the block. 0.0 for a zero-length
        block rather than a division error."""
        minutes = self.duration_secs / 60.0
        return self.key_count / minutes if minutes > 0 else 0.0

    @property
    def input_per_min(self) -> float:
        """Keys and mouse events together. The one to use when the capture
        may have run with --no-keys, where keys_per_min is structurally 0."""
        minutes = self.duration_secs / 60.0
        return (self.key_count + self.mouse_count) / minutes if minutes > 0 else 0.0

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
    churn_secs: float | None = None
    # Time between returning and the START of the block that finally stuck —
    # residue_secs minus the mandatory settle window, floored at 0.
    #
    # Why this exists: residue_secs has a hard floor of SETTLE_MINUTES,
    # because "settled" is defined as having sustained that long. Anyone who
    # returns and simply gets back to work scores exactly the floor, so on
    # real data residue_secs is very often a constant (measured: 160/160
    # settled interruptions came to exactly 180.0s on the 30-day mock set).
    # churn_secs is the part that actually varies — 0 for a clean return,
    # positive only when they bounced before holding. Report both; they
    # answer different questions and only one of them carries information
    # on a typical day.


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
