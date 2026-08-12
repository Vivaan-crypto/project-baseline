"""Keep the dashboard's snapshot fresh while the collector runs.

    python -m engine.watch --db ~/.baseline/events.db --source real

Re-exports on an interval. The dev server hot-reloads the JSON import when
the file changes, so the dashboard updates on its own without a refresh.

This lives here rather than in the collector on purpose. The collector is the
AGPL, publicly auditable component (AGENTS.md hard rule 7) and engine/ is
closed; having the collector import the engine to refresh a view would drag
closed code into the audited one and break that split. That split is now a
repo boundary — the collector ships from Proj-Baseline/baseline-collector —
which makes the same mistake harder to make by accident, not impossible.
Capture and presentation stay separate processes that share only the SQLite
file.
"""

from __future__ import annotations

import argparse
import json
import time
from datetime import datetime
from pathlib import Path

from engine.export import DEFAULT_DB, DEFAULT_OUT, build_snapshot


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--source", default="real")
    parser.add_argument(
        "--interval",
        type=float,
        default=120.0,
        help="seconds between exports (default: 120)",
    )
    args = parser.parse_args()

    db = args.db.expanduser()
    print(f"watching {db}")
    print(f"  writing {args.out} every {args.interval:.0f}s")
    print("  Ctrl+C to stop\n")

    last_error: str | None = None
    while True:
        stamp = datetime.now().strftime("%H:%M:%S")
        try:
            if not db.exists():
                # Normal when the collector hasn't started yet. Say so once
                # rather than every tick, then keep waiting.
                message = "waiting for the collector to create the database"
                if message != last_error:
                    print(f"  {stamp}  {message}")
                    last_error = message
            else:
                snapshot = build_snapshot(db, args.source)
                args.out.parent.mkdir(parents=True, exist_ok=True)
                args.out.write_text(
                    json.dumps(snapshot, separators=(",", ":")) + "\n",
                    encoding="utf-8",
                )
                days = snapshot["days"]
                blocks = sum(d["fragments"]["count"] for d in days)
                print(
                    f"  {stamp}  {len(days)} day(s), {blocks} focus blocks",
                    flush=True,
                )
                last_error = None
        except KeyboardInterrupt:
            raise
        except Exception as exc:
            # A partially-written database or a locked file is expected while
            # the collector is mid-flush. Report it and try again next tick
            # rather than dying and leaving the dashboard stale forever.
            message = f"{type(exc).__name__}: {exc}"
            if message != last_error:
                print(f"  {stamp}  {message}")
                last_error = message

        try:
            time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nstopped.")
            return 0


if __name__ == "__main__":
    raise SystemExit(main())
