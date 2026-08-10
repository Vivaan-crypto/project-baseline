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

  // Day one for a real user, and the first thing they'll ever see here.
  // It used to say "generate one with engine.export", which is the wrong
  // advice: exporting an empty database just produces another empty file.
  // What they actually need is to start capturing.
  if (DATA.days.length === 0) {
    return (
      <section className="border-[3px] border-border bg-card px-6 py-10 shadow-[var(--shadow-lg)] sm:px-10">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Nothing here yet.
        </h2>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
          Baseline has not seen you work yet. Start the collector and this
          fills in on its own.
        </p>
        <pre className="mt-6 overflow-x-auto border-[3px] border-border bg-background p-4 font-mono text-[13px]">
          npm run collect
        </pre>
        <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted">
          Give it an hour before the numbers say much, and a couple of weeks
          before they can tell you what is normal for you.
        </p>
      </section>
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
            tier={FEATURES.fragments.tier}
          >
            <Fragments day={day} bare />
          </Disclosure>

          <Disclosure
            question={FEATURES.activity.question}
            label={FEATURES.activity.name}
            tier={FEATURES.activity.tier}
          >
            <Activity day={day} bare />
          </Disclosure>

          <Disclosure
            question={FEATURES.bedrock.question}
            label={FEATURES.bedrock.name}
            tier={FEATURES.bedrock.tier}
          >
            <Bedrock day={day} bare />
          </Disclosure>

          <Disclosure
            question={FEATURES.residue.question}
            label={FEATURES.residue.name}
            tier={FEATURES.residue.tier}
          >
            <Residue day={day} bare />
          </Disclosure>

          <Disclosure
            question={FEATURES.rhythm.question}
            label={FEATURES.rhythm.name}
            tier={FEATURES.rhythm.tier}
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
