"""Fixture builders for hand-built, deterministic event timelines. Nothing
here uses randomization — every test pins down an exact scenario."""

from __future__ import annotations

from engine.categorize import make_category_lookup
from engine.types import Category

DEFAULT_CATEGORY_OF = make_category_lookup(
    {
        "Code.exe": "focus",
        "WindowsTerminal.exe": "focus",
        "chrome.exe": "mixed",
        "slack.exe": "comms",
        "Discord.exe": "comms",
        "Spotify.exe": "background",
    }
)


def mk_key(ts: float) -> float:
    return ts


def mk_mouse(ts: float) -> float:
    return ts


def mk_window(ts: float, process: str | None) -> tuple[float, str | None]:
    return (ts, process)


def dense_input(t0: float, t1: float, step: float = 2.0) -> list[float]:
    """A run of evenly-spaced timestamps from t0 to t1, used to simulate
    "the user was actively typing/clicking throughout this span" without
    needing a real idle-gap calculation per test."""
    out = []
    t = t0
    while t <= t1:
        out.append(t)
        t += step
    return out
