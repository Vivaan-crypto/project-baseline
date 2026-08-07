"use client";

import { useEffect, useRef } from "react";
import { fmtDate, type Day } from "@/app/dashboard/_lib/data";

/**
 * The day strip. Each day carries a bar showing its active hours, so the
 * shape of the month is visible before clicking into anything — light days
 * and heavy days are findable rather than requiring a hunt.
 */
export function DayPicker({
  days,
  selected,
  onSelect,
}: {
  days: Day[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const maxActive = Math.max(...days.map((d) => d.activeSecs), 1);

  // Arrow keys move between days from anywhere on the page — but not while
  // the user is inside a form control, where left/right belong to the
  // control itself (the threshold sliders are exactly that case).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      const next = selected + (event.key === "ArrowRight" ? 1 : -1);
      if (next >= 0 && next < days.length) onSelect(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, days.length, onSelect]);

  // Keep the selected day in view when it changes by keyboard.
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>(
      `[data-index="${selected}"]`,
    );
    el?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selected]);

  return (
    <div className="border-[3px] border-border bg-card shadow-[var(--shadow-sm)]">
      <div className="flex items-baseline justify-between gap-3 border-b-[3px] border-border px-4 py-2">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]">
          {fmtDate(days[selected].date)}
        </h2>
        <span className="font-mono text-[10px] text-muted">
          ← → to move · {days.length} days
        </span>
      </div>

      <div ref={scroller} className="flex gap-px overflow-x-auto p-2">
        {days.map((day, index) => {
          const isSelected = index === selected;
          return (
            <button
              key={day.date}
              data-index={index}
              type="button"
              onClick={() => onSelect(index)}
              aria-current={isSelected ? "true" : undefined}
              title={`${fmtDate(day.date)} — ${day.fragments.count} fragments`}
              className={`flex w-11 shrink-0 flex-col items-center gap-1 border-2 px-1 py-1.5 ${
                isSelected
                  ? "border-border bg-lime text-on-lime"
                  : "border-transparent hover:border-border"
              }`}
            >
              <span className="font-mono text-[9px] uppercase opacity-70">
                {day.weekday}
              </span>
              <span className="font-mono text-[11px] font-bold tabular-nums">
                {day.date.slice(8)}
              </span>
              <span className="flex h-8 w-full items-end">
                <span
                  className="w-full"
                  style={{
                    height: `${Math.max(6, (day.activeSecs / maxActive) * 100)}%`,
                    backgroundColor: isSelected
                      ? "var(--on-lime)"
                      : "var(--cat-focus)",
                  }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
