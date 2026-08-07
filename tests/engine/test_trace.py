from __future__ import annotations

from engine.features.trace import trace
from engine.types import Block


def _block(start, end, category="focus", open_ended=False):
    return Block(
        start=start,
        end=end,
        category=category,
        process_secs={"Code.exe": end - start},
        open_ended=open_ended,
    )


def test_adjacent_blocks_produce_no_away_entry():
    # Category changed but the user never left — that is not a break.
    entries = trace([_block(0, 600), _block(600, 900, "comms")])
    assert [e.kind for e in entries] == ["block", "block"]


def test_real_gap_produces_an_away_entry():
    entries = trace([_block(0, 600), _block(1200, 1800)])
    assert [e.kind for e in entries] == ["block", "away", "block"]
    away = entries[1]
    assert away.start == 600
    assert away.end == 1200
    assert away.duration_secs == 600
    assert away.category is None


def test_no_leading_or_trailing_away_entries():
    # Time before the first input and after the last is "no coverage", not
    # measured idleness — inventing an away entry there would be claiming an
    # observation the collector never made.
    entries = trace([_block(500, 900)])
    assert len(entries) == 1
    assert entries[0].kind == "block"


def test_float_sliver_is_not_reported_as_a_break():
    # Clipping arithmetic can leave sub-millisecond gaps between blocks that
    # are conceptually touching.
    entries = trace([_block(0, 600.0), _block(600.0000001, 900)])
    assert [e.kind for e in entries] == ["block", "block"]


def test_entries_are_returned_in_time_order_regardless_of_input_order():
    entries = trace([_block(1200, 1800), _block(0, 600)])
    starts = [e.start for e in entries]
    assert starts == sorted(starts)


def test_open_ended_flag_is_carried_through():
    entries = trace([_block(0, 600, open_ended=True)])
    assert entries[0].open_ended is True


def test_empty_day_returns_empty_timeline():
    assert trace([]) == []
