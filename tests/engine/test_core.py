from __future__ import annotations

from engine.config import CORE_MINUTES
from engine.features.core import core
from engine.types import Block


def _block(start: float, end: float, category: str) -> Block:
    return Block(start=start, end=end, category=category, process_secs={})


def test_sub_threshold_block_contributes_to_denominator_not_numerator():
    blocks = [_block(0, 10 * 60, "focus")]  # 10 min, under CORE_MINUTES
    result = core(blocks)
    assert result.qualifying_secs == 0
    assert result.total_active_secs == 10 * 60
    assert result.pct == 0.0


def test_boundary_at_exactly_core_minutes_counts():
    blocks = [_block(0, CORE_MINUTES * 60, "focus")]
    result = core(blocks)
    assert result.qualifying_secs == CORE_MINUTES * 60
    assert result.pct == 1.0


def test_boundary_just_under_core_minutes_does_not_count():
    blocks = [_block(0, CORE_MINUTES * 60 - 1, "focus")]
    result = core(blocks)
    assert result.qualifying_secs == 0


def test_zero_active_seconds_returns_none_not_zero():
    result = core([])
    assert result.pct is None
    assert result.total_active_secs == 0


def test_denominator_uses_all_category_active_seconds():
    blocks = [
        _block(0, CORE_MINUTES * 60, "focus"),
        _block(CORE_MINUTES * 60, CORE_MINUTES * 60 + 600, "mixed"),
    ]
    result = core(blocks)
    assert result.total_active_secs == CORE_MINUTES * 60 + 600
    assert result.pct < 1.0


def test_threshold_is_visible_on_result():
    result = core([], core_minutes=17.0)
    assert result.threshold_minutes == 17.0
