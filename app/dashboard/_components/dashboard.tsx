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
    <div className="space-y-7">
      <DayPicker days={DATA.days} selected={selected} onSelect={setSelected} />

      <Verdict day={day} all={DATA.days} />

      <Trace day={day} />

      <KeyNumbers day={day} all={DATA.days} />

      <div className="pt-4">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">More detail</h2>
        <div className="space-y-4">
          <Disclosure
            question={FEATURES.fragments.question}
            label={FEATURES.fragments.name}
          >
            <Fragments day={day} bare />
          </Disclosure>

          <Disclosure
            question={FEATURES.activity.question}
            label={FEATURES.activity.name}
          >
            <Activity day={day} bare />
          </Disclosure>

          <Disclosure
            question={FEATURES.bedrock.question}
            label={FEATURES.bedrock.name}
          >
            <Bedrock day={day} bare />
          </Disclosure>

          <Disclosure
            question={FEATURES.residue.question}
            label={FEATURES.residue.name}
          >
            <Residue day={day} bare />
          </Disclosure>

          <Disclosure
            question={FEATURES.rhythm.question}
            label={FEATURES.rhythm.name}
          >
            <Rhythm
              rhythm={DATA.rhythm}
              highlightWeekday={day.weekday}
              dayCount={DATA.days.length}
              bare
            />
          </Disclosure>

          {/* Tuning is developer tooling, not a feature. It used to sit at
              the same level as the day's numbers, which made the whole page
              read like a control panel. */}
          <Disclosure
            question="Change how this is measured"
            label="Tuning"
          >
            <Thresholds date={day.date} bare />
          </Disclosure>
        </div>
      </div>
    </div>
  );
}
