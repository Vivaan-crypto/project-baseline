from __future__ import annotations

from engine.features.fragments import fragments
from engine.types import Block


def _block(duration_secs: float, open_ended: bool = False) -> Block:
    return Block(start=0, end=duration_secs, category="focus", open_ended=open_ended)


def test_bucket_edge_boundaries_are_half_open():
    result = fragments(
        [
            _block(5 * 60),  # exactly 5:00 -> "5-15m", not "<5m"
            _block(15 * 60),  # exactly 15:00 -> "15-30m"
            _block(4 * 60 + 59),  # just under 5:00 -> "<5m"
        ]
    )
    assert result.histogram["<5m"] == 1
    assert result.histogram["5-15m"] == 1
    assert result.histogram["15-30m"] == 1


def test_headline_count_and_longest_match_histogram():
    result = fragments([_block(60), _block(600), _block(120)])
    assert result.count == 3
    assert result.longest_min == 10.0


def test_open_ended_block_is_excluded():
    result = fragments([_block(600), _block(9999, open_ended=True)])
    assert result.count == 1
