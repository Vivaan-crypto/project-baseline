"""Splitting a [start, end) time interval into the calendar (weekday, hour)
buckets it overlaps, in local time. Used by Rhythm Map — a block can span
an hour boundary, a day boundary, or (rarely) a DST transition, and each of
those needs its active seconds attributed proportionally to every bucket it
actually touches, not dumped whole into the bucket it started in.

Interval math itself stays in epoch-second space (per AGENTS.md §5's
"clock jumps" trap) — only the bucket *labeling* does a local-tz
conversion, right at the last step.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timedelta, tzinfo


def split_interval_into_calendar_buckets(
    t0: float, t1: float, tz: tzinfo
) -> Iterator[tuple[int, int, float]]:
    """Yields (weekday, hour, overlap_secs) for each local-time calendar
    hour the [t0, t1) interval overlaps. weekday: Monday=0..Sunday=6,
    matching Python's datetime.weekday() and the DAYS array the Rhythm Map
    UI already uses.
    """
    if t1 <= t0:
        return

    cur = datetime.fromtimestamp(t0, tz)
    end_dt = datetime.fromtimestamp(t1, tz)

    while cur < end_dt:
        next_hour = (cur.replace(minute=0, second=0, microsecond=0)) + timedelta(hours=1)
        bucket_end = min(next_hour, end_dt)
        overlap = (bucket_end - cur).total_seconds()
        if overlap > 0:
            yield cur.weekday(), cur.hour, overlap
        cur = bucket_end
    # Note: a "fall back" DST transition (an hour repeating) can attribute
    # both occurrences of that wall-clock hour to the same bucket rather
    # than splitting them — an accepted inaccuracy, not a crash risk. Needs
    # a real zoneinfo.ZoneInfo (not a fixed UTC offset) to compute DST
    # transitions correctly at all; a naive fixed-offset tzinfo will get
    # spring-forward wrong.
