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

This is now a thin wrapper over engine/ (AGENTS.md §8): read events -> blocks()
-> rhythm_grid(). It exists so the mock path and the real collector path go
through the exact same statistical treatment, differing only in event source
— no aggregation logic is duplicated here anymore.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from engine.blocks import blocks  # noqa: E402
from engine.categorize import make_category_lookup  # noqa: E402
from engine.db import read_events  # noqa: E402
from engine.features.rhythm_map import rhythm_grid  # noqa: E402

DB_PATH = Path(__file__).parent / "mock_events.db"
OUT_PATH = Path(__file__).parent.parent / "app" / "_data" / "rhythm-map.json"


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(
            f"{DB_PATH} not found — run mockgen.py first:\n"
            f"  python mockgen.py --out {DB_PATH.relative_to(Path.cwd()) if DB_PATH.is_relative_to(Path.cwd()) else DB_PATH}"
        )

    keys_ts, mouse_ts, windows = read_events(DB_PATH)
    category_of = make_category_lookup()
    all_blocks = blocks(keys_ts, mouse_ts, windows, category_of)

    # Local system timezone, matching mockgen.py's own datetime.now() (naive
    # local time) convention for generating timestamps in the first place.
    local_tz = datetime.now().astimezone().tzinfo
    result = rhythm_grid(all_blocks, tz=local_tz)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(
            {
                "days": result.days,
                "hours": result.hours,
                "grid": result.grid,
                "generatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
                "source": "mock",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    flat_secs = [c for row in result.seconds for c in row]
    print(f"{OUT_PATH}")
    print(f"  {len(all_blocks):,} blocks, {sum(flat_secs):,.0f}s active across 168 buckets")
    print(f"  bucket seconds range: {min(flat_secs):,.0f}-{max(flat_secs):,.0f}")
    if result.cutpoints:
        print(f"  quintile cutpoints: {[round(c, 1) for c in result.cutpoints]}")
    else:
        print("  degenerate distribution — wrote flat mid-level grid")


if __name__ == "__main__":
    main()
