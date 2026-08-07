"use client";

import { useState } from "react";
import { DATA } from "@/app/dashboard/_lib/data";
import { Activity } from "./activity";
import { Bedrock } from "./bedrock";
import { DayPicker } from "./day-picker";
import { Fragments } from "./fragments";
import { Headline } from "./headline";
import { Residue } from "./residue";
import { Rhythm } from "./rhythm";
import { Thresholds } from "./thresholds";
import { Trace } from "./trace";

export function Dashboard() {
  // Opens on the most recent day, which is the one a real user would be
  // looking at. Days are sorted ascending by engine/export.py.
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

      <Headline day={day} all={DATA.days} />

      <Trace day={day} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Fragments day={day} />
        <Activity day={day} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bedrock day={day} />
        <Residue day={day} />
      </div>

      <Rhythm
        rhythm={DATA.rhythm}
        highlightWeekday={day.weekday}
        dayCount={DATA.days.length}
      />

      <Thresholds date={day.date} />
    </div>
  );
}
