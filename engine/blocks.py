"""The shared primitive every feature derives from.

blocks() returns a strict, non-overlapping partition of all active time —
every second belongs to exactly one Block, of exactly one category. That
property is what makes `total_active_secs = sum(b.duration_secs for b in
blocks)` a trivially correct denominator for Core, and what keeps two
categories from ever needing to be "active" at the same instant.

focus_blocks() is a one-line filter over blocks() for callers (Fragments,
Bedrock) that only care about focus time. Residue and Core need the full,
unfiltered output — they need to see what filled the gaps between focus
blocks, which focus_blocks() has already thrown away.
"""

from __future__ import annotations

from bisect import bisect_right
from collections.abc import Callable, Sequence

from engine.activity import active_runs
from engine.config import IDLE_GAP, SWITCH_TOLERANCE
from engine.types import Block, Category, Segment


def _accumulate(process_secs: dict[str, float], seg: Segment) -> None:
    process_secs[seg.process or "unknown"] = (
        process_secs.get(seg.process or "unknown", 0.0) + seg.duration_secs
    )


def clip_category_segments(
    runs: list[tuple[float, float]],
    windows: Sequence[tuple[float, str | None]],
    category_of: Callable[[str | None], Category],
) -> list[Segment]:
    """For each active run, walk the `windows` focus-change events and emit
    one Segment per (category, process) span, clipped to the run's bounds.

    This is where idle time is excluded from any segment's span: a `windows`
    row that's still the "active" process across an AFK gap (no new
    focus-change event fired, because nothing happened) must not silently
    extend that process's segment through the gap. Segments only ever exist
    inside an active run.
    """
    if not windows:
        # No window-change events at all: every active run is one segment of
        # unknown process, categorized via category_of(None).
        cat = category_of(None)
        return [Segment(t0, t1, cat, None) for t0, t1 in runs if t1 > t0]

    windows_ts = [w[0] for w in windows]
    segments: list[Segment] = []

    for run_t0, run_t1 in runs:
        idx = bisect_right(windows_ts, run_t0) - 1
        current_process = windows[idx][1] if idx >= 0 else None
        seg_start = run_t0
        j = idx + 1

        while j < len(windows) and windows_ts[j] <= run_t1:
            if windows_ts[j] > seg_start:
                segments.append(
                    Segment(
                        seg_start,
                        windows_ts[j],
                        category_of(current_process),
                        current_process,
                    )
                )
            current_process = windows[j][1]
            seg_start = windows_ts[j]
            j += 1

        if run_t1 > seg_start:
            segments.append(
                Segment(seg_start, run_t1, category_of(current_process), current_process)
            )

    return segments


def merge_segments(
    segments: list[Segment], switch_tolerance: float = SWITCH_TOLERANCE
) -> list[Block]:
    """Tolerance-merge category segments into Blocks.

    The naive approach — optimistically extend the current block through
    every excursion, undo later if it turns out tolerance was busted — is
    wrong: it can retroactively need to un-count seconds that were already
    added to the running total. Example: Code(focus) -> Chrome 15s ->
    Slack 10s -> Code. Chrome alone is under the 20s tolerance; only the
    CUMULATIVE 25s busts it. The correct block boundary is at the START of
    the Chrome excursion, not at the point tolerance is confirmed exceeded —
    otherwise Chrome's 15 seconds get counted as focus time that never
    happened.

    This function holds excursions UNCOMMITTED in a `pending` buffer until
    either absorbed (return to home category before cumulative excursion
    time crosses tolerance) or spilled out once tolerance is definitively
    busted, then rewinds the cursor to reprocess the pending segments as the
    start of the next block(s).
    """
    blocks: list[Block] = []
    i = 0
    n = len(segments)

    while i < n:
        home_category = segments[i].category
        home_start = segments[i].t0
        home_end = segments[i].t1
        process_secs: dict[str, float] = {}
        _accumulate(process_secs, segments[i])
        i += 1

        pending: list[Segment] = []
        open_ended = False

        while i < n:
            seg = segments[i]
            prev_end = pending[-1].t1 if pending else home_end

            if seg.t0 > prev_end:
                # A gap between segments only happens between active runs
                # (idle time) — IDLE_GAP > SWITCH_TOLERANCE is enforced in
                # config.py, so this always exceeds tolerance. Force a
                # boundary here; `seg` itself is untouched, not consumed.
                break

            if seg.category == home_category:
                # Confirmed: the excursion (if any) resolved back home
                # before busting tolerance. Absorb everything into home.
                for p in pending:
                    _accumulate(process_secs, p)
                _accumulate(process_secs, seg)
                home_end = seg.t1
                pending = []
                i += 1
                continue

            # Tentative excursion into a different category.
            pending.append(seg)
            i += 1
            away_start = pending[0].t0
            if seg.t1 - away_start > switch_tolerance:
                break
        else:
            # Inner loop exhausted all segments without a break: the data
            # just ends here, not a real boundary. Conservative choice: if
            # there's an unresolved pending excursion when data runs out, we
            # don't know whether it would have been absorbed or busted, so
            # `home` itself is also marked open-ended rather than asserting
            # a boundary we can't actually confirm. No extrapolation either
            # way — this only affects the open_ended flag, not any duration.
            open_ended = True

        blocks.append(
            Block(
                start=home_start,
                end=home_end,
                category=home_category,
                process_secs=process_secs,
                open_ended=open_ended,
            )
        )

        if pending:
            i -= len(pending)

    return blocks


def blocks(
    keys_ts: list[float],
    mouse_ts: list[float],
    windows: Sequence[tuple[float, str | None]],
    category_of: Callable[[str | None], Category],
    *,
    switch_tolerance: float = SWITCH_TOLERANCE,
    idle_gap: float = IDLE_GAP,
) -> list[Block]:
    """The full pipeline: raw events -> active runs -> category segments ->
    tolerance-merged Blocks. All categories, not just focus — see module
    docstring for why."""
    runs = active_runs(keys_ts, mouse_ts, idle_gap)
    segments = clip_category_segments(runs, windows, category_of)
    return merge_segments(segments, switch_tolerance)


def focus_blocks(
    keys_ts: list[float],
    mouse_ts: list[float],
    windows: Sequence[tuple[float, str | None]],
    category_of: Callable[[str | None], Category],
    *,
    switch_tolerance: float = SWITCH_TOLERANCE,
    idle_gap: float = IDLE_GAP,
) -> list[Block]:
    """Thin filter over blocks() for callers that only need focus time
    (Fragments, Bedrock). Residue and Core need blocks()'s full output."""
    all_blocks = blocks(
        keys_ts,
        mouse_ts,
        windows,
        category_of,
        switch_tolerance=switch_tolerance,
        idle_gap=idle_gap,
    )
    return [b for b in all_blocks if b.category == "focus"]
