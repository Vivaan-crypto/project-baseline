"""App -> category lookup, with user overrides.

Two layers. `DEFAULT_APP_CATEGORIES` is a small seed list; anything the user
tags themselves wins over it. Tags live in ~/.baseline/apps.json, next to
the event database and deliberately outside the repo, because which apps
you work in is personal and machine-specific.

An allowlist can never name every tool anyone works in, so anything still
untagged falls to DEFAULT_CATEGORY ("mixed"), which counts toward total
active time but not toward focus. That deliberately UNDERSTATES focus
rather than overstating it — but it does mean an untagged main tool makes
someone's numbers look far worse than reality (measured: one unrecognised
app took a day from 86% core to 53%). `untagged_processes()` exists so the
UI can nag about exactly that instead of quietly reporting bad numbers.
"""

from __future__ import annotations

import json
from collections.abc import Callable, Iterable
from pathlib import Path

from engine.config import DEFAULT_CATEGORY
from engine.types import Category

VALID_CATEGORIES: tuple[Category, ...] = ("focus", "mixed", "comms", "background")

USER_CATEGORIES_PATH = Path.home() / ".baseline" / "apps.json"

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


def _normalise(process: str) -> str:
    """Case-insensitive key. Windows reports the same executable with
    inconsistent casing depending on how it was launched, and a user who
    tagged "Code.exe" means the same thing as "code.exe"."""
    return process.strip().lower()


_DEFAULTS_BY_KEY = {_normalise(k): v for k, v in DEFAULT_APP_CATEGORIES.items()}


def load_user_categories(path: Path | None = None) -> dict[str, Category]:
    """Tags the user has set. Never raises: a corrupt or unreadable file
    falls back to the seed list rather than taking the whole dashboard
    down over a config file."""
    target = path or USER_CATEGORIES_PATH
    try:
        raw = json.loads(target.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(raw, dict):
        return {}
    return {
        _normalise(str(k)): v
        for k, v in raw.items()
        if v in VALID_CATEGORIES and str(k).strip()
    }


def save_user_category(
    process: str, category: Category | None, path: Path | None = None
) -> dict[str, Category]:
    """Set one tag, or clear it when category is None. Returns the new map."""
    if category is not None and category not in VALID_CATEGORIES:
        raise ValueError(
            f"{category!r} is not a category. Use one of: {', '.join(VALID_CATEGORIES)}"
        )
    target = path or USER_CATEGORIES_PATH
    current = load_user_categories(target)
    key = _normalise(process)
    if category is None:
        current.pop(key, None)
    else:
        current[key] = category

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(current, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return current


def make_category_lookup(
    overrides: dict[str, Category] | None = None,
    *,
    use_user_file: bool = True,
    path: Path | None = None,
) -> Callable[[str | None], Category]:
    """process -> Category. Precedence: explicit overrides, then the user's
    tags, then the seed list, then DEFAULT_CATEGORY.

    `use_user_file=False` keeps a lookup reproducible regardless of whose
    machine it runs on, which the tests rely on.
    """
    table = dict(_DEFAULTS_BY_KEY)
    if use_user_file:
        table.update(load_user_categories(path))
    if overrides:
        table.update({_normalise(k): v for k, v in overrides.items()})

    def category_of(process: str | None) -> Category:
        if process is None:
            return DEFAULT_CATEGORY
        return table.get(_normalise(process), DEFAULT_CATEGORY)

    return category_of


def is_tagged(process: str, *, use_user_file: bool = True, path: Path | None = None) -> bool:
    """Whether anything has actually claimed this app, as opposed to it
    landing on the fallback because nobody said."""
    key = _normalise(process)
    if key in _DEFAULTS_BY_KEY:
        return True
    return use_user_file and key in load_user_categories(path)


def untagged_processes(
    processes: Iterable[str], *, use_user_file: bool = True, path: Path | None = None
) -> list[str]:
    """Apps nobody has categorised, in the order given. These are the ones
    silently counting toward nothing."""
    known = dict(_DEFAULTS_BY_KEY)
    if use_user_file:
        known.update(load_user_categories(path))
    seen: set[str] = set()
    out: list[str] = []
    for process in processes:
        key = _normalise(process)
        if key in known or key in seen:
            continue
        seen.add(key)
        out.append(process)
    return out
