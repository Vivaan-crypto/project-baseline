"""Tag your apps so Baseline knows which ones are work.

    python -m engine.apps list          # what you use, and how it's counted
    python -m engine.apps set OneNote.exe focus
    python -m engine.apps set Acrobat.exe focus
    python -m engine.apps clear chrome.exe

Tags are stored in ~/.baseline/apps.json, next to your event database and
outside the repo.

Why this matters more than it sounds: an app nobody has categorised falls
to "mixed", which counts toward your total active time but not toward
Fragments, Bedrock or Core. Leaving your main tool untagged took a test day
from 86% core down to 53%. `list` sorts by time spent and flags the
untagged ones, so the apps worth tagging are the ones at the top.

Tagging two apps the same category also stops them fragmenting each other:
blocks are built per category, not per app, so OneNote and a PDF reader
both tagged focus become one continuous block rather than a dozen pieces.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from engine.blocks import blocks as build_blocks
from engine.categorize import (
    VALID_CATEGORIES,
    USER_CATEGORIES_PATH,
    is_tagged,
    load_user_categories,
    make_category_lookup,
    save_user_category,
)
from engine.db import read_events
from engine.export import DEFAULT_DB
from engine.features.activity import activity


def _fmt(secs: float) -> str:
    if secs < 60:
        return f"{secs:.0f}s"
    total = round(secs / 60)
    h, m = divmod(total, 60)
    return f"{m}m" if h == 0 else (f"{h}h" if m == 0 else f"{h}h {m}m")


def cmd_list(args: argparse.Namespace) -> int:
    db = Path(args.db).expanduser()
    if not db.exists():
        print(f"{db} does not exist yet. Capture something first:")
        print("  python -m collector run")
        return 1

    keys_ts, mouse_ts, windows = read_events(db)
    category_of = make_category_lookup()
    all_blocks = build_blocks(keys_ts, mouse_ts, windows, category_of)
    result = activity(all_blocks, category_of)

    if not result.by_process:
        print("No activity recorded yet.")
        return 0

    user = load_user_categories()
    untagged_secs = 0.0

    print(f"{'app':<32}{'time':>10}  {'counted as':<12} source")
    print("-" * 72)
    for entry in result.by_process:
        cat = category_of(entry.name)
        key = entry.name.strip().lower()
        if key in user:
            source = "you tagged it"
        elif is_tagged(entry.name):
            # Deliberately categorised by the seed list. Must be checked by
            # membership, not by comparing against DEFAULT_CATEGORY — an app
            # the seed list intentionally calls "mixed" (chrome) is
            # indistinguishable from an untagged one that way.
            source = "built in"
        else:
            source = "UNTAGGED"
            untagged_secs += entry.secs
        print(f"{entry.name:<32}{_fmt(entry.secs):>10}  {cat:<12} {source}")

    if untagged_secs > 0:
        share = untagged_secs / result.total_active_secs
        print()
        print(f"{_fmt(untagged_secs)} ({share:.0%} of your time) is in untagged apps.")
        print("Those count toward your total but not toward Fragments, Bedrock or Core.")
        print("Tag the ones that are real work:")
        print("  python -m engine.apps set <app> focus")
    return 0


def cmd_set(args: argparse.Namespace) -> int:
    save_user_category(args.process, args.category)
    print(f"{args.process} is now counted as {args.category}")
    print(f"  saved to {USER_CATEGORIES_PATH}")
    print("  re-export to see it: python -m engine.export --source real")
    return 0


def cmd_clear(args: argparse.Namespace) -> int:
    save_user_category(args.process, None)
    print(f"{args.process} is back to the built-in default")
    return 0


def cmd_show(args: argparse.Namespace) -> int:
    user = load_user_categories()
    if not user:
        print("You have not tagged any apps yet.")
        return 0
    print(f"{USER_CATEGORIES_PATH}\n")
    for name, cat in sorted(user.items()):
        print(f"  {name:<32} {cat}")
    return 0


def main() -> int:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--db", default=str(DEFAULT_DB), help=f"default: {DEFAULT_DB}")

    parser = argparse.ArgumentParser(prog="engine.apps", description=__doc__, parents=[common])
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser(
        "list", help="apps you use, and how each is counted", parents=[common]
    ).set_defaults(func=cmd_list)

    set_p = sub.add_parser("set", help="tag an app", parents=[common])
    set_p.add_argument("process", help="executable name, e.g. OneNote.exe")
    set_p.add_argument("category", choices=VALID_CATEGORIES)
    set_p.set_defaults(func=cmd_set)

    clear_p = sub.add_parser("clear", help="remove your tag for an app", parents=[common])
    clear_p.add_argument("process")
    clear_p.set_defaults(func=cmd_clear)

    sub.add_parser("show", help="tags you have set", parents=[common]).set_defaults(
        func=cmd_show
    )

    args = parser.parse_args()
    return int(args.func(args) or 0)


if __name__ == "__main__":
    raise SystemExit(main())
