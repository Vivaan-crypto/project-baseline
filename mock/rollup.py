"""
Aggregates mock_events.db (see mockgen.py) into the weekday x hour intensity
grid the landing page's Rhythm Map renders.

    python mockgen.py --out mock/mock_events.db     # from repo root
    python mock/rollup.py

mockgen.py's own docstring says "never on the landing page." Vivaan reviewed
that conflict directly and chose to use it there anyway — this script and the
JSON it produces exist because of that explicit call, not despite it. Don't
"fix" this without checking with him first.

The output stays clearly synthetic: _components/rhythm-map.tsx keeps the
"Illustrative — not captured data" badge regardless of what feeds the grid.
"""

import bisect
import json
import sqlite3
import statistics
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "mock_events.db"
OUT_PATH = Path(__file__).parent.parent / "app" / "_data" / "rhythm-map.json"

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def bucket_counts(db_path: Path) -> list[list[int]]:
    """7x24 grid of raw keys+mouse event counts, day-major (Mon..Sun x 0..23)."""
    grid = [[0] * 24 for _ in range(7)]
    conn = sqlite3.connect(db_path)
    try:
        for (ts,) in conn.execute("SELECT ts FROM keys"):
            dt = datetime.fromtimestamp(ts)
            grid[dt.weekday()][dt.hour] += 1
        for (ts,) in conn.execute("SELECT ts FROM mouse"):
            dt = datetime.fromtimestamp(ts)
            grid[dt.weekday()][dt.hour] += 1
    finally:
        conn.close()
    return grid


def levels_from_counts(grid: list[list[int]]) -> tuple[list[list[int]], list[float]]:
    """Bin the 168 bucket counts into 5 levels (0-4) via quantiles."""
    flat = [c for row in grid for c in row]

    try:
        cutpoints = statistics.quantiles(flat, n=5)
    except statistics.StatisticsError:
        # Degenerate input (e.g. near-zero variance) — flat mid-level grid
        # beats crashing the regen step.
        return [[2] * 24 for _ in range(7)], []

    levels = [
        [min(4, bisect.bisect_right(cutpoints, c)) for c in row]
        for row in grid
    ]
    return levels, cutpoints


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(
            f"{DB_PATH} not found — run mockgen.py first:\n"
            f"  python mockgen.py --out {DB_PATH.relative_to(Path.cwd()) if DB_PATH.is_relative_to(Path.cwd()) else DB_PATH}"
        )

    grid = bucket_counts(DB_PATH)
    levels, cutpoints = levels_from_counts(grid)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(
            {
                "days": DAYS,
                "hours": list(range(24)),
                "grid": levels,
                "generatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
                "source": "mock",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    flat = [c for row in grid for c in row]
    print(f"{OUT_PATH}")
    print(f"  {sum(flat):,} events across 168 buckets")
    print(f"  bucket count range: {min(flat)}-{max(flat)}")
    if cutpoints:
        print(f"  quintile cutpoints: {[round(c, 1) for c in cutpoints]}")
    else:
        print("  degenerate distribution — wrote flat mid-level grid")


if __name__ == "__main__":
    main()
