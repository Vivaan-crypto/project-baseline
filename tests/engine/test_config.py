from __future__ import annotations

import pytest


def test_idle_gap_exceeds_switch_tolerance_assertion_fires():
    import engine.config as config_module

    # Confirm the guardrail actually fires, not just that the shipped
    # values happen to satisfy it.
    src = config_module.__file__
    code = open(src).read().replace(
        "assert IDLE_GAP > SWITCH_TOLERANCE",
        "assert IDLE_GAP > 999999",
    )
    with pytest.raises(AssertionError):
        exec(compile(code, src, "exec"), {})
