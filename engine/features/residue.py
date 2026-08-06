"""Residue: after an interruption, how long before you're back in a
sustained block. AGENTS.md §8, exact definitions:

  Interruption = a switch out of a focus block into comms or mixed,
  lasting > SWITCH_TOLERANCE (20s).
  Settled = back in a focus-category app for >= 3 continuous minutes.
  Residue = time from returning to the focus app until settled. If they
  never settle before the next interruption, mark it unsettled and exclude
  from the median — do not treat it as zero.
  Cap any single residue measurement at 30 minutes.

Confirmed interpretation (not literal in the spec, confirmed directly):
residue is the ELAPSED TIME FROM THE FIRST RETURN TO THE FINAL SETTLE, not
a flat SETTLE_MINUTES. A user can bounce — return, get pulled away again,
return again — before finally holding a continuous qualifying focus block;
this is why "14 minutes of residue" is a producible number at all. A flat
3:00 model couldn't generate it.

This is why residue() needs blocks()'s FULL output, not focus_blocks() —
AGENTS.md's "a new function over focus_blocks()" phrasing is shorthand for
"same block infrastructure Fragments uses", not a literal signature
constraint. Residue needs to see what filled the gaps between focus
blocks, which focus_blocks() has already discarded.

Flagged, not spec-given: background-only gaps (no comms/mixed at all)
between two focus blocks are not interruptions and are excluded entirely.
Idle gaps encountered mid-settle-attempt abandon that attempt; background
blips mid-attempt don't abandon it, but don't count toward settling either.
Multi-app interruption source attribution uses whichever app had the most
active seconds in the gap, not first-entered — an arbitrary but necessary
pick, since the spec doesn't address multi-app gaps.
"""

from __future__ import annotations

import statistics

from engine.config import (
    RESIDUE_CAP_MINUTES,
    RESIDUE_INTERRUPTION_CATEGORIES,
    SETTLE_MINUTES,
)
from engine.types import Block, ResidueMeasurement


def _dominant_process(
    between: list[Block], interruption_categories: frozenset[str]
) -> str | None:
    totals: dict[str, float] = {}
    for blk in between:
        if blk.category not in interruption_categories:
            continue
        for process, secs in blk.process_secs.items():
            totals[process] = totals.get(process, 0.0) + secs
    if not totals:
        return None
    return max(totals, key=lambda p: totals[p])


def residue(
    all_blocks: list[Block],
    *,
    settle_minutes: float = SETTLE_MINUTES,
    residue_cap_minutes: float = RESIDUE_CAP_MINUTES,
    interruption_categories: frozenset[str] = RESIDUE_INTERRUPTION_CATEGORIES,
) -> list[ResidueMeasurement]:
    results: list[ResidueMeasurement] = []
    focus_idx = [i for i, b in enumerate(all_blocks) if b.category == "focus"]

    for a_i, b_i in zip(focus_idx, focus_idx[1:]):
        between = all_blocks[a_i + 1 : b_i]
        gap_categories = {blk.category for blk in between}
        if not (gap_categories & interruption_categories):
            # Background-only, or a pure idle gap with no blocks at all
            # in between: not an interruption in the comms/mixed sense.
            continue

        interruption_start = all_blocks[a_i].end
        return_ts = all_blocks[b_i].start
        source = _dominant_process(between, interruption_categories)

        settled_block: Block | None = None
        j = b_i
        while j < len(all_blocks):
            blk = all_blocks[j]
            if blk.category == "focus" and blk.duration_secs >= settle_minutes * 60:
                settled_block = blk
                break
            if blk.category in interruption_categories:
                break  # a fresh interruption arrived before settling
            if j + 1 < len(all_blocks) and all_blocks[j + 1].start > blk.end:
                break  # an idle gap intervened before settling
            j += 1

        if settled_block is None:
            results.append(
                ResidueMeasurement(
                    source=source,
                    interruption_start=interruption_start,
                    return_ts=return_ts,
                    settled=False,
                    residue_secs=None,
                )
            )
            continue

        raw_secs = (settled_block.start + settle_minutes * 60) - return_ts
        results.append(
            ResidueMeasurement(
                source=source,
                interruption_start=interruption_start,
                return_ts=return_ts,
                settled=True,
                residue_secs=min(raw_secs, residue_cap_minutes * 60),
            )
        )

    return results


def residue_median(measurements: list[ResidueMeasurement]) -> float | None:
    """Never impute 0 for an unsettled interruption — per the spec, those
    are excluded from the median entirely."""
    settled = [m.residue_secs for m in measurements if m.settled and m.residue_secs is not None]
    return statistics.median(settled) if settled else None


def residue_by_source(measurements: list[ResidueMeasurement]) -> dict[str, float]:
    """Total settled residue seconds per source app — "Slack cost you 14
    minutes of residue today". Unsettled measurements aren't attributable
    to a specific cost figure, so they're excluded here too."""
    totals: dict[str, float] = {}
    for m in measurements:
        if not m.settled or m.residue_secs is None or m.source is None:
            continue
        totals[m.source] = totals.get(m.source, 0.0) + m.residue_secs
    return totals
