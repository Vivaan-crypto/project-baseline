"""The half of the collector's contract that only this repo can check.

The collector lives at github.com/Proj-Baseline/baseline-collector now. Its
own suite proves that what it writes matches the documented schema; this file
proves the other direction — that a database written by the real Store is
readable by engine/db.py and flows through the whole engine.

Nothing else in this repo would catch the collector's schema drifting away
from the engine's reader, because the two are no longer in the same tree.
Skipped when the collector isn't installed:

    pip install git+https://github.com/Proj-Baseline/baseline-collector
"""

from __future__ import annotations

import sqlite3

import pytest

collector_store = pytest.importorskip(
    "collector.store", reason="baseline-collector not installed"
)

Store = collector_store.Store


def test_engine_reads_what_the_collector_writes(tmp_path):
    """If this drifts, engine/db.py stops being able to read real captures."""
    db = tmp_path / "e.db"
    with Store(db) as store:
        store.key("char")
        store.mouse("click")
        store.window("Code.exe", "main.py")
        store.flush()

    from engine.db import read_events

    keys_ts, mouse_ts, windows = read_events(db)
    assert len(keys_ts) == 1
    assert len(mouse_ts) == 1
    assert windows == [(windows[0][0], "Code.exe")]


def test_engine_can_build_blocks_from_a_real_capture(tmp_path):
    """End-to-end: collector output must flow through the whole engine."""
    db = tmp_path / "e.db"
    with Store(db) as store:
        base = 1_000_000.0
        # Hand-place timestamps by writing directly, so the test doesn't
        # depend on wall-clock timing.
        store.flush()
        conn = sqlite3.connect(db)
        conn.executemany(
            "INSERT INTO keys VALUES (?,?)",
            [(base + i * 2, "char") for i in range(60)],
        )
        conn.execute("INSERT INTO windows VALUES (?,?,?)", (base, "Code.exe", "x"))
        conn.commit()
        conn.close()

    from engine.blocks import blocks
    from engine.categorize import make_category_lookup
    from engine.db import read_events

    keys_ts, mouse_ts, windows = read_events(db)
    result = blocks(keys_ts, mouse_ts, windows, make_category_lookup())
    assert len(result) == 1
    assert result[0].category == "focus"
