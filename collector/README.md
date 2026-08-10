# collector/

Passive capture to a local SQLite database. AGPL and public, because this is
the component users have to audit rather than trust (AGENTS.md hard rule 7).

## Read this first

`classify.py` is the only code in the entire project that ever sees a
keystroke. It takes a key and returns one of six strings — `char`,
`correction`, `navigation`, `modifier`, `space`, `enter` — and the key itself
is never stored, logged, buffered, or passed on.

That guarantee is mechanised in `tests/collector/test_classify.py`, which
asserts over the whole printable ASCII range that no character survives
classification, and that `'a'`, `'7'` and `'$'` are indistinguishable
afterwards. If they weren't, keystroke classes would leak the shape of a
password.

## Quick start

```bash
pip install -r collector/requirements.txt
python -m collector doctor
```

`doctor` checks that keyboard hooks and Win32 window queries work on this
machine and prints the current foreground app. It captures nothing.

Then capture:

```bash
python -m collector run
```

Writes to `~/.baseline/events.db` (outside the repo, deliberately — event
data is personal and must never be near a git working tree). Ctrl+C to stop.

## Seeing your own numbers

```bash
python -m collector status                                   # what's captured so far
python -m engine.export --db ~/.baseline/events.db --source real
npm run dev                                                  # then open /dashboard
```

`--source real` drops the "Simulated data" badge. Nothing else changes:
`engine/` reads the same three tables whether they were written by this
collector or by `mock/mockgen.py`, which is exactly why the analysis code
needed no modification to go from synthetic to real.

Give it a full day before the numbers mean much, and 14 days before any
baseline comparison does (AGENTS.md §4).

## Flags worth knowing

| Flag | Effect |
|---|---|
| `--no-keys` | Records no keystrokes at all. Mouse and window activity still drive presence detection, so Trace, Activity, Fragments, Bedrock and Core all still work — only the typing-rhythm signal is missing. Good for a first look. |
| `--no-titles` | Drops window titles at the source. Titles are the most sensitive thing captured (a browser title carries the page, an editor title the filename) and `engine/` does not currently use them. |
| `--seconds N` | Bounded run, for verification. |
| `--db PATH` | Capture elsewhere. |

## What gets written

Exactly the schema `engine/db.py` reads:

```sql
keys    (ts REAL, class TEXT)      -- class only, never the character
mouse   (ts REAL, kind TEXT)       -- click / scroll / move
windows (ts REAL, process TEXT, title TEXT)
sessions(ts REAL, event TEXT)      -- start / stop / clock_jump
meta    (key TEXT, value TEXT)     -- schema_version, from day one
```

Mouse *moves* are throttled to one per second (`config.py`): they fire
hundreds of times a second and are only ever used as evidence a human is
present. Clicks and scrolls are never throttled — they are discrete
intentional acts whose timing carries information.

## Running it continuously

Task Scheduler, at logon:

```
Program:   pythonw.exe
Arguments: -m collector run
Start in:  C:\Github\project-baseline
```

`pythonw.exe` rather than `python.exe` so no console window appears. A PID
lock file prevents a scheduled instance and a manual one from both running —
duplicates would double every event, silently halving inter-key delays.

## Known limits

- **Windows only.** macOS is ~15 lines different (`NSWorkspace` via pyobjc)
  but blocked on notarization and the Input Monitoring permission flow. Do
  not start that without an explicit decision (AGENTS.md §4).
- **Elevated apps are invisible.** A process running as admin refuses to be
  opened by a non-elevated collector, so its span records as active time with
  an unknown app rather than being attributed. That is the correct failure —
  the time is real even when the label isn't available.
- **Antivirus may flag the keyboard hook.** A global hook is the same
  mechanism a keylogger uses; the difference is what happens to the key, which
  is why `classify.py` is small enough to read in one sitting.
