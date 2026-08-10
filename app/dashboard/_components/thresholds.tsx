"use client";

import { useState } from "react";
import {
  DATA,
  fmtDuration,
  fmtPct,
  median,
  type SweepRow,
} from "@/app/dashboard/_lib/data";
import { Card, CardHead } from "./ui";

/**
 * Threshold tuning. AGENTS.md §8 requires every tunable threshold to be
 * visible and adjustable in the UI, and §12 requires each to state what it
 * means.
 *
 * Every number shown here was computed by engine/ during export, at each
 * value the slider can select (see engine/export.py's module docstring).
 * Nothing is recomputed in TypeScript — that would create a second
 * implementation of Core and Fragments that could silently disagree with
 * the Python one, in a product whose entire pitch is that its numbers are
 * trustworthy. The cost is that sliders step through discrete swept values
 * instead of moving continuously, which is the right trade.
 */

/**
 * How much of the track sits left of the thumb. Read by the .range rules in
 * globals.css as a hard gradient stop.
 *
 * A single-value slider would divide by zero, so it pins to full instead:
 * one option means the choice is already made.
 */
function fillStyle(index: number, count: number): React.CSSProperties {
  const pct = count <= 1 ? 100 : (index / (count - 1)) * 100;
  return { "--pct": `${pct}%` } as React.CSSProperties;
}

type Metric = keyof Pick<
  SweepRow,
  "fragmentsCount" | "bedrockMin" | "corePct" | "activeSecs"
>;

const METRICS: Array<{ key: Metric; label: string; fmt: (v: number) => string }> = [
  { key: "fragmentsCount", label: "Fragments", fmt: (v) => String(Math.round(v)) },
  { key: "bedrockMin", label: "Bedrock", fmt: (v) => fmtDuration(v * 60) },
  { key: "corePct", label: "Core", fmt: (v) => fmtPct(v) },
  { key: "activeSecs", label: "Active", fmt: (v) => fmtDuration(v) },
];

export function Thresholds({
  date,
  bare = false,
}: {
  date: string;
  bare?: boolean;
}) {
  const body = (
    <>
      <p className="border-b-[3px] border-border px-6 py-4 text-[14px] leading-relaxed text-muted">
        These decide how the numbers above get worked out. Drag one and watch
        how much it moves things.
      </p>
      <div className="divide-y-[3px] divide-border">
        <RebuildSlider
          name="Idle gap"
          unit="s"
          description="Go this long without touching anything and you count as away, which ends the block. Nobody ever picked a value for this one, so 300s is a guess."
          values={DATA.sweepValues.idleGap}
          defaultValue={DATA.config.idleGapSecs}
          sweep={DATA.sweeps.idleGap}
          date={date}
        />
        <RebuildSlider
          name="Switch tolerance"
          unit="s"
          description="Pop into another app for less than this and it does not break your block. Also the shortest thing Residue will treat as an interruption."
          values={DATA.sweepValues.switchTolerance}
          defaultValue={DATA.config.switchToleranceSecs}
          sweep={DATA.sweeps.switchTolerance}
          date={date}
        />
        <CoreSlider date={date} />
      </div>
    </>
  );

  if (bare) return body;

  return (
    <Card>
      <CardHead label="Tuning" />
      {body}
    </Card>
  );
}

