"""
Synthetic collector data for a working programmer.

Generates a DB matching collector.py's schema so dashboard.py runs against it
unmodified. Use for UI development only — never on the landing page.

    python mockgen.py                      # 30 days → mock_events.db
    python mockgen.py --days 45 --seed 7

Model:
  - Weekday shape: morning peak, post-lunch trough, late-afternoon second wind
  - Meetings midday, Tue/Thu heavier
  - Weekends sporadic and lighter
  - Occasional late-night sessions
  - ~15% of days are "off" days with degraded rhythm: shorter blocks, higher
    inter-key variance, more corrections, more switching
"""

import argparse
import math
import random
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

APPS = {
    "Code.exe": "focus",
    "WindowsTerminal.exe": "focus",
    "pycharm64.exe": "focus",
    "Obsidian.exe": "focus",
    "chrome.exe": "mixed",
    "slack.exe": "comms",
    "Discord.exe": "comms",
    "Teams.exe": "comms",
    "Spotify.exe": "background",
}

DEEP = ["Code.exe", "WindowsTerminal.exe", "pycharm64.exe"]
INTERRUPT = ["slack.exe", "Discord.exe", "Teams.exe"]
BROWSE = ["chrome.exe"]

TITLES = {
    "Code.exe": ["collector.py — baseline", "engine.py — baseline",
                 "schema.sql — baseline", "page.tsx — site"],
    "WindowsTerminal.exe": ["pwsh", "wsl", "git log"],
    "pycharm64.exe": ["features.py", "test_rollup.py"],
    "chrome.exe": ["Stack Overflow", "SQLite docs", "GitHub", "Hacker News",
                   "YouTube", "Next.js docs"],
    "slack.exe": ["Slack | general"],
    "Discord.exe": ["Discord | #dev"],
    "Teams.exe": ["Teams | standup"],
    "Obsidian.exe": ["notes"],
    "Spotify.exe": ["Spotify"],
}


def hour_intensity(hour, weekday, off_day):
    """Probability-weighted activity level for a given hour. 0 = nothing."""
    if weekday >= 5:  # weekend
        if hour < 11 or hour > 23:
            return 0.0
        base = 0.35 * math.exp(-((hour - 15) ** 2) / 28)
        return base if random.random() < 0.55 else 0.0

    if hour < 8 or hour > 23:
        return 0.0

    # morning peak ~10:30, trough ~14, second wind ~16:30
    morning = 1.00 * math.exp(-((hour - 10.5) ** 2) / 6.5)
    afternoon = 0.72 * math.exp(-((hour - 16.5) ** 2) / 7.0)
    evening = 0.30 * math.exp(-((hour - 21) ** 2) / 5.0) if random.random() < 0.4 else 0.0

    v = max(morning, afternoon, evening)
    if off_day:
        v *= 0.72
    return v if v > 0.08 else 0.0


def gen_day(day, off_day, keys, mouse, windows):
    weekday = day.weekday()
    has_standup = weekday < 5 and random.random() < 0.8
    meeting_hours = set()
    if weekday in (1, 3) and random.random() < 0.7:
        meeting_hours.add(random.choice([13, 14, 15]))

    for hour in range(0, 24):
        intensity = hour_intensity(hour, weekday, off_day)
        if intensity <= 0:
            continue

        t = day.replace(hour=hour, minute=0, second=0, microsecond=0).timestamp()

        # standup and meetings displace deep work
        if has_standup and hour == 9:
            meeting_block(t + 600, 900, windows, keys, mouse)
        if hour in meeting_hours:
            meeting_block(t + random.randint(0, 1200), random.randint(1800, 3000),
                          windows, keys, mouse)

        cursor = t + random.uniform(0, 300)
        end = t + 3600 * min(intensity, 1.0)

        while cursor < end:
            r = random.random()
            if r < (0.30 if off_day else 0.14):
                cursor = interrupt_block(cursor, windows, keys, mouse, off_day)
            elif r < (0.55 if off_day else 0.34):
                cursor = browse_block(cursor, windows, keys, mouse, off_day)
            else:
                cursor = deep_block(cursor, windows, keys, mouse, off_day)


def typing_burst(start, n_keys, base_ikd, cv, corr_rate, keys):
    """Emit a burst of keystrokes with a target coefficient of variation."""
    t = start
    sigma = base_ikd * cv
    for _ in range(n_keys):
        gap = random.gauss(base_ikd, sigma)
        gap = max(0.025, min(gap, 1.4))
        t += gap
        r = random.random()
        if r < corr_rate:
            cls = "correction"
        elif r < corr_rate + 0.14:
            cls = "space"
        elif r < corr_rate + 0.17:
            cls = "enter"
        elif r < corr_rate + 0.24:
            cls = "modifier"
        elif r < corr_rate + 0.27:
            cls = "nav"
        else:
            cls = "char"
        keys.append((t, cls))
    return t


