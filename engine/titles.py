"""Tag what you were doing inside an app, from the window title.

    python -m engine.titles list --db ~/.baseline/events.db
    python -m engine.titles set youtube background
    python -m engine.titles set "pull request" focus
    python -m engine.titles clear youtube
    python -m engine.titles show

Why this exists: `python -m engine.apps` can only say what a browser IS, and
a browser is a documentation reader and a television in the same minute.
A rule here matches a substring of the window title and overrides the app's
category for exactly the spans where it matched, so an hour of YouTube stops
counting as the same thing as an hour of Stack Overflow.

Rules live in ~/.baseline/titles.json, next to your event database.

`list` prints window titles, which are the most sensitive thing captured —
a browser title carries the page, an editor title the filename. It is the
one command here that reads your capture, and its output is not meant for a
screenshot or a bug report. Titles are truncated for width, not for privacy;
treat the whole listing as private.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from engine.blocks import segments as build_segments
from engine.categorize import make_category_lookup
from engine.db import read_events_titled
from engine.export import DEFAULT_DB
from engine.intent import (
    USER_TITLE_RULES_PATH,
    VALID_CATEGORIES,
    load_user_rules,
    make_intent_lookup,
    match_rule,
    rule_table,
    save_user_rule,
    title_seconds,
)

_TITLE_WIDTH = 52


def _fmt(secs: float) -> str:
    if secs < 60:
        return f"{secs:.0f}s"
    total = round(secs / 60)
    h, m = divmod(total, 60)
    return f"{m}m" if h == 0 else (f"{h}h" if m == 0 else f"{h}h {m}m")


def _clip(text: str, width: int = _TITLE_WIDTH) -> str:
    return text if len(text) <= width else text[: width - 1] + "…"


def cmd_list(args: argparse.Namespace) -> int:
    db = Path(args.db).expanduser()
    if not db.exists():
        print(f"{db} does not exist yet. Capture something first:")
        print("  python -m collector run")
        return 1

    keys_ts, mouse_ts, windows = read_events_titled(db)
    category_of = make_category_lookup()
    intent_of = make_intent_lookup()
    segs = build_segments(keys_ts, mouse_ts, windows, category_of, intent_of=intent_of)
    per_title = title_seconds(segs)

    if not per_title:
        print("No window titles in this capture.")
        print("Either nothing has been recorded yet, or it ran with --no-titles,")
        print("in which case title rules can't do anything and app tags are all")
        print("that matter: python -m engine.apps list --db <path>")
        return 0

    table = rule_table()
    matched: dict[str, float] = {}
    unmatched: list[tuple[str, float]] = []
    for title, secs in per_title.items():
        hit = match_rule(title, table)
        if hit is None:
            unmatched.append((title, secs))
        else:
            matched[hit[0]] = matched.get(hit[0], 0.0) + secs

    if matched:
        by_pattern = {pattern: (cat, src) for pattern, cat, src in table}
        print(f"{'rule':<24}{'time':>10}  {'counts as':<12} source")
        print("-" * 64)
        for pattern, secs in sorted(matched.items(), key=lambda kv: -kv[1]):
            cat, src = by_pattern[pattern]
            print(f"{_clip(pattern, 22):<24}{_fmt(secs):>10}  {cat:<12} {src}")
        print()

    unmatched.sort(key=lambda kv: -kv[1])
    if unmatched:
        total = sum(secs for _, secs in unmatched)
        print(f"no rule matched — {_fmt(total)}, counted by app alone:")
        for title, secs in unmatched[: args.top]:
            print(f"  {_clip(title):<{_TITLE_WIDTH}} {_fmt(secs):>8}")
        if len(unmatched) > args.top:
            print(f"  ... and {len(unmatched) - args.top} more")
        print()
        print("Write a rule for anything above that is really work, or really isn't:")
        print("  python -m engine.titles set <text from the title> focus")
    return 0


def cmd_set(args: argparse.Namespace) -> int:
    save_user_rule(args.pattern, args.category)
    print(f"titles containing {args.pattern!r} now count as {args.category}")
    print(f"  saved to {USER_TITLE_RULES_PATH}")
    print("  re-export to see it: python -m engine.export --source real")
    return 0


def cmd_clear(args: argparse.Namespace) -> int:
    save_user_rule(args.pattern, None)
    print(f"rule {args.pattern!r} removed")
    return 0


def cmd_show(args: argparse.Namespace) -> int:
    user = load_user_rules()
    if not user:
        print("You have not written any title rules yet.")
        print(f"The built-in ones still apply — see them with: python -m engine.titles rules")
        return 0
    print(USER_TITLE_RULES_PATH)
    print()
    for pattern, category in sorted(user.items()):
        print(f"  {pattern:<32} {category}")
    return 0


def cmd_rules(args: argparse.Namespace) -> int:
    """Every rule in the order they are tried. Precedence is the thing most
    worth being able to see rather than reason about."""
    for pattern, category, source in rule_table():
        print(f"  {pattern:<32} {category:<12} {source}")
    return 0


def main() -> int:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--db", default=str(DEFAULT_DB), help=f"default: {DEFAULT_DB}")

    parser = argparse.ArgumentParser(
        prog="engine.titles", description=__doc__, parents=[common]
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    list_p = sub.add_parser(
        "list", help="titles you spent time on, and how each is counted", parents=[common]
    )
    list_p.add_argument(
        "--top", type=int, default=15, help="how many unmatched titles to print"
    )
    list_p.set_defaults(func=cmd_list)

    set_p = sub.add_parser("set", help="add a title rule", parents=[common])
    set_p.add_argument("pattern", help="text to look for in the title, e.g. youtube")
    set_p.add_argument("category", choices=VALID_CATEGORIES)
    set_p.set_defaults(func=cmd_set)

    clear_p = sub.add_parser("clear", help="remove one of your rules", parents=[common])
    clear_p.add_argument("pattern")
    clear_p.set_defaults(func=cmd_clear)

    sub.add_parser("show", help="rules you have written", parents=[common]).set_defaults(
        func=cmd_show
    )
    sub.add_parser(
        "rules", help="every rule, in match order", parents=[common]
    ).set_defaults(func=cmd_rules)

    args = parser.parse_args()
    return int(args.func(args) or 0)


if __name__ == "__main__":
    raise SystemExit(main())
