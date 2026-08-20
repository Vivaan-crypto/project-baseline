"""Input intensity on blocks.

Density is what separates writing in an app from watching one. It is
deliberately descriptive: nothing in engine/ ranks, scores or penalises a
block on it, because an hour of careful reading and an hour of scrolling
are identical to any timing signal and only one of them is worth having.
"""

from __future__ import annotations

from engine.blocks import blocks
from engine.features.activity import activity
from engine.types import Block
from tests.engine.conftest import DEFAULT_CATEGORY_OF, dense_input


def test_keys_are_counted_into_the_block_that_contains_them():
    keys = dense_input(0, 600, step=2.0)  # one every 2s
    result = blocks(keys, [], [(0.0, "Code.exe")], DEFAULT_CATEGORY_OF)
    assert len(result) == 1
    assert result[0].key_count == len(keys)


def test_every_key_lands_in_exactly_one_block():
    """Blocks partition active time, so the counts must partition the input
    too — a key counted twice would inflate density on both sides of a
    switch."""
    keys = dense_input(0, 600, step=2.0)
    windows = [(0.0, "Code.exe"), (300.0, "slack.exe"), (450.0, "Code.exe")]
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    assert sum(b.key_count for b in result) == len(keys)


def test_mouse_events_are_counted_separately():
    mouse = dense_input(0, 600, step=2.0)
    result = blocks([], mouse, [(0.0, "Code.exe")], DEFAULT_CATEGORY_OF)
    assert result[0].key_count == 0
    assert result[0].mouse_count == len(mouse)


def test_keys_per_min_distinguishes_typing_from_watching():
    """The headline claim. Same app, same duration, different intensity."""
    typing = blocks(dense_input(0, 600, step=1.0), [], [(0.0, "chrome.exe")], DEFAULT_CATEGORY_OF)
    watching = blocks(dense_input(0, 600, step=60.0), [], [(0.0, "chrome.exe")], DEFAULT_CATEGORY_OF)

    assert typing[0].keys_per_min > 50
    assert watching[0].keys_per_min < 5
    # Same span, so the difference is intensity and nothing else.
    assert round(typing[0].duration_secs) == round(watching[0].duration_secs)


def test_zero_length_block_does_not_divide_by_zero():
    """A single input event makes a run of zero length, which blocks()
    already discards — but Block is public and callers build them, so the
    property is asserted on the type rather than on the pipeline."""
    assert blocks([0.0], [], [(0.0, "Code.exe")], DEFAULT_CATEGORY_OF) == []
    empty = Block(start=100.0, end=100.0, category="focus", key_count=5)
    assert empty.keys_per_min == 0.0
    assert empty.input_per_min == 0.0


def test_input_per_min_covers_a_no_keys_capture():
    """--no-keys records no keystrokes at all by design, so keys_per_min is
    structurally 0 and callers need a measure that still means something."""
    mouse = dense_input(0, 600, step=2.0)
    result = blocks([], mouse, [(0.0, "Code.exe")], DEFAULT_CATEGORY_OF)
    assert result[0].keys_per_min == 0.0
    assert result[0].input_per_min > 0


def test_per_app_density_survives_into_activity():
    """A block can span several apps; the split has to follow through to
    Activity or the per-app column is a lie."""
    keys = dense_input(0, 300, step=1.0) + dense_input(300, 600, step=30.0)
    windows = [(0.0, "Code.exe"), (300.0, "chrome.exe")]
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    summary = activity(result, DEFAULT_CATEGORY_OF)
    by_name = {e.name: e for e in summary.by_process}

    assert by_name["Code.exe"].keys_per_min > by_name["chrome.exe"].keys_per_min


def test_idle_time_is_not_counted_as_low_density():
    """Density must be measured over active time only. Averaging a lunch
    break into the denominator would make every real block look idle."""
    keys = dense_input(0, 60, step=1.0) + dense_input(3600, 3660, step=1.0)
    result = blocks(keys, [], [(0.0, "Code.exe")], DEFAULT_CATEGORY_OF)
    assert len(result) == 2
    for block in result:
        assert block.keys_per_min > 30
