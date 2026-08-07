"""Grouping blocks into calendar days.

Every per-day feature (Fragments, Bedrock, Core, Residue, Activity, Trace)
needs the same day-boundary rule, so it lives here once rather than being
re-derived per feature with slightly different edge behaviour.

A block spanning midnight is attributed WHOLE to the calendar day it
started in — it is not split. Splitting would put half a focus block in
each day's Fragments histogram, turning one real block into two short
ones and understating Bedrock on both days. Not specified in AGENTS.md;
engine's own choice, flagged in §8's assumption list.

Rhythm Map is the deliberate exception: it splits across hour and day
buckets proportionally (see engine/timegrid.py), because there the unit
of measurement is the hour bucket, not the block.
"""

from __future__ import annotations

from datetime import datetime, tzinfo

from engine.types import Block


def day_key(ts: float, tz: tzinfo) -> str:
    """Local-date ISO string ("2026-08-05") for an epoch timestamp."""
    return datetime.fromtimestamp(ts, tz).strftime("%Y-%m-%d")


def group_blocks_by_day(
    blocks: list[Block], tz: tzinfo
) -> dict[str, list[Block]]:
    """Keyed by local ISO date, each day's blocks in start order. Days with
    no activity simply don't appear — callers that need a continuous date
    axis (Bedrock's sparkline) should fill gaps themselves rather than
    having this function invent empty days it can't distinguish from days
    outside the data range entirely."""
    grouped: dict[str, list[Block]] = {}
    for block in sorted(blocks, key=lambda b: b.start):
        grouped.setdefault(day_key(block.start, tz), []).append(block)
    return grouped


def trailing_days(
    grouped: dict[str, list[Block]], upto: str, n: int
) -> list[list[Block]]:
    """The n calendar days ending at `upto` (inclusive), oldest first, with
    absent days as empty lists. Used for Bedrock's 14-day sparkline, where a
    zero-activity day must render as a zero-height bar rather than silently
    compressing the day axis."""
    from datetime import date, timedelta

    end = date.fromisoformat(upto)
    out: list[list[Block]] = []
    for offset in range(n - 1, -1, -1):
        key = (end - timedelta(days=offset)).isoformat()
        out.append(grouped.get(key, []))
    return out
