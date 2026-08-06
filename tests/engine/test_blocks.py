"""blocks() / focus_blocks() mechanics. These are the cases most likely to
silently regress if the merge algorithm is touched later — especially #7,
the retroactive-boundary case."""

from __future__ import annotations

from engine.blocks import blocks, focus_blocks
from engine.categorize import make_category_lookup
from engine.config import IDLE_GAP, SWITCH_TOLERANCE
from tests.engine.conftest import DEFAULT_CATEGORY_OF, dense_input, mk_window


def test_continuous_single_app_session_is_one_block():
    keys = dense_input(0, 200)
    windows = [mk_window(0, "Code.exe")]
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    assert len(result) == 1
    assert result[0].category == "focus"
    assert result[0].start == 0
    assert result[0].end == keys[-1]


def test_same_app_flick_at_exactly_tolerance_is_absorbed():
    # Code -> Chrome for exactly SWITCH_TOLERANCE seconds -> Code. Boundary
    # is strict '>', so exactly-at-tolerance must NOT bust it.
    keys = dense_input(0, 300)
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "chrome.exe"),
        mk_window(100 + SWITCH_TOLERANCE, "Code.exe"),
    ]
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    assert len(result) == 1
    assert result[0].category == "focus"
    assert result[0].start == 0
    assert result[0].end == keys[-1]
    assert "chrome.exe" in result[0].process_secs


def test_same_app_flick_just_over_tolerance_is_not_absorbed():
    keys = dense_input(0, 300)
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "chrome.exe"),
        mk_window(100 + SWITCH_TOLERANCE + 0.1, "Code.exe"),
    ]
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    # Code(0-100) | Chrome(100-120.1) | Code(120.1-...): three separate blocks
    assert len(result) == 3
    assert [b.category for b in result] == ["focus", "mixed", "focus"]
    assert result[0].end == 100
    assert result[1].start == 100
    assert result[1].end == 100 + SWITCH_TOLERANCE + 0.1
    # The first Code block must NOT have absorbed any Chrome time.
    assert "chrome.exe" not in result[0].process_secs


def test_cross_focus_app_switch_continues_the_same_block():
    keys = dense_input(0, 300)
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(150, "WindowsTerminal.exe"),
    ]
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    assert len(result) == 1
    assert result[0].category == "focus"
    assert "Code.exe" in result[0].process_secs
    assert "WindowsTerminal.exe" in result[0].process_secs


def test_multihop_cumulative_tolerance_absorbs_when_under():
    # Chrome 8s + Slack 9s = 17s cumulative, under 20s tolerance -> absorbed.
    keys = dense_input(0, 300)
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "chrome.exe"),
        mk_window(108, "slack.exe"),
        mk_window(117, "Code.exe"),
    ]
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    assert len(result) == 1
    assert result[0].category == "focus"
    assert result[0].start == 0
    assert result[0].end == keys[-1]


def test_retroactive_boundary_does_not_double_count_seconds():
    # Code -> Chrome 15s (under tolerance alone) -> Slack 10s (cumulative
    # 25s busts tolerance) -> Code. The block must end at the START of the
    # Chrome excursion (t=100), not absorb any of Chrome's 15 seconds.
    keys = dense_input(0, 300)
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "chrome.exe"),
        mk_window(115, "slack.exe"),
        mk_window(125, "Code.exe"),
    ]
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    home = result[0]
    assert home.category == "focus"
    assert home.end == 100, "block must end at the excursion start, not absorb Chrome's 15s"
    assert "chrome.exe" not in home.process_secs
    assert "slack.exe" not in home.process_secs
    # No second of the 100-125 excursion window may appear twice across blocks.
    covered = []
    for b in result:
        covered.append((b.start, b.end))
    for i in range(len(covered) - 1):
        assert covered[i][1] <= covered[i + 1][0], "blocks must not overlap"


def test_idle_gap_forces_a_boundary():
    keys = dense_input(0, 100) + dense_input(100 + IDLE_GAP + 1, 100 + IDLE_GAP + 200)
    windows = [mk_window(0, "Code.exe")]
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    assert len(result) == 2
    assert result[0].end <= 100 + 2  # last dense_input step before the gap
    assert result[1].start >= 100 + IDLE_GAP


def test_idle_gap_ends_a_block_even_with_no_window_change_event():
    # The trap AGENTS.md §5 names explicitly: a window can stay foregrounded
    # across an idle gap with no new focus-change event firing at all.
    keys = dense_input(0, 100) + dense_input(100 + IDLE_GAP + 1, 100 + IDLE_GAP + 200)
    windows = [mk_window(0, "Code.exe")]  # single event, never changes
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    assert len(result) == 2
    total_duration = sum(b.duration_secs for b in result)
    assert total_duration < IDLE_GAP, "idle time must not be counted as active"


def test_open_ended_flag_on_trailing_block():
    keys = dense_input(0, 200)
    windows = [mk_window(0, "Code.exe")]
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    assert result[-1].open_ended is True


def test_sub_tolerance_excursion_into_background_category_absorbs():
    keys = dense_input(0, 300)
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "Spotify.exe"),
        mk_window(110, "Code.exe"),
    ]
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    assert len(result) == 1
    assert result[0].category == "focus"


def test_pure_browsing_stretch_has_no_focus_blocks():
    keys = dense_input(0, 200)
    windows = [mk_window(0, "chrome.exe")]
    result = focus_blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    assert result == []


def test_unrecognized_process_defaults_to_mixed_not_focus():
    keys = dense_input(0, 200)
    windows = [mk_window(0, "some_unknown_app.exe")]
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    assert len(result) == 1
    assert result[0].category == "mixed"


def test_empty_input_returns_empty_list():
    assert blocks([], [], [], DEFAULT_CATEGORY_OF) == []
    assert focus_blocks([], [], [], DEFAULT_CATEGORY_OF) == []


def test_no_windows_events_still_produces_a_block_of_unknown_process():
    keys = dense_input(0, 100)
    result = blocks(keys, [], [], DEFAULT_CATEGORY_OF)
    assert len(result) == 1
    assert result[0].process_secs.get("unknown", 0) > 0 or "unknown" in result[0].process_secs


def test_config_idle_gap_exceeds_switch_tolerance():
    assert IDLE_GAP > SWITCH_TOLERANCE
