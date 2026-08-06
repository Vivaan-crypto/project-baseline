"""App -> category lookup. The table below is seeded from mock/mockgen.py's
APPS dict (the only existing reference, itself just a plausible starting
set for synthetic data) — treat it as a starting point, not a final list.
A real collector will eventually need this to be user-extensible."""

from __future__ import annotations

from collections.abc import Callable

from engine.config import DEFAULT_CATEGORY
from engine.types import Category

DEFAULT_APP_CATEGORIES: dict[str, Category] = {
    "Code.exe": "focus",
    "WindowsTerminal.exe": "focus",
    "pycharm64.exe": "focus",
    "Obsidian.exe": "focus",
    "chrome.exe": "mixed",
    "slack.exe": "comms",
    "Discord.exe": "comms",
    "Teams.exe": "comms",
    "Spotify.exe": "background",
}


def make_category_lookup(
    overrides: dict[str, Category] | None = None,
) -> Callable[[str | None], Category]:
    """Returns a function process -> Category. Unrecognized or missing
    processes fall back to DEFAULT_CATEGORY ("mixed"), not "focus" —
    crediting an unknown app as focus would silently inflate the metrics
    this whole package exists to measure accurately."""
    table = {**DEFAULT_APP_CATEGORIES, **(overrides or {})}

    def category_of(process: str | None) -> Category:
        if process is None:
            return DEFAULT_CATEGORY
        return table.get(process, DEFAULT_CATEGORY)

    return category_of
