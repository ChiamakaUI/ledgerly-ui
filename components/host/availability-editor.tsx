"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { AvailabilityRule } from "@/types";
import { Button, Input, Switch } from "@/components";
import { cn } from "@/lib";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface Range {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

interface DayState {
  active: boolean;
  ranges: Range[];
}

interface AvailabilityEditorProps {
  initial: AvailabilityRule[];
  onChange?: (days: AvailabilityRule[]) => void;
}

function hhmm(t: string): string {
  return t.slice(0, 5); // "09:00:00" -> "09:00"
}

function toApi(state: Record<number, DayState>): AvailabilityRule[] {
  const out: AvailabilityRule[] = [];
  for (const [dow, d] of Object.entries(state)) {
    if (!d.active) continue;
    for (const r of d.ranges) {
      out.push({
        dayOfWeek: Number(dow),
        startTime: `${r.startTime}:00`,
        endTime: `${r.endTime}:00`,
      });
    }
  }
  return out;
}

export function AvailabilityEditor({
  initial,
  onChange,
}: AvailabilityEditorProps) {
  const [state, setState] = useState<Record<number, DayState>>(() => {
    const s: Record<number, DayState> = {};
    for (let i = 0; i < 7; i++) {
      const ranges = initial
        .filter((a) => a.dayOfWeek === i)
        .map((a) => ({
          startTime: hhmm(a.startTime),
          endTime: hhmm(a.endTime),
        }));
      s[i] = {
        active: ranges.length > 0,
        ranges:
          ranges.length > 0
            ? ranges
            : [{ startTime: "09:00", endTime: "17:00" }],
      };
    }
    return s;
  });

  const update = (next: Record<number, DayState>) => {
    setState(next);
    onChange?.(toApi(next));
  };

  const toggleDay = (dow: number, active: boolean) => {
    update({ ...state, [dow]: { ...state[dow], active } });
  };

  const updateRange = (
    dow: number,
    idx: number,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    const ranges = state[dow].ranges.map((r, i) =>
      i === idx ? { ...r, [field]: value } : r,
    );
    update({ ...state, [dow]: { ...state[dow], ranges } });
  };

  const addRange = (dow: number) => {
    update({
      ...state,
      [dow]: {
        ...state[dow],
        ranges: [
          ...state[dow].ranges,
          { startTime: "13:00", endTime: "17:00" },
        ],
      },
    });
  };

  const removeRange = (dow: number, idx: number) => {
    const ranges = state[dow].ranges.filter((_, i) => i !== idx);
    update({
      ...state,
      [dow]: {
        ...state[dow],
        ranges:
          ranges.length > 0
            ? ranges
            : [{ startTime: "09:00", endTime: "17:00" }],
        active: ranges.length > 0,
      },
    });
  };

  return (
    <div className="space-y-3">
      {Array.from({ length: 7 }).map((_, i) => {
        // Start the week on Monday — more natural for work calendars.
        const dow = (i + 1) % 7;
        const d = state[dow];
        return (
          <DayRow
            key={dow}
            label={DAY_LABELS[dow]}
            active={d.active}
            ranges={d.ranges}
            onToggle={(v) => toggleDay(dow, v)}
            onRangeChange={(idx, field, value) =>
              updateRange(dow, idx, field, value)
            }
            onAddRange={() => addRange(dow)}
            onRemoveRange={(idx) => removeRange(dow, idx)}
          />
        );
      })}
    </div>
  );
}

function DayRow({
  label,
  active,
  ranges,
  onToggle,
  onRangeChange,
  onAddRange,
  onRemoveRange,
}: {
  label: string;
  active: boolean;
  ranges: Range[];
  onToggle: (v: boolean) => void;
  onRangeChange: (
    idx: number,
    field: "startTime" | "endTime",
    value: string,
  ) => void;
  onAddRange: () => void;
  onRemoveRange: (idx: number) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border p-4 transition-colors",
        active ? "bg-card" : "bg-muted/30",
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Switch checked={active} onCheckedChange={onToggle} />
          <span
            className={cn(
              "font-display text-xl tracking-tight w-14",
              !active && "text-muted-foreground",
            )}
          >
            {label}
          </span>
        </div>

        {!active ? (
          <span className="text-sm text-muted-foreground">Unavailable</span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddRange}
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add range
          </Button>
        )}
      </div>

      {active && (
        <div className="mt-3 space-y-2">
          {ranges.map((r, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                type="time"
                value={r.startTime}
                onChange={(e) =>
                  onRangeChange(idx, "startTime", e.target.value)
                }
                className="font-mono tabular max-w-[140px]"
              />
              <span className="text-muted-foreground text-sm">—</span>
              <Input
                type="time"
                value={r.endTime}
                onChange={(e) => onRangeChange(idx, "endTime", e.target.value)}
                className="font-mono tabular max-w-[140px]"
              />
              {ranges.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveRange(idx)}
                  className="p-1.5 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label="Remove range"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}