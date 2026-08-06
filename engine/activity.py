"""Presence detection: when was the user actually there, as opposed to just
having a window in the foreground. AGENTS.md §5 names the exact trap this
module exists to avoid: "Focus blocks must be computed inside active
segments. Naively spanning window events includes idle time and yields
impossible results like focus exceeding active time.\""""

from __future__ import annotations

from engine.config import IDLE_GAP


def active_runs(
    keys_ts: list[float],
    mouse_ts: list[float],
    idle_gap: float = IDLE_GAP,
) -> list[tuple[float, float]]:
    """Maximal spans where consecutive input events are less than idle_gap
    apart. Time before the dataset's first event or after its last is
    "no coverage", not idle — we never claim to know what happened outside
    observed data.

    Presence comes only from keys/mouse timestamps, never from `windows`
    rows: a windows row says what's in the foreground, not that anyone is
    there. A window can stay foregrounded across a 20-minute AFK gap with no
    new focus-change event firing at all.
    """
    points = sorted(keys_ts) + sorted(mouse_ts)
    points.sort()
    if not points:
        return []

    runs: list[tuple[float, float]] = []
    run_start = points[0]
    prev = points[0]
    for t in points[1:]:
        if t - prev >= idle_gap:
            runs.append((run_start, prev))
            run_start = t
        prev = t
    runs.append((run_start, prev))
    return runs
