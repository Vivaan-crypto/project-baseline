"""Residue: elapsed time from first return to final settle. The cap-vs-
exclude distinction and the "never impute 0" rule are the two things most
likely to silently regress.

Note: any interruption fixture must last strictly longer than
SWITCH_TOLERANCE (20s), or blocks() absorbs it into the surrounding focus
block by design and it never becomes a standalone interruption block for
residue() to see at all — that's the tolerance rule doing its job, not a
bug, but it means every fixture below uses a >20s gap on purpose.
"""

from __future__ import annotations

from engine.blocks import blocks
from engine.config import RESIDUE_CAP_MINUTES, SETTLE_MINUTES
from engine.features.residue import residue, residue_by_source, residue_median
from tests.engine.conftest import DEFAULT_CATEGORY_OF, dense_input, mk_window


def test_simple_settle_exact_value():
    # Focus -> Slack for 25s (a real interruption) -> Focus for 5 min (settles).
    keys = dense_input(0, 100) + dense_input(125, 700)
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "slack.exe"),
        mk_window(125, "Code.exe"),
    ]
    all_blocks = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    measurements = residue(all_blocks)
    assert len(measurements) == 1
    m = measurements[0]
    assert m.settled is True
    assert m.residue_secs == SETTLE_MINUTES * 60


def test_settle_boundary_just_under_is_unsettled():
    # Returning focus block is 2:59, then a fresh interruption arrives
    # before it could ever reach 3:00 -> unsettled, excluded.
    t_return = 125.0
    t_second_interrupt = t_return + 179  # 2:59 later
    keys = (
        dense_input(0, 100)
        + dense_input(t_return, t_second_interrupt)
        + dense_input(t_second_interrupt + 25, t_second_interrupt + 200)
    )
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "slack.exe"),
        mk_window(t_return, "Code.exe"),
        mk_window(t_second_interrupt, "Discord.exe"),  # new interruption, >20s
        mk_window(t_second_interrupt + 25, "Code.exe"),
    ]
    all_blocks = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    measurements = residue(all_blocks)
    assert measurements[0].settled is False
    assert measurements[0].residue_secs is None


def test_settle_boundary_at_exactly_three_minutes_settles():
    keys = dense_input(0, 100) + dense_input(125, 700)
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "slack.exe"),
        mk_window(125, "Code.exe"),
    ]
    all_blocks = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    measurements = residue(all_blocks)
    assert measurements[0].settled is True


def test_background_only_gap_is_not_an_interruption():
    # 30s of Spotify: long enough to NOT be absorbed by tolerance, so this
    # genuinely tests that "background" isn't a comms/mixed interruption,
    # rather than passing by accident because it got absorbed.
    keys = dense_input(0, 100) + dense_input(130, 400)
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "Spotify.exe"),
        mk_window(130, "Code.exe"),
    ]
    all_blocks = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    measurements = residue(all_blocks)
    assert measurements == []


def test_mixed_only_gap_is_counted():
    # chrome.exe alone (category "mixed") must trigger an interruption too,
    # not just "comms" apps.
    keys = dense_input(0, 100) + dense_input(125, 700)
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "chrome.exe"),
        mk_window(125, "Code.exe"),
    ]
    all_blocks = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    measurements = residue(all_blocks)
    assert len(measurements) == 1


def test_multihop_bounce_settle_measures_from_original_return():
    # Interrupted -> return briefly (1 min, doesn't settle) -> a background
    # blip LONG ENOUGH to not be tolerance-absorbed (>20s, else blocks()
    # would merge it straight into the surrounding focus time and this
    # wouldn't test bouncing at all) -> qualifying focus block -> settled.
    # Residue should be measured from the ORIGINAL return, not the second one.
    t_interrupt_start = 100.0
    t_return1 = 125.0  # first return, 25s interruption
    t_return1_end = t_return1 + 60  # 1 minute focus, too short to settle
    t_bg_end = t_return1_end + 30  # 30s Spotify blip, exceeds tolerance
    t_settle_block_start = t_bg_end
    keys = (
        dense_input(0, 100)
        + dense_input(t_return1, t_return1_end)
        + dense_input(t_return1_end, t_bg_end)
        + dense_input(t_bg_end, t_settle_block_start + 400)
    )
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(t_interrupt_start, "slack.exe"),
        mk_window(t_return1, "Code.exe"),
        mk_window(t_return1_end, "Spotify.exe"),
        mk_window(t_bg_end, "Code.exe"),
    ]
    all_blocks = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    measurements = residue(all_blocks)
    assert len(measurements) == 1
    m = measurements[0]
    assert m.settled is True
    assert m.return_ts == t_return1
    expected = (t_settle_block_start + SETTLE_MINUTES * 60) - t_return1
    assert m.residue_secs == expected


