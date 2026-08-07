from __future__ import annotations

from datetime import datetime, timezone

from engine.daily import day_key, group_blocks_by_day, trailing_days
from engine.types import Block

UTC = timezone.utc


def _ts(y, mo, d, h, mi=0):
    return datetime(y, mo, d, h, mi, tzinfo=UTC).timestamp()


def _block(start, end, category="focus"):
    return Block(start=start, end=end, category=category, process_secs={})


def test_day_key_uses_local_date():
    assert day_key(_ts(2026, 8, 3, 14), UTC) == "2026-08-03"


def test_midnight_spanning_block_is_attributed_whole_to_its_start_day():
    # Deliberately NOT split: splitting would turn one real focus block into
    # two short ones and understate Bedrock on both days.
    block = _block(_ts(2026, 8, 3, 23, 30), _ts(2026, 8, 4, 0, 30))
    grouped = group_blocks_by_day([block], UTC)
    assert list(grouped) == ["2026-08-03"]
    assert grouped["2026-08-03"][0].duration_secs == 3600


def test_blocks_are_ordered_within_each_day():
    late = _block(_ts(2026, 8, 3, 16), _ts(2026, 8, 3, 17))
    early = _block(_ts(2026, 8, 3, 9), _ts(2026, 8, 3, 10))
    grouped = group_blocks_by_day([late, early], UTC)
    assert [b.start for b in grouped["2026-08-03"]] == [early.start, late.start]


def test_days_with_no_activity_are_absent_rather_than_empty():
    grouped = group_blocks_by_day(
        [_block(_ts(2026, 8, 3, 9), _ts(2026, 8, 3, 10))], UTC
    )
    assert "2026-08-04" not in grouped


def test_trailing_days_fills_absent_days_with_empty_lists():
    # Bedrock's sparkline needs a continuous calendar axis, so gaps must come
    # back as zero-length days rather than being silently dropped.
    grouped = group_blocks_by_day(
        [_block(_ts(2026, 8, 3, 9), _ts(2026, 8, 3, 10))], UTC
    )
    days = trailing_days(grouped, "2026-08-05", 3)
    assert len(days) == 3
    assert [len(d) for d in days] == [1, 0, 0]  # Aug 3 has data, 4 and 5 don't


def test_trailing_days_is_oldest_first():
    grouped = group_blocks_by_day(
        [
            _block(_ts(2026, 8, 3, 9), _ts(2026, 8, 3, 10)),
            _block(_ts(2026, 8, 5, 9), _ts(2026, 8, 5, 11)),
        ],
        UTC,
    )
    days = trailing_days(grouped, "2026-08-05", 3)
    assert days[0][0].duration_secs == 3600  # Aug 3, the older one
    assert days[2][0].duration_secs == 7200  # Aug 5, the newer one
