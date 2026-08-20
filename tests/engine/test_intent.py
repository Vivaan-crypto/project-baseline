"""Title rules: what you were doing inside an app.

The property that matters most here is the fallback. A rule that fails to
match must leave the app's own category exactly as it was, because a capture
made with --no-titles has no titles at all and must keep behaving the way it
did before any of this existed.
"""

from __future__ import annotations

import json

import pytest

from engine.blocks import blocks, segments
from engine.intent import (
    load_user_rules,
    make_intent_lookup,
    match_rule,
    rule_table,
    save_user_rule,
    title_seconds,
)
from tests.engine.conftest import DEFAULT_CATEGORY_OF, dense_input


def _lookup(rules=None):
    return make_intent_lookup(rules, use_user_file=False)


def test_no_title_means_no_override():
    """--no-titles, or a non-Windows stub, writes NULL. Nothing may match."""
    intent_of = _lookup()
    assert intent_of("chrome.exe", None) is None
    assert intent_of("chrome.exe", "") is None


def test_unmatched_title_means_no_override():
    assert _lookup()("chrome.exe", "some internal tool nobody seeded") is None


def test_seed_rules_match_case_insensitively():
    intent_of = _lookup()
    assert intent_of("chrome.exe", "YouTube - Home") == "background"
    assert intent_of("chrome.exe", "python - Stack Overflow") == "focus"


def test_user_rules_beat_the_seed_list():
    """Someone whose job is watching video must be able to say so."""
    intent_of = _lookup({"youtube": "focus"})
    assert intent_of("chrome.exe", "YouTube - editing") == "focus"


def test_longer_patterns_win_within_a_group():
    """Carving an exception out of a broad rule must not require ordering a
    JSON file by hand."""
    intent_of = _lookup({"youtube": "background", "youtube music": "focus"})
    assert intent_of("chrome.exe", "YouTube Music - playlist") == "focus"
    assert intent_of("chrome.exe", "YouTube - anything else") == "background"


def test_rule_table_reports_where_a_rule_came_from():
    table = rule_table({"acme intranet": "focus"}, use_user_file=False)
    hit = match_rule("ACME Intranet - tickets", table)
    assert hit == ("acme intranet", "focus", "yours")
    assert match_rule("YouTube", table)[2] == "built in"


def test_title_overrides_the_app_category_in_blocks():
    """The end-to-end claim: an hour of video in a browser stops counting as
    the same thing as an hour of documentation in the same browser."""
    keys = dense_input(0, 600)
    windows = [(0.0, "chrome.exe", "docs - Stack Overflow")]
    intent_of = _lookup()

    without = blocks(keys, [], windows, DEFAULT_CATEGORY_OF)
    with_intent = blocks(keys, [], windows, DEFAULT_CATEGORY_OF, intent_of=intent_of)

    assert [b.category for b in without] == ["mixed"]
    assert [b.category for b in with_intent] == ["focus"]


def test_two_tabs_in_one_app_split_into_two_categories():
    keys = dense_input(0, 600, step=2.0)
    windows = [
        (0.0, "chrome.exe", "docs - Stack Overflow"),
        (300.0, "chrome.exe", "music - YouTube"),
    ]
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF, intent_of=_lookup())
    categories = [b.category for b in result]
    assert "focus" in categories and "background" in categories


def test_two_field_window_rows_still_work():
    """Every pre-existing caller and fixture passes (ts, process). Those must
    keep working untouched, with or without an intent lookup."""
    keys = dense_input(0, 300)
    windows = [(0.0, "Code.exe")]
    result = blocks(keys, [], windows, DEFAULT_CATEGORY_OF, intent_of=_lookup())
    assert [b.category for b in result] == ["focus"]


def test_title_seconds_excludes_idle_time():
    """A title left in the foreground over lunch must not accrue hours."""
    keys = dense_input(0, 60) + dense_input(3600, 3660)
    windows = [(0.0, "chrome.exe", "YouTube")]
    segs = segments(keys, [], windows, DEFAULT_CATEGORY_OF, intent_of=_lookup())
    total = title_seconds(segs)["YouTube"]
    assert total < 300, f"idle hour leaked into the title's total: {total}s"


def test_user_rules_round_trip_through_the_file(tmp_path):
    path = tmp_path / "titles.json"
    save_user_rule("acme", "focus", path)
    save_user_rule("noise", "background", path)
    assert load_user_rules(path) == {"acme": "focus", "noise": "background"}

    save_user_rule("noise", None, path)
    assert load_user_rules(path) == {"acme": "focus"}


def test_corrupt_rules_file_falls_back_instead_of_exploding(tmp_path):
    """A config file must never be able to take the dashboard down."""
    path = tmp_path / "titles.json"
    path.write_text("{not json at all")
    assert load_user_rules(path) == {}


def test_invalid_categories_are_dropped_on_read(tmp_path):
    path = tmp_path / "titles.json"
    path.write_text(json.dumps({"a": "focus", "b": "productive"}))
    assert load_user_rules(path) == {"a": "focus"}


def test_setting_an_unknown_category_is_refused(tmp_path):
    with pytest.raises(ValueError):
        save_user_rule("a", "productive", tmp_path / "titles.json")  # type: ignore[arg-type]


def test_empty_pattern_is_refused(tmp_path):
    """An empty substring matches every title ever captured."""
    with pytest.raises(ValueError):
        save_user_rule("   ", "focus", tmp_path / "titles.json")
