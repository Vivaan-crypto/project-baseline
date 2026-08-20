"""What you were doing inside an app, from the window title.

An app is too coarse a unit to categorise. A browser is a documentation
reader and a television, often in the same minute, and `opera.exe -> mixed`
cannot tell those apart. The title can: the tab you are on is already in
`windows.title`, captured by the collector and — until now — read by
nothing.

A rule is a case-insensitive substring of the title mapped to a category.
When one matches, it OVERRIDES the app's category for that span; when none
matches, the app's own category stands, which is exactly today's behaviour.
That fallback is what makes this safe to add: a capture with no titles at
all (`--no-titles`, or a non-Windows stub) degrades to the previous
behaviour instead of misclassifying anything.

Precedence, most specific first: your rules before the seed list, and within
each, longer patterns before shorter ones. "youtube music" beats "youtube",
so you can carve an exception out of a broad rule without ordering a file by
hand.

Titles never leave the machine and are not written to dashboard.json — the
engine reads them, resolves a category, and keeps only the category. They
are the most sensitive thing the collector records, so the less that is
built on top of them, the better.
"""

from __future__ import annotations

import json
from collections.abc import Callable, Iterable
from pathlib import Path

from engine.types import Category, Segment

VALID_CATEGORIES: tuple[Category, ...] = ("focus", "mixed", "comms", "background")

USER_TITLE_RULES_PATH = Path.home() / ".baseline" / "titles.json"
# Next to apps.json and events.db, outside the repo. Which sites you visit is
# considerably more personal than which apps you run.

DEFAULT_TITLE_RULES: dict[str, Category] = {
    # Consumption. "background" already means present-but-not-working
    # (Spotify is seeded that way), so this needs no fifth category.
    "youtube": "background",
    "netflix": "background",
    "twitch": "background",
    "hulu": "background",
    "disney+": "background",
    "prime video": "background",
    "reddit": "background",
    "instagram": "background",
    "tiktok": "background",
    "facebook": "background",
    # Work in a browser. These are the ones that make a browser look like an
    # editor, and leaving them as "mixed" is what makes a day spent reading
    # documentation register as barely working.
    "stack overflow": "focus",
    "github": "focus",
    "gitlab": "focus",
    "developer.mozilla": "focus",
    "localhost": "focus",
    "jira": "focus",
    "confluence": "focus",
    "notion": "focus",
    "figma": "focus",
    "overleaf": "focus",
    # Correspondence, wherever it happens to be rendered.
    "gmail": "comms",
    "outlook": "comms",
    "slack": "comms",
    "discord": "comms",
    "microsoft teams": "comms",
}


def _normalise(pattern: str) -> str:
    return pattern.strip().lower()


def load_user_rules(path: Path | None = None) -> dict[str, Category]:
    """Rules you have set. Never raises: a corrupt file falls back to the
    seed list rather than taking the dashboard down over a config file."""
    target = path or USER_TITLE_RULES_PATH
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


def save_user_rule(
    pattern: str, category: Category | None, path: Path | None = None
) -> dict[str, Category]:
    """Set one rule, or clear it when category is None."""
    if category is not None and category not in VALID_CATEGORIES:
        raise ValueError(
            f"{category!r} is not a category. Use one of: {', '.join(VALID_CATEGORIES)}"
        )
    target = path or USER_TITLE_RULES_PATH
    current = load_user_rules(target)
    key = _normalise(pattern)
    if not key:
        raise ValueError("a rule needs a non-empty pattern")
    if category is None:
        current.pop(key, None)
    else:
        current[key] = category

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(current, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return current


def rule_table(
    overrides: dict[str, Category] | None = None,
    *,
    use_user_file: bool = True,
    path: Path | None = None,
) -> list[tuple[str, Category, str]]:
    """Every rule in match order, as (pattern, category, source).

    Ordering is the whole contract: user rules first, then the seed list, and
    longer patterns before shorter ones within each group. Returned rather
    than applied so `engine.titles list` can show exactly what would match
    and why, instead of asking anyone to reason about precedence in their
    head.
    """
    user = dict(load_user_rules(path)) if use_user_file else {}
    if overrides:
        user.update({_normalise(k): v for k, v in overrides.items()})

    def by_specificity(items: Iterable[tuple[str, Category]]):
        return sorted(items, key=lambda kv: (-len(kv[0]), kv[0]))

    table: list[tuple[str, Category, str]] = [
        (pattern, category, "yours") for pattern, category in by_specificity(user.items())
    ]
    table += [
        (pattern, category, "built in")
        for pattern, category in by_specificity(DEFAULT_TITLE_RULES.items())
        if pattern not in user
    ]
    return table


def match_rule(
    title: str | None, table: list[tuple[str, Category, str]]
) -> tuple[str, Category, str] | None:
    """First rule whose pattern appears in the title, or None."""
    if not title:
        return None
    haystack = title.lower()
    for pattern, category, source in table:
        if pattern in haystack:
            return (pattern, category, source)
    return None


def make_intent_lookup(
    overrides: dict[str, Category] | None = None,
    *,
    use_user_file: bool = True,
    path: Path | None = None,
) -> Callable[[str | None, str | None], Category | None]:
    """(process, title) -> Category override, or None to leave the app's own
    category alone.

    The process argument is accepted but unused today. It is in the signature
    because the obvious next rule shape is per-app ("youtube" means something
    different in a browser than in an editor's file tree), and widening a
    callback's signature later means touching every call site.
    """
    table = rule_table(overrides, use_user_file=use_user_file, path=path)

    def intent_of(process: str | None, title: str | None) -> Category | None:
        hit = match_rule(title, table)
        return hit[1] if hit else None

    return intent_of


def title_seconds(segments: Iterable[Segment]) -> dict[str, float]:
    """Seconds per window title, over already-clipped segments.

    Takes segments rather than raw window rows so idle time is already
    excluded — a title left in the foreground while you were at lunch must
    not accrue hours.
    """
    totals: dict[str, float] = {}
    for seg in segments:
        if not seg.title:
            continue
        totals[seg.title] = totals.get(seg.title, 0.0) + seg.duration_secs
    return totals
