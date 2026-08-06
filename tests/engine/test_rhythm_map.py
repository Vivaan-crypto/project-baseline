from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from engine.features.rhythm_map import rhythm_grid
from engine.timegrid import split_interval_into_calendar_buckets
from engine.types import Block

UTC = timezone.utc


def _ts(y, mo, d, h, mi=0, tz=UTC) -> float:
    return datetime(y, mo, d, h, mi, tzinfo=tz).timestamp()


def test_block_spanning_hour_boundary_splits_proportionally():
    # 09:50 -> 10:10 on a Monday: 10 min in the 9-bucket, 10 min in the 10-bucket.
    t0 = _ts(2026, 8, 3, 9, 50)  # a Monday
    t1 = _ts(2026, 8, 3, 10, 10)
    buckets = list(split_interval_into_calendar_buckets(t0, t1, UTC))
    assert len(buckets) == 2
    (wd0, h0, secs0), (wd1, h1, secs1) = buckets
    assert h0 == 9 and abs(secs0 - 600) < 1e-6
    assert h1 == 10 and abs(secs1 - 600) < 1e-6


def test_block_spanning_midnight_splits_across_weekdays():
    t0 = _ts(2026, 8, 3, 23, 45)  # Monday 23:45
    t1 = _ts(2026, 8, 4, 0, 15)  # Tuesday 00:15
    buckets = list(split_interval_into_calendar_buckets(t0, t1, UTC))
    weekdays = {wd for wd, _, _ in buckets}
    assert weekdays == {0, 1}  # Monday=0, Tuesday=1


def test_degenerate_flat_grid_falls_back_without_crashing():
    # A single tiny block: not enough variance for statistics.quantiles.
    blocks = [Block(start=_ts(2026, 8, 3, 9, 0), end=_ts(2026, 8, 3, 9, 1), category="focus")]
    result = rhythm_grid(blocks, tz=UTC)
    assert len(result.grid) == 7
    assert all(len(row) == 24 for row in result.grid)


def test_category_filter_changes_output():
    blocks = [
        Block(start=_ts(2026, 8, 3, 9, 0), end=_ts(2026, 8, 3, 9, 30), category="focus"),
        Block(start=_ts(2026, 8, 3, 14, 0), end=_ts(2026, 8, 3, 14, 30), category="mixed"),
    ]
    all_cats = rhythm_grid(blocks, tz=UTC, category_filter=None)
    focus_only = rhythm_grid(blocks, tz=UTC, category_filter={"focus"})
    assert sum(sum(row) for row in all_cats.seconds) > sum(
        sum(row) for row in focus_only.seconds
    )


def test_dst_transition_does_not_crash():
    ny = ZoneInfo("America/New_York")
    # US spring-forward 2026-03-08 02:00 -> 03:00 local.
    t0 = datetime(2026, 3, 8, 1, 0, tzinfo=ny).timestamp()
    t1 = datetime(2026, 3, 8, 4, 0, tzinfo=ny).timestamp()
    buckets = list(split_interval_into_calendar_buckets(t0, t1, ny))
    assert len(buckets) > 0
    total = sum(secs for _, _, secs in buckets)
    assert total > 0