def deep_block(start, windows, keys, mouse, off_day):
    """Sustained work in an editor or terminal, with brief flicks away."""
    app = random.choice(DEEP)
    windows.append((start, app, random.choice(TITLES[app])))

    if off_day:
        dur = random.uniform(240, 900)      # 4–15 min, fragmented
        base_ikd = random.uniform(0.19, 0.26)
        cv = random.uniform(0.55, 0.85)     # rhythm falls apart
        corr = random.uniform(0.12, 0.18)
        think = 145                         # longer stalls
        flick_rate = 0.30
    else:
        dur = random.uniform(900, 3300)     # 15–55 min
        base_ikd = random.uniform(0.14, 0.19)
        cv = random.uniform(0.28, 0.45)
        corr = random.uniform(0.06, 0.11)
        think = 95
        flick_rate = 0.16

    t = start
    end = start + dur
    while t < end:
        n = random.randint(20, 110)
        t = typing_burst(t, n, base_ikd, cv, corr, keys)

        # read / think / consider. This dominates, not typing.
        pause = min(random.expovariate(1 / think), 240)
        for _ in range(random.randint(1, 6)):
            mouse.append((t + random.random() * pause, "move"))
        if random.random() < 0.55:
            mouse.append((t + random.random() * pause, "scroll"))
        t += pause

        # brief flick to docs or terminal, then back — under SWITCH_TOLERANCE
        # so it should NOT break the focus block
        if random.random() < flick_rate:
            side = random.choice(["chrome.exe", "WindowsTerminal.exe"])
            windows.append((t, side, random.choice(TITLES[side])))
            away = random.uniform(4, 18)
            mouse.append((t + away * 0.4, "scroll"))
            t += away
            windows.append((t, app, random.choice(TITLES[app])))

    return t


def browse_block(start, windows, keys, mouse, off_day):
    app = random.choice(BROWSE)
    windows.append((start, app, random.choice(TITLES[app])))
    dur = random.uniform(180, 1400 if off_day else 800)
    t = start
    end = start + dur
    while t < end:
        step = random.uniform(3, 20)
        t += step
        mouse.append((t, "scroll" if random.random() < 0.65 else "move"))
        if random.random() < 0.12:
            mouse.append((t + 0.2, "click"))
        if random.random() < 0.08:  # search box, comment
            t = typing_burst(t, random.randint(6, 28), 0.16, 0.45, 0.09, keys)
    return t


def interrupt_block(start, windows, keys, mouse, off_day):
    app = random.choice(INTERRUPT)
    windows.append((start, app, random.choice(TITLES[app])))
    dur = random.uniform(60, 420)
    t = start
    end = start + dur
    while t < end:
        # read first, then maybe reply
        t += random.uniform(10, 50)
        mouse.append((t, "scroll"))
        if random.random() < 0.45:
            t = typing_burst(t, random.randint(12, 55), 0.15, 0.42, 0.10, keys)
        mouse.append((t + 1, "click"))
    return t


def meeting_block(start, dur, windows, keys, mouse):
    """Camera on, very little input, occasional note-taking."""
    windows.append((start, "Teams.exe", "Teams | standup"))
    t = start
    end = start + dur
    while t < end:
        t += random.uniform(20, 120)
        if random.random() < 0.3:
            t = typing_burst(t, random.randint(10, 45), 0.18, 0.5, 0.08, keys)
        if random.random() < 0.4:
            mouse.append((t, "move"))
    windows.append((end, random.choice(DEEP), "back to work"))
    return end


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", default="mock_events.db")
    ap.add_argument("--off-rate", type=float, default=0.15,
                    help="fraction of days with degraded rhythm")
    args = ap.parse_args()

    random.seed(args.seed)

    keys, mouse, windows = [], [], []
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    off_days = []

    for i in range(args.days):
        day = today - timedelta(days=args.days - 1 - i)
        off = random.random() < args.off_rate
        if off:
            off_days.append(day.strftime("%Y-%m-%d"))
        gen_day(day, off, keys, mouse, windows)

    keys.sort()
    mouse.sort()
    windows.sort()

    path = Path(args.out)
    if path.exists():
        path.unlink()
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE keys (ts REAL NOT NULL, class TEXT NOT NULL)")
    conn.execute("CREATE TABLE mouse (ts REAL NOT NULL, kind TEXT NOT NULL)")
    conn.execute("CREATE TABLE windows (ts REAL NOT NULL, process TEXT, title TEXT)")
    conn.executemany("INSERT INTO keys VALUES (?,?)", keys)
    conn.executemany("INSERT INTO mouse VALUES (?,?)", mouse)
    conn.executemany("INSERT INTO windows VALUES (?,?,?)", windows)
    conn.commit()
    conn.close()

    print(f"{path}")
    print(f"  {len(keys):,} keys  {len(mouse):,} mouse  {len(windows):,} windows")
    print(f"  {args.days} days, {len(off_days)} degraded:")
    for d in off_days:
        print(f"    {d}")
    print("\nNotes file for these dates should rate the degraded days low.")


if __name__ == "__main__":
    main()
