"""Core: the share of the active day that held together in blocks of
CORE_MINUTES or more. AGENTS.md §8: "active seconds inside focus blocks >=
25 minutes, over total active seconds." The threshold is tunable and must
be visible in the UI — callers should surface `threshold_minutes` directly,
not hardcode "25" anywhere else.
"""

from __future__ import annotations

from engine.config import CORE_MINUTES
from engine.types import Block, CoreResult


def core(
    all_blocks: list[Block],
    *,
    core_minutes: float = CORE_MINUTES,
) -> CoreResult:
    """`all_blocks` must be blocks()'s full, unfiltered output — the
    denominator is total active time across every category, not just focus.
    The strict-partition property of blocks() (every second belongs to
    exactly one block) is what makes summing durations across categories a
    safe, trap-free way to compute total active time.
    """
    total_active = sum(b.duration_secs for b in all_blocks)
    qualifying = sum(
        b.duration_secs
        for b in all_blocks
        if b.category == "focus" and b.duration_secs >= core_minutes * 60
    )
    # None, not 0.0 — a no-data day shouldn't read as "0% core", which would
    # imply a day was measured and came up empty rather than not measured
    # at all.
    pct = qualifying / total_active if total_active > 0 else None
    return CoreResult(
        pct=pct,
        threshold_minutes=core_minutes,
        qualifying_secs=qualifying,
        total_active_secs=total_active,
    )
