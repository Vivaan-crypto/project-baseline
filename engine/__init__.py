"""Baseline engine: turns captured events into the five paid features.

Everything in this package except db.py is pure functions over in-memory
data — no I/O, no SQLite — so it can be tested against hand-built synthetic
fixtures without a database. See AGENTS.md §8 for the feature definitions
this package implements, and §5 for the storage model it reads from.
"""

from engine.blocks import blocks, focus_blocks
from engine.daily import group_blocks_by_day, trailing_days
from engine.features import (
    activity,
    bedrock,
    core,
    fragments,
    residue,
    residue_by_source,
    residue_median,
    rhythm_grid,
    trace,
)
from engine.types import Block, Segment

__all__ = [
    "blocks",
    "focus_blocks",
    "Block",
    "Segment",
    "group_blocks_by_day",
    "trailing_days",
    "activity",
    "fragments",
    "bedrock",
    "core",
    "residue",
    "residue_median",
    "residue_by_source",
    "rhythm_grid",
    "trace",
]