/** Thresholds that change blocks() itself, so every feature moves with them. */
function RebuildSlider({
  name,
  unit,
  description,
  values,
  defaultValue,
  sweep,
  date,
}: {
  name: string;
  unit: string;
  description: string;
  values: number[];
  defaultValue: number;
  sweep: Record<string, Record<string, SweepRow>>;
  date: string;
}) {
  const defaultIndex = Math.max(0, values.indexOf(defaultValue));
  const [index, setIndex] = useState(defaultIndex);
  const value = values[index];
  const row = sweep[String(value)]?.[date];

  return (
    <div className="p-6">
      <Head
        name={name}
        value={`${value}${unit}`}
        isDefault={value === defaultValue}
        defaultLabel={`${defaultValue}${unit}`}
        description={description}
      />

      <input
        type="range"
        min={0}
        max={values.length - 1}
        step={1}
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
        aria-label={`${name}, currently ${value}${unit}`}
        className="range mt-5"
        style={fillStyle(index, values.length)}
      />
      <div className="mt-2 flex justify-between font-mono text-[11px] text-muted">
        {values.map((v, i) => (
          <span key={v} className={i === index ? "font-bold text-foreground" : ""}>
            {v}
          </span>
        ))}
      </div>

      {row ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {METRICS.map((metric) => {
            const series = values.map(
              (v) => (sweep[String(v)]?.[date]?.[metric.key] as number) ?? 0,
            );
            return (
              <MetricReadout
                key={metric.key}
                label={metric.label}
                value={metric.fmt((row[metric.key] as number) ?? 0)}
                series={series}
                activeIndex={index}
              />
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-[12px] italic text-muted">
          Nothing to show for this day at this setting.
        </p>
      )}
    </div>
  );
}

/** Core's threshold only re-reduces existing blocks, so it sweeps cheaply
 *  and affects exactly one number. */
function CoreSlider({ date }: { date: string }) {
  const values = DATA.sweepValues.coreMinutes;
  const defaultIndex = Math.max(0, values.indexOf(DATA.config.coreMinutes));
  const [index, setIndex] = useState(defaultIndex);
  const value = values[index];
  const series = values.map((v) => DATA.sweeps.coreMinutes[String(v)]?.[date] ?? 0);
  const pct = DATA.sweeps.coreMinutes[String(value)]?.[date] ?? null;

  return (
    <div className="p-6">
      <Head
        name="Core block length"
        value={`${value}m`}
        isDefault={value === DATA.config.coreMinutes}
        defaultLabel={`${DATA.config.coreMinutes}m`}
        description="How long a run has to be before it counts as solid focus. This only moves the Core number, not the blocks themselves."
      />

      <input
        type="range"
        min={0}
        max={values.length - 1}
        step={1}
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
        aria-label={`Core block length, currently ${value} minutes`}
        className="range mt-5"
        style={fillStyle(index, values.length)}
      />
      <div className="mt-2 flex justify-between font-mono text-[11px] text-muted">
        {values.map((v, i) => (
          <span key={v} className={i === index ? "font-bold text-foreground" : ""}>
            {v}
          </span>
        ))}
      </div>

      <div className="mt-3 max-w-[12rem]">
        <MetricReadout
          label="Core"
          value={fmtPct(pct)}
          series={series}
          activeIndex={index}
        />
      </div>
    </div>
  );
}

function Head({
  name,
  value,
  isDefault,
  defaultLabel,
  description,
}: {
  name: string;
  value: string;
  isDefault: boolean;
  defaultLabel: string;
  description: string;
}) {
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[17px] font-bold tracking-tight">{name}</h3>
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-lg font-bold tabular-nums">{value}</span>
          {isDefault ? (
            <span className="border-2 border-border px-1.5 font-mono text-[9px] uppercase text-muted">
              default
            </span>
          ) : (
            <span className="font-mono text-[9px] text-muted">
              default {defaultLabel}
            </span>
          )}
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">{description}</p>
    </>
  );
}

/** Value plus the shape of that value across the whole sweep, so the effect
 *  of moving the slider is visible without dragging it back and forth. */
function MetricReadout({
  label,
  value,
  series,
  activeIndex,
}: {
  label: string;
  value: string;
  series: number[];
  activeIndex: number;
}) {
  const max = Math.max(...series, 1);
  const med = median(series);
  return (
    <div className="border-[3px] border-border p-2">
      <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="font-mono text-base font-bold tabular-nums">{value}</p>
      <div
        className="mt-1.5 flex h-6 items-end gap-px"
        title={`Across every swept value. Median ${med === null ? "—" : Math.round(med)}.`}
      >
        {series.map((v, i) => (
          <div
            key={i}
            className="flex-1"
            style={{
              height: `${Math.max(4, (v / max) * 100)}%`,
              backgroundColor:
                i === activeIndex ? "var(--cobalt)" : "var(--muted)",
              opacity: i === activeIndex ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}
