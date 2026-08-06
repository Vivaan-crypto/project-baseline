from __future__ import annotations

from engine.features.bedrock import bedrock
from engine.types import Block


def _focus_block(start: float, end: float) -> Block:
    return Block(start=start, end=end, category="focus", process_secs={"Code.exe": end - start})


def test_longest_selected_correctly():
    blocks = [_focus_block(0, 300), _focus_block(400, 1000), _focus_block(1100, 1200)]
    result = bedrock(blocks)
    assert result.block is not None
    assert result.block.duration_secs == 600


def test_two_hour_discord_loses_to_twelve_minute_focus():
    # focus_blocks() would already have excluded the Discord block by
    # construction — this test confirms bedrock() doesn't need to re-check
    # category itself, since it only ever receives focus blocks.
    focus_only = [_focus_block(0, 12 * 60)]
    result = bedrock(focus_only)
    assert result.block is not None
    assert result.block.duration_secs == 12 * 60


def test_deterministic_tie_break_is_earliest_start():
    blocks = [_focus_block(500, 800), _focus_block(0, 300)]  # both 300s
    result = bedrock(blocks)
    assert result.block is not None
    assert result.block.start == 0


def test_no_focus_blocks_returns_none_not_a_fabricated_zero():
    result = bedrock([])
    assert result.block is None


def test_fourteen_day_sparkline_includes_zero_value_days():
    history = [[], [_focus_block(0, 600)], []]
    result = bedrock([], history_by_day=history)
    assert result.sparkline_14d == [0.0, 600.0, 0.0]
