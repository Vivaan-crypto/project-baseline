"""Trace: the day as a timeline. What you were in, for how long, and
where it broke.

Free forever (AGENTS.md §8), same reasoning as Activity.

"Where it broke" is the part worth building carefully. blocks() already
excludes idle time from every block, which means the gaps BETWEEN
consecutive blocks carry real information the block list alone throws
away — a day of six blocks with five long gaps is a different day from
six blocks back to back, and a timeline that only draws blocks makes
those look identical.

So trace() emits gaps as first-class entries. Two kinds:

  "away"     — a real absence. No input at all for at least IDLE_GAP, so
               blocks() closed the block; nobody was at the machine.
  (adjacent) — no entry emitted. Block A ends exactly where B begins;
               the category changed but the user never left.

The distinction matters because a switch straight from Code to Slack is a
context switch, while a switch to Slack after a 40-minute lunch is not —
and Residue only treats one of them as an interruption.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from engine.types import Block, Category

# Gaps shorter than this are treated as float-noise adjacency rather than a
# real absence. Timestamps are floats and clipping arithmetic can leave
# sub-millisecond slivers between blocks that are conceptually touching;
# emitting those as "away" entries would litter the timeline with
# zero-width breaks. Tunable, but there is no reason to raise it above the
# resolution of the event clock itself.
ADJACENCY_EPSILON = 0.001


@dataclass
class TraceEntry:
    kind: Literal["block", "away"]
    start: float
    end: float
    duration_secs: float
    category: Category | None  # None for "away" — nothing was active
    top_process: str | None
    open_ended: bool


def trace(day_blocks: list[Block]) -> list[TraceEntry]:
    """One day's blocks (see engine.daily.group_blocks_by_day) as an
    ordered timeline with absences made explicit.

    Leading and trailing absences are NOT emitted: time before the day's
    first input and after its last is "no coverage", not measured idleness.
    Claiming someone was away from midnight until 09:00 would be inventing
    an observation — the collector simply wasn't told anything.
    """
    entries: list[TraceEntry] = []
    ordered = sorted(day_blocks, key=lambda b: b.start)

    for i, block in enumerate(ordered):
        entries.append(
            TraceEntry(
                kind="block",
                start=block.start,
                end=block.end,
                duration_secs=block.duration_secs,
                category=block.category,
                top_process=block.top_process,
                open_ended=block.open_ended,
            )
        )

        if i + 1 < len(ordered):
            gap = ordered[i + 1].start - block.end
            if gap > ADJACENCY_EPSILON:
                entries.append(
                    TraceEntry(
                        kind="away",
                        start=block.end,
                        end=ordered[i + 1].start,
                        duration_secs=gap,
                        category=None,
                        top_process=None,
                        open_ended=False,
                    )
                )

    return entries