def test_chained_interruption_independence():
    # Interruption #1 fails to settle because interruption #2 arrives first.
    # #1 must be unsettled/excluded; #2 gets its own independent measurement.
    t_return1 = 125.0  # after a 25s Slack interruption
    t_interrupt2 = t_return1 + 60  # 1-min return, too short
    t_return2 = t_interrupt2 + 25  # 25s Discord interruption
    keys = (
        dense_input(0, 100)
        + dense_input(t_return1, t_interrupt2)
        + dense_input(t_return2, t_return2 + 700)
    )
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "slack.exe"),  # interruption #1
        mk_window(t_return1, "Code.exe"),  # return #1 (1 min only)
        mk_window(t_interrupt2, "Discord.exe"),  # interruption #2
        mk_window(t_return2, "Code.exe"),  # return #2, settles
    ]
    all_blocks = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    measurements = residue(all_blocks)
    assert len(measurements) == 2
    assert measurements[0].settled is False
    assert measurements[1].settled is True
    assert measurements[1].return_ts == t_return2


def test_cap_enforcement_reports_exact_cap_not_exclusion():
    # Return, then a long (38-min) background blip that doesn't itself
    # settle anything but doesn't abandon the attempt either, then a
    # qualifying focus block. Elapsed time from return to settle is well
    # over the 30-min cap, with no re-interruption anywhere -> capped to
    # exactly RESIDUE_CAP_MINUTES, still settled=True (not excluded).
    #
    # Input coverage must stay continuous (< IDLE_GAP spacing) throughout
    # the whole 38-minute stretch, or it reads as an idle gap rather than
    # "present but on Spotify" and the interruption gets abandoned instead
    # of capped — a background blip and an idle gap are different things.
    t_return = 125.0
    long_background = (RESIDUE_CAP_MINUTES + 8) * 60  # 38 min
    t_settle_start = t_return + long_background
    keys = (
        dense_input(0, 100)
        + dense_input(t_return, t_settle_start, step=100.0)
        + dense_input(t_settle_start, t_settle_start + 400)
    )
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "slack.exe"),
        mk_window(t_return, "Code.exe"),
        mk_window(t_return + 5, "Spotify.exe"),  # long background stretch
        mk_window(t_settle_start, "Code.exe"),  # finally settles
    ]
    all_blocks = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    measurements = residue(all_blocks)
    assert len(measurements) == 1
    assert measurements[0].settled is True
    assert measurements[0].residue_secs == RESIDUE_CAP_MINUTES * 60


def test_unresolved_at_end_of_data_is_unsettled():
    keys = dense_input(0, 100) + dense_input(125, 160)  # too short, data ends
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "slack.exe"),
        mk_window(125, "Code.exe"),
    ]
    all_blocks = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    measurements = residue(all_blocks)
    assert measurements[0].settled is False


def test_median_never_imputes_zero_for_unsettled():
    keys = dense_input(0, 100) + dense_input(125, 160)  # unsettled
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "slack.exe"),
        mk_window(125, "Code.exe"),
    ]
    all_blocks = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    measurements = residue(all_blocks)
    assert residue_median(measurements) is None  # not 0.0


def test_per_source_grouping_does_not_cross_contaminate():
    keys = dense_input(0, 100) + dense_input(125, 700) + dense_input(925, 1500)
    windows = [
        mk_window(0, "Code.exe"),
        mk_window(100, "slack.exe"),
        mk_window(125, "Code.exe"),
        mk_window(800, "Discord.exe"),
        mk_window(925, "Code.exe"),
    ]
    all_blocks = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    measurements = residue(all_blocks)
    assert len(measurements) == 2
    totals = residue_by_source(measurements)
    assert "slack.exe" in totals
    assert "Discord.exe" in totals
