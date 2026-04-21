"use client";

import * as React from "react";
import type { Slot } from "@/types";
import { formatTime, cn } from "@/lib";

interface SlotGridProps {
  slots: Slot[];
  selected: Slot | null;
  onSelect: (slot: Slot) => void;
  timezone?: string;
  loading?: boolean;
}

export function SlotGrid({
  slots,
  selected,
  onSelect,
  timezone,
  loading,
}: SlotGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-xl bg-muted/60 animate-pulse"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <p className="font-display text-lg text-muted-foreground">
          No slots on this day.
        </p>
        <p className="text-sm text-muted-foreground/80 mt-1">
          Try another date — the host might not be available today.
        </p>
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Available time slots"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
    >
      {slots.map((s) => {
        const disabled = !s.available;
        const isSelected =
          selected?.startTime === s.startTime && !disabled;
        return (
          <button
            key={s.startTime}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelect(s)}
            className={cn(
              "group relative h-12 rounded-xl border text-sm font-medium transition-all tabular",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              disabled
                ? "border-border/50 bg-muted/30 text-muted-foreground/50 cursor-not-allowed line-through"
                : isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-soft"
                  : "border-border bg-card hover:border-foreground/40 hover:-translate-y-0.5",
            )}
          >
            {formatTime(s.startTime, timezone)}
          </button>
        );
      })}
    </div>
  );
}
