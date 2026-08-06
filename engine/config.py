"""Every tunable threshold in engine/, in one place, each documented with
what it means, why this value, and that it's user-tunable (AGENTS.md §12:
"Every tunable threshold ... gets a comment stating what it means and that
it's tunable.").
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from engine.types import Category

SWITCH_TOLERANCE: float = 20.0
# Seconds. A departure from a block's home category shorter than this is
# absorbed — it doesn't end the block, and it doesn't count as a Residue
# interruption. AGENTS.md §8, exact value given. Tunable; user-facing.

SETTLE_MINUTES: float = 3.0
# Minutes. A single continuous focus block at least this long, after a
# Residue interruption, marks the interruption settled. AGENTS.md §8, exact
# value given. Tunable; user-facing.

RESIDUE_CAP_MINUTES: float = 30.0
# Minutes. Ceiling on one settled residue measurement — past this the raw
# elapsed time stops being a meaningful "cost of this interruption" figure,
# the user just moved on to something else. AGENTS.md §8, exact value given.
# Tunable; user-facing.

CORE_MINUTES: float = 25.0
# Minutes. Minimum focus-block length to count toward Core's numerator.
# AGENTS.md §8, exact value given. Tunable AND must be visible in the UI.

IDLE_GAP: float = 300.0
# Seconds (5 min). Gap between input events past which the user is
# considered away. NOT given a numeric value anywhere in AGENTS.md — this is
# engine's own proposal, calibrated so mock/mockgen.py's own simulated
# think-pauses (capped at 240s, see deep_block()) don't spuriously fragment
# a block. Provisional; needs validation against real 14-day data (AGENTS.md
# §10, assumption 1). Tunable.
#
# Invariant: must exceed SWITCH_TOLERANCE, or an idle absence won't reliably
# out-last the tolerance window in blocks.py's merge logic — see the
# assertion below.

DEFAULT_CATEGORY: "Category" = "mixed"
# Fallback category for a process absent from the app->category table.
# "mixed", not "focus" — crediting an unrecognized app as focus would
# silently inflate the exact metrics being sold. Tunable via the category
# table itself, not this constant.

RESIDUE_INTERRUPTION_CATEGORIES: frozenset[str] = frozenset({"comms", "mixed"})
# Named per AGENTS.md §8's literal "a switch out of a focus block into comms
# or mixed". Kept as a constant rather than a literal set in residue.py in
# case the scope changes later.

RHYTHM_MAP_LEVELS: int = 5
# Number of intensity levels in the Rhythm Map heatmap. Matches the existing
# --heat-0..--heat-4 CSS vars in app/globals.css. Tunable, but changing it
# requires matching CSS variables to exist.

assert IDLE_GAP > SWITCH_TOLERANCE, (
    "IDLE_GAP must exceed SWITCH_TOLERANCE — see the IDLE_GAP comment above."
)
