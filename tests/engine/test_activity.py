from __future__ import annotations

from engine.features.activity import activity
from engine.types import Block
from tests.engine.conftest import DEFAULT_CATEGORY_OF


def _block(start, end, category, process_secs):
    return Block(start=start, end=end, category=category, process_secs=process_secs)


def test_totals_reconcile_with_block_durations():
    # The invariant Core depends on: summing per-process seconds must equal
    # summing block durations, or Activity and Core would disagree about how
    # long the day was.
    blocks = [
        _block(0, 600, "focus", {"Code.exe": 600.0}),
        _block(600, 900, "comms", {"slack.exe": 300.0}),
    ]
    result = activity(blocks, DEFAULT_CATEGORY_OF)
    assert result.total_active_secs == 900.0
    assert result.total_active_secs == sum(b.duration_secs for b in blocks)


def test_absorbed_excursion_is_attributed_to_its_own_app():
    # A sub-tolerance flick to Chrome lives inside a FOCUS block. Activity
    # must still credit those seconds to chrome.exe — that is the documented
    # difference between per-process and per-block-category attribution.
    blocks = [_block(0, 600, "focus", {"Code.exe": 585.0, "chrome.exe": 15.0})]
    result = activity(blocks, DEFAULT_CATEGORY_OF)
    by_process = {e.name: e.secs for e in result.by_process}
    assert by_process["chrome.exe"] == 15.0

    # ...and category totals follow the PROCESS's category, so those 15s land
    # in "mixed" even though the enclosing block is focus.
    by_category = {e.name: e.secs for e in result.by_category}
    assert by_category["mixed"] == 15.0
    assert by_category["focus"] == 585.0


def test_sorted_by_time_descending():
    blocks = [_block(0, 900, "focus", {"a.exe": 100.0, "b.exe": 500.0, "c.exe": 300.0})]
    result = activity(blocks, DEFAULT_CATEGORY_OF)
    assert [e.name for e in result.by_process] == ["b.exe", "c.exe", "a.exe"]


def test_shares_sum_to_one():
    blocks = [_block(0, 900, "focus", {"a.exe": 300.0, "b.exe": 600.0})]
    result = activity(blocks, DEFAULT_CATEGORY_OF)
    assert abs(sum(e.share for e in result.by_process) - 1.0) < 1e-9


def test_empty_input_does_not_divide_by_zero():
    result = activity([], DEFAULT_CATEGORY_OF)
    assert result.total_active_secs == 0
    assert result.by_process == []
    assert result.by_category == []


def test_unknown_process_uses_the_same_fallback_as_blocks():
    blocks = [_block(0, 600, "mixed", {"unknown": 600.0})]
    result = activity(blocks, DEFAULT_CATEGORY_OF)
    # "unknown" is the sentinel blocks.py writes for a NULL process; it must
    # categorize identically here or the two modules would disagree.
    assert result.by_category[0].name == "mixed"
