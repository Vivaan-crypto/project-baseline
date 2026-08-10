"""User app tagging. The seed list is only nine entries, so for a real user
almost everything depends on these overrides working."""

from __future__ import annotations

import json

import pytest

from engine.categorize import (
    DEFAULT_APP_CATEGORIES,
    is_tagged,
    load_user_categories,
    make_category_lookup,
    save_user_category,
    untagged_processes,
)


def test_untagged_app_falls_back_to_mixed(tmp_path):
    lookup = make_category_lookup(use_user_file=False)
    # The failure mode this whole feature exists for: a real tool nobody
    # listed counts toward the total but toward no focus feature.
    assert lookup("OneNote.exe") == "mixed"
    assert lookup("Acrobat.exe") == "mixed"


def test_user_tag_beats_the_fallback(tmp_path):
    path = tmp_path / "apps.json"
    save_user_category("OneNote.exe", "focus", path)
    lookup = make_category_lookup(path=path)
    assert lookup("OneNote.exe") == "focus"


def test_user_tag_beats_a_built_in(tmp_path):
    """Someone who only ever uses Chrome for real work must be able to say
    so, even though the seed list calls it mixed."""
    path = tmp_path / "apps.json"
    assert make_category_lookup(path=path)("chrome.exe") == "mixed"
    save_user_category("chrome.exe", "focus", path)
    assert make_category_lookup(path=path)("chrome.exe") == "focus"


def test_tags_are_case_insensitive(tmp_path):
    """Windows reports the same executable with different casing depending
    on how it was launched."""
    path = tmp_path / "apps.json"
    save_user_category("OneNote.exe", "focus", path)
    lookup = make_category_lookup(path=path)
    assert lookup("onenote.exe") == "focus"
    assert lookup("ONENOTE.EXE") == "focus"


def test_clearing_a_tag_restores_the_default(tmp_path):
    path = tmp_path / "apps.json"
    save_user_category("chrome.exe", "focus", path)
    save_user_category("chrome.exe", None, path)
    assert make_category_lookup(path=path)("chrome.exe") == "mixed"


def test_rejects_a_category_that_does_not_exist(tmp_path):
    with pytest.raises(ValueError):
        save_user_category("OneNote.exe", "deep-work", tmp_path / "apps.json")  # type: ignore[arg-type]


def test_corrupt_tag_file_does_not_break_the_lookup(tmp_path):
    """A broken config file must not take the dashboard down with it."""
    path = tmp_path / "apps.json"
    path.write_text("{ this is not json", encoding="utf-8")
    assert load_user_categories(path) == {}
    assert make_category_lookup(path=path)("Code.exe") == "focus"


def test_unknown_categories_in_the_file_are_ignored(tmp_path):
    path = tmp_path / "apps.json"
    path.write_text(json.dumps({"a.exe": "focus", "b.exe": "nonsense"}), encoding="utf-8")
    loaded = load_user_categories(path)
    assert "a.exe" in loaded
    assert "b.exe" not in loaded


def test_missing_file_is_not_an_error(tmp_path):
    assert load_user_categories(tmp_path / "nope.json") == {}


def test_untagged_processes_lists_only_the_unknown_ones(tmp_path):
    path = tmp_path / "apps.json"
    save_user_category("OneNote.exe", "focus", path)
    out = untagged_processes(
        ["Code.exe", "OneNote.exe", "Acrobat.exe", "Figma.exe"], path=path
    )
    assert out == ["Acrobat.exe", "Figma.exe"]


def test_untagged_processes_deduplicates_by_case(tmp_path):
    out = untagged_processes(["Foo.exe", "foo.exe"], use_user_file=False)
    assert out == ["Foo.exe"]


def test_is_tagged(tmp_path):
    path = tmp_path / "apps.json"
    assert is_tagged("Code.exe", path=path) is True
    assert is_tagged("OneNote.exe", path=path) is False
    save_user_category("OneNote.exe", "focus", path)
    assert is_tagged("OneNote.exe", path=path) is True


def test_seed_list_is_still_small_enough_to_need_this(tmp_path):
    """If someone grows the seed list to hundreds of apps, the whole
    tagging premise changes and this test should be revisited on purpose."""
    assert len(DEFAULT_APP_CATEGORIES) < 30


def test_two_apps_tagged_the_same_merge_into_one_block(tmp_path):
    """The reason tagging fixes cross-app tasks: blocks are keyed on
    category, not app. Tag OneNote and a PDF reader both focus and
    alternating between them stops fragmenting the block."""
    from engine.blocks import blocks

    path = tmp_path / "apps.json"
    save_user_category("OneNote.exe", "focus", path)
    save_user_category("Acrobat.exe", "focus", path)
    lookup = make_category_lookup(path=path)

    keys = [float(i) for i in range(0, 600, 2)]
    windows = [
        (0.0, "OneNote.exe"),
        (120.0, "Acrobat.exe"),
        (240.0, "OneNote.exe"),
        (360.0, "Acrobat.exe"),
    ]
    result = blocks(keys, [], windows, lookup)
    assert len(result) == 1
    assert result[0].category == "focus"

    # Untagged, the identical day is one long "mixed" stretch that counts
    # toward no focus feature at all.
    bare = make_category_lookup(use_user_file=False)
    untagged_result = blocks(keys, [], windows, bare)
    assert [b.category for b in untagged_result] == ["mixed"]
