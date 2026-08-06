"""Bedrock: the single longest unbroken focus block that day. AGENTS.md §8:
"Must be a focus category block — a two-hour Discord session is not
bedrock." That rejection is automatic here: bedrock() only ever sees
focus_blocks() output, which already excludes comms-category blocks by
construction — no special-case logic needed.
"""

from __future__ import annotations

from engine.types import BedrockResult, Block


def bedrock(
    focus_blocks: list[Block],
    history_by_day: list[list[Block]] | None = None,
) -> BedrockResult:
    """`history_by_day`: focus blocks for each of the trailing days, oldest
    first, used for the 14-day sparkline. Only the most recent 14 are used;
    days with no focus blocks contribute 0 rather than being omitted, so the
    sparkline's day axis doesn't silently compress."""
    candidates = [b for b in focus_blocks if not b.open_ended]
    # Tie-break: earliest start wins, for determinism.
    longest = None
    for b in sorted(candidates, key=lambda b: b.start):
        if longest is None or b.duration_secs > longest.duration_secs:
            longest = b

    sparkline = [
        max((b.duration_secs for b in day if not b.open_ended), default=0.0)
        for day in (history_by_day or [])[-14:]
    ]
    return BedrockResult(block=longest, sparkline_14d=sparkline)
