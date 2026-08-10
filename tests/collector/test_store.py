from __future__ import annotations

import os
import sqlite3

import pytest

from collector.store import AlreadyRunning, PidLock, Store


def test_writes_the_schema_engine_reads(tmp_path):
    """The contract between capture and analysis. If this drifts, engine/db.py
    stops being able to read real captures."""
    db = tmp_path / "e.db"
    with Store(db) as store:
        store.key("char")
        store.mouse("click")
        store.window("Code.exe", "main.py")
        store.flush()

    # Read it back exactly the way engine/db.py does.
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


def test_schema_version_recorded_from_day_one(tmp_path):
    db = tmp_path / "e.db"
    with Store(db):
        pass
    conn = sqlite3.connect(db)
    value = conn.execute("SELECT value FROM meta WHERE key='schema_version'").fetchone()
    conn.close()
    assert value is not None


def test_session_start_and_stop_are_recorded(tmp_path):
    db = tmp_path / "e.db"
    with Store(db):
        pass
    conn = sqlite3.connect(db)
    events = [r[0] for r in conn.execute("SELECT event FROM sessions ORDER BY ts")]
    conn.close()
    assert events[0] == "start"
    assert events[-1] == "stop"


def test_flush_is_idempotent_when_empty(tmp_path):
    db = tmp_path / "e.db"
    with Store(db) as store:
        store.flush()
        assert store.flush() == 0


def test_buffered_events_survive_until_flush(tmp_path):
    db = tmp_path / "e.db"
    with Store(db) as store:
        store.flush()  # clear the session-start row
        for _ in range(5):
            store.key("char")
        conn = sqlite3.connect(db)
        assert conn.execute("SELECT COUNT(*) FROM keys").fetchone()[0] == 0
        conn.close()
        assert store.flush() == 5


def test_pid_lock_blocks_a_second_collector(tmp_path):
    """Duplicate collectors double every event — AGENTS.md §5 known trap."""
    path = tmp_path / "x.pid"
    first = PidLock(path)
    first.acquire()
    try:
        with pytest.raises(AlreadyRunning):
            PidLock(path).acquire()
    finally:
        first.release()


def test_pid_lock_reclaims_a_stale_lock(tmp_path):
    """A killed collector must not lock the user out forever."""
    path = tmp_path / "x.pid"
    # A PID that cannot be running: max_pid+1 on any sane system.
    path.write_text("999999999")
    lock = PidLock(path)
    lock.acquire()  # must not raise
    assert int(path.read_text()) == os.getpid()
    lock.release()


def test_pid_lock_reclaims_a_corrupt_lock(tmp_path):
    path = tmp_path / "x.pid"
    path.write_text("not-a-pid")
    lock = PidLock(path)
    lock.acquire()
    lock.release()


def test_lock_released_on_exit(tmp_path):
    path = tmp_path / "x.pid"
    lock = PidLock(path)
    lock.acquire()
    lock.release()
    assert not path.exists()
