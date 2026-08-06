"""SQLite read helpers. The only impure module in engine/ — everything else
is pure functions over the plain lists/tuples this module produces, which
is what keeps the rest of the package testable without a database.

Reads the schema AGENTS.md §5 and mock/mockgen.py both use:
    keys    (ts REAL, class TEXT)
    mouse   (ts REAL, kind TEXT)
    windows (ts REAL, process TEXT, title TEXT)
"""

from __future__ import annotations

import sqlite3
from pathlib import Path


def read_events(
    db_path: Path,
) -> tuple[list[float], list[float], list[tuple[float, str | None]]]:
    """Returns (keys_ts, mouse_ts, windows) ready to pass straight into
    engine.blocks.blocks(). `windows` is sorted by timestamp, since
    engine.blocks relies on that ordering."""
    conn = sqlite3.connect(db_path)
    try:
        keys_ts = [row[0] for row in conn.execute("SELECT ts FROM keys ORDER BY ts")]
        mouse_ts = [row[0] for row in conn.execute("SELECT ts FROM mouse ORDER BY ts")]
        windows = [
            (row[0], row[1])
            for row in conn.execute("SELECT ts, process FROM windows ORDER BY ts")
        ]
    finally:
        conn.close()
    return keys_ts, mouse_ts, windows
