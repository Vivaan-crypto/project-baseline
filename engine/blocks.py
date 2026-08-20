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

from bisect import bisect_left, bisect_right
from collections.abc import Callable, Sequence

from engine.activity import active_runs
from engine.config import IDLE_GAP, SWITCH_TOLERANCE
from engine.types import Block, Category, Segment


def _accumulate(
    process_secs: dict[str, float], seg: Segment, process_keys: dict[str, int] | None = None
) -> None:
    key = seg.process or "unknown"
    process_secs[key] = process_secs.get(key, 0.0) + seg.duration_secs
    if process_keys is not None:
        process_keys[key] = process_keys.get(key, 0) + seg.key_count


def _count_between(
    sorted_ts: Sequence[float] | None, t0: float, t1: float, inclusive: bool = False
) -> int:
    """Events in [t0, t1), or [t0, t1] when `inclusive`.

    Half-open by default so two adjacent segments never both claim an event
    that landed exactly on their shared boundary. The exception is a run's
    final segment: active_runs() ends a run ON its last event, so a
    half-open count there would drop that event from every block in the
    dataset — sum(block.key_count) would then silently sit one below the
    number of keys per run, and per-app density would be wrong by the same
    amount in the app that happened to be last."""
    if not sorted_ts:
        return 0
    right = bisect_right(sorted_ts, t1) if inclusive else bisect_left(sorted_ts, t1)
    return right - bisect_left(sorted_ts, t0)


def _row(window: tuple) -> tuple[float, str | None, str | None]:
    """Window rows are (ts, process) or (ts, process, title). Both are
    accepted: every existing caller and test passes the two-field form, and
    a capture made with --no-titles has no third field worth carrying."""
    ts, process = window[0], window[1]
    title = window[2] if len(window) > 2 else None
    return ts, process, title


def clip_category_segments(
    runs: list[tuple[float, float]],
    windows: Sequence[tuple],
    category_of: Callable[[str | None], Category],
    *,
    intent_of: Callable[[str | None, str | None], Category | None] | None = None,
    keys_ts: Sequence[float] | None = None,
    mouse_ts: Sequence[float] | None = None,
) -> list[Segment]:
    """For each active run, walk the `windows` focus-change events and emit
    one Segment per (category, process) span, clipped to the run's bounds.

    This is where idle time is excluded from any segment's span: a `windows`
    row that's still the "active" process across an AFK gap (no new
    focus-change event fired, because nothing happened) must not silently
    extend that process's segment through the gap. Segments only ever exist
    inside an active run.

    `intent_of` resolves the window title to a category that overrides the
    app's own. It is consulted per window row, so switching tabs inside one
    browser changes category mid-run exactly as switching apps would — which
    is the whole point of reading titles. Returning None leaves the app's
    category standing, so a capture without titles behaves as it always did.
    """
    def _category(process: str | None, title: str | None) -> Category:
        if intent_of is not None:
            override = intent_of(process, title)
            if override is not None:
                return override
        return category_of(process)

    def _seg(
        t0: float,
        t1: float,
        process: str | None,
        title: str | None,
        inclusive: bool = False,
    ) -> Segment:
        return Segment(
            t0,
            t1,
            _category(process, title),
            process,
            title,
            _count_between(keys_ts, t0, t1, inclusive),
            _count_between(mouse_ts, t0, t1, inclusive),
        )

    if not windows:
        # No window-change events at all: every active run is one segment of
        # unknown process, categorized via category_of(None).
        return [_seg(t0, t1, None, None, True) for t0, t1 in runs if t1 > t0]

    rows = [_row(w) for w in windows]
    windows_ts = [r[0] for r in rows]
    segments: list[Segment] = []

    for run_t0, run_t1 in runs:
        idx = bisect_right(windows_ts, run_t0) - 1
        current_process = rows[idx][1] if idx >= 0 else None
        current_title = rows[idx][2] if idx >= 0 else None
        seg_start = run_t0
        j = idx + 1

        while j < len(rows) and windows_ts[j] <= run_t1:
            if windows_ts[j] > seg_start:
                segments.append(
                    _seg(
                        seg_start,
                        windows_ts[j],
                        current_process,
                        current_title,
                        windows_ts[j] >= run_t1,
                    )
                )
            current_process = rows[j][1]
            current_title = rows[j][2]
            seg_start = windows_ts[j]
            j += 1

        if run_t1 > seg_start:
            segments.append(
                _seg(seg_start, run_t1, current_process, current_title, True)
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
        process_keys: dict[str, int] = {}
        mouse_count = segments[i].mouse_count
        _accumulate(process_secs, segments[i], process_keys)
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
                    _accumulate(process_secs, p, process_keys)
                    mouse_count += p.mouse_count
                _accumulate(process_secs, seg, process_keys)
                mouse_count += seg.mouse_count
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
                key_count=sum(process_keys.values()),
                mouse_count=mouse_count,
                process_keys=process_keys,
                open_ended=open_ended,
            )
        )

        if pending:
            i -= len(pending)

    return blocks


def blocks(
    keys_ts: list[float],
    mouse_ts: list[float],
    windows: Sequence[tuple],
    category_of: Callable[[str | None], Category],
    *,
    intent_of: Callable[[str | None, str | None], Category | None] | None = None,
    switch_tolerance: float = SWITCH_TOLERANCE,
    idle_gap: float = IDLE_GAP,
) -> list[Block]:
    """The full pipeline: raw events -> active runs -> category segments ->
    tolerance-merged Blocks. All categories, not just focus — see module
    docstring for why.

    `intent_of` is optional and off by default, so every existing caller gets
    exactly the behaviour it had before titles existed."""
    return merge_segments(
        segments(
            keys_ts,
            mouse_ts,
            windows,
            category_of,
            intent_of=intent_of,
            idle_gap=idle_gap,
        ),
        switch_tolerance,
    )


def segments(
    keys_ts: list[float],
    mouse_ts: list[float],
    windows: Sequence[tuple],
    category_of: Callable[[str | None], Category],
    *,
    intent_of: Callable[[str | None, str | None], Category | None] | None = None,
    idle_gap: float = IDLE_GAP,
) -> list[Segment]:
    """Everything blocks() does except the tolerance merge.

    Exposed because `engine.titles` needs per-title spans with idle time
    already excluded, and reimplementing that clipping in the CLI is how the
    two would silently drift apart."""
    runs = active_runs(keys_ts, mouse_ts, idle_gap)
    return clip_category_segments(
        runs,
        windows,
        category_of,
        intent_of=intent_of,
        keys_ts=keys_ts,
        mouse_ts=mouse_ts,
    )


def focus_blocks(
    keys_ts: list[float],
    mouse_ts: list[float],
    windows: Sequence[tuple],
    category_of: Callable[[str | None], Category],
    *,
    intent_of: Callable[[str | None, str | None], Category | None] | None = None,
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
        intent_of=intent_of,
        switch_tolerance=switch_tolerance,
        idle_gap=idle_gap,
    )
    return [b for b in all_blocks if b.category == "focus"]
