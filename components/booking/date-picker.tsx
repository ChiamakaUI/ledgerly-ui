"use client";

import { useMemo } from "react";
import { cn, isSameDay, nextDays } from "@/lib";

interface DatePickerProps {
  selected: Date;
  onSelect: (d: Date) => void;
  timezone?: string;
  days?: number;
}

export function DatePicker({
  selected,
  onSelect,
  timezone,
  days = 14,
}: DatePickerProps) {
  const dates = useMemo(() => nextDays(days), [days]);

  return (
    <div
      role="radiogroup"
      aria-label="Select a date"
      className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none snap-x"
    >
      {dates.map((d) => {
        const active = isSameDay(d, selected);
        const weekday = d.toLocaleDateString("en-US", {
          weekday: "short",
          timeZone: timezone,
        });
        const day = d.toLocaleDateString("en-US", {
          day: "numeric",
          timeZone: timezone,
        });
        const month = d.toLocaleDateString("en-US", {
          month: "short",
          timeZone: timezone,
        });
        return (
          <button
            key={d.toISOString()}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(d)}
            className={cn(
              "shrink-0 snap-start flex flex-col items-center justify-center rounded-xl border transition-all",
              "min-w-[4.5rem] h-20 px-3",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-soft"
                : "border-border bg-card hover:border-foreground/30",
            )}
          >
            <span
              className={cn(
                "text-[10px] font-mono uppercase tracking-widest",
                active ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {weekday}
            </span>
            <span
              className={cn("font-display text-2xl leading-none mt-1 tabular")}
            >
              {day}
            </span>
            <span
              className={cn(
                "text-[10px] font-mono uppercase tracking-widest mt-1",
                active ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {month}
            </span>
          </button>
        );
      })}
    </div>
  );
}





