"""Activity: where the time actually went, by app and by category.

Free forever (AGENTS.md §8) — every time tracker gives this away, so
charging for it would just invite a comparison Baseline loses. It still
has to be *correct*, because it's the denominator users sanity-check
every paid number against.

Attribution is per-PROCESS, not per-block-category. A sub-tolerance flick
to Chrome inside a focus block contributes its seconds to chrome.exe here,
even though blocks() (correctly) counts that whole span as focus time for
Fragments/Core. Both are right for their own question:

  "How long did I hold focus?"        -> block category, absorbs the flick
  "How much time was I in Chrome?"    -> process attribution, counts it

Conflating the two is what makes other trackers' numbers not add up, so
category totals here are derived from each PROCESS's own category, not
from the enclosing block's. `total_active_secs` is identical under either
reading, since blocks() partitions all active time exactly once.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from engine.types import Block, Category

UNKNOWN_PROCESS = "unknown"
# Matches the key blocks.py uses when a windows row has a NULL process, so
# the two never disagree about what to call an unattributable span.


@dataclass
class ActivityEntry:
    name: str
    secs: float
    share: float  # of total active seconds; 0.0 when there is no active time
    keys: int = 0

    @property
    def keys_per_min(self) -> float:
        """Input intensity while this app was in front. Separates writing in
        a browser from watching one — but NOT valuable from worthless: an
        hour of careful reading and an hour of scrolling look identical
        here, and nothing in engine/ pretends otherwise."""
        minutes = self.secs / 60.0
        return self.keys / minutes if minutes > 0 else 0.0


@dataclass
class ActivityResult:
    total_active_secs: float
    by_process: list[ActivityEntry]
    by_category: list[ActivityEntry]


def _entries(
    totals: dict[str, float],
    total_active: float,
    keys: dict[str, int] | None = None,
) -> list[ActivityEntry]:
    return [
        ActivityEntry(
            name=name,
            secs=secs,
            share=(secs / total_active) if total_active > 0 else 0.0,
            keys=(keys or {}).get(name, 0),
        )
        for name, secs in sorted(totals.items(), key=lambda kv: (-kv[1], kv[0]))
    ]


def activity(
    all_blocks: list[Block],
    category_of: Callable[[str | None], Category],
) -> ActivityResult:
    """`all_blocks` must be blocks()'s full output, every category — this is
    a picture of the whole day, not just its focus time."""
    by_process: dict[str, float] = {}
    keys_by_process: dict[str, int] = {}
    for block in all_blocks:
        for process, secs in block.process_secs.items():
            by_process[process] = by_process.get(process, 0.0) + secs
        for process, count in block.process_keys.items():
            keys_by_process[process] = keys_by_process.get(process, 0) + count

    by_category: dict[str, float] = {}
    keys_by_category: dict[str, int] = {}
    for process, secs in by_process.items():
        # UNKNOWN_PROCESS routes through category_of(None), which returns
        # DEFAULT_CATEGORY — same fallback blocks() used when it built the
        # segment, so the two never disagree.
        key = category_of(None if process == UNKNOWN_PROCESS else process)
        by_category[key] = by_category.get(key, 0.0) + secs
        keys_by_category[key] = keys_by_category.get(key, 0) + keys_by_process.get(
            process, 0
        )

    total_active = sum(by_process.values())
    return ActivityResult(
        total_active_secs=total_active,
        by_process=_entries(by_process, total_active, keys_by_process),
        by_category=_entries(by_category, total_active, keys_by_category),
    )
