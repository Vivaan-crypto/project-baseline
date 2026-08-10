"use client";

import { useState } from "react";
import { DATA, FEATURES } from "@/app/dashboard/_lib/data";
import { Activity } from "./activity";
import { Bedrock } from "./bedrock";
import { DayPicker } from "./day-picker";
import { Disclosure } from "./disclosure";
import { Fragments } from "./fragments";
import { KeyNumbers } from "./key-numbers";
import { Residue } from "./residue";
import { Rhythm } from "./rhythm";
import { Thresholds } from "./thresholds";
import { Trace } from "./trace";
import { Verdict } from "./verdict";

/**
 * Ordered by how quickly each thing pays for the attention it costs:
 *
 *   1. the day in a sentence      — readable in two seconds
 *   2. the day as a picture       — readable in five
 *   3. three numbers              — readable in ten
 *   4. everything else, collapsed — only if you actually want it
 *
 * The previous version put seven equal-weight panels on screen at once and
 * left the reader to work out which mattered. Density wasn't the problem;
 * the absence of a hierarchy was.
 */
export function Dashboard() {
  const [selected, setSelected] = useState(DATA.days.length - 1);

  if (DATA.days.length === 0) {
    return (
      <p className="border-[3px] border-border bg-card p-6 text-sm">
        No days in the snapshot. Generate one with{" "}
        <code className="font-mono">python -m engine.export</code>.
      </p>
    );
  }

  const day = DATA.days[selected];

  return (
    <div className="space-y-4">
      <DayPicker days={DATA.days} selected={selected} onSelect={setSelected} />

      <Verdict day={day} all={DATA.days} />

      <Trace day={day} />

      <KeyNumbers day={day} all={DATA.days} />

      <div className="pt-2">
        <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          If you want to dig in
        </h2>
        <div className="space-y-3">
          <Disclosure
            question={FEATURES.fragments.question}
            label={`${FEATURES.fragments.name} · ${FEATURES.fragments.plain}`}
          >
            <Fragments day={day} bare />
          </Disclosure>

          <Disclosure
            question={FEATURES.activity.question}
            label={`${FEATURES.activity.name} · ${FEATURES.activity.plain}`}
          >
            <Activity day={day} bare />
          </Disclosure>

          <Disclosure
            question={FEATURES.bedrock.question}
            label={`${FEATURES.bedrock.name} · ${FEATURES.bedrock.plain}`}
          >
            <Bedrock day={day} bare />
          </Disclosure>

          <Disclosure
            question={FEATURES.residue.question}
            label={`${FEATURES.residue.name} · ${FEATURES.residue.plain}`}
          >
            <Residue day={day} bare />
          </Disclosure>

          <Disclosure
            question={FEATURES.rhythm.question}
            label={`${FEATURES.rhythm.name} · ${FEATURES.rhythm.plain}`}
          >
            <Rhythm
              rhythm={DATA.rhythm}
              highlightWeekday={day.weekday}
              dayCount={DATA.days.length}
              bare
            />
          </Disclosure>

          {/*
            Tuning is developer tooling, not a feature. It previously sat at
            the same visual level as the day's actual numbers, which made the
            page read like a control panel rather than an answer.
          */}
          <Disclosure
            question="Is the engine measuring this the way you'd measure it?"
            label="Tuning · thresholds that change every number above"
          >
            <Thresholds date={day.date} bare />
          </Disclosure>
        </div>
      </div>
    </div>
  );
}
