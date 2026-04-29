"use client";

import { useState, FormEvent } from "react";
import { ArrowRight, X } from "lucide-react";
import type { CreateSessionRequest } from "@/types";
import { Button, Input, Label, useToast } from "@/components";
import { createSession, ApiError } from "@/lib";

const DURATIONS = [30, 45, 60, 90, 120];

type CreateSessionFormProps = {
  hostSlug: string;
  walletAddress: string;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateSessionForm({
  hostSlug,
  walletAddress,
  onClose,
  onCreated,
}: CreateSessionFormProps) {
  const { show } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("14:00");
  const [duration, setDuration] = useState(60);
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rateUsdc, setRateUsdc] = useState("");

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required.";
    if (title.length > 200) errs.title = "Title is too long (max 200 chars).";
    if (!date) errs.date = "Date is required.";
    if (!time) errs.time = "Time is required.";
    const scheduled = new Date(`${date}T${time}:00`);
    if (Number.isNaN(scheduled.getTime())) {
      errs.date = "Invalid date/time.";
    } else if (scheduled.getTime() <= Date.now()) {
      errs.date = "Session must be in the future.";
    }
    if (maxParticipants < 2) errs.maxParticipants = "At least 2 participants.";
    if (maxParticipants > 100) errs.maxParticipants = "Max 100 participants.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
      const data: CreateSessionRequest = {
        hostSlug,
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt,
        durationMinutes: duration,
        maxParticipants,
        sessionType: "group",
        rate: rateUsdc.trim()
          ? Math.round(Number(rateUsdc) * 1_000_000)
          : undefined,
      };
      await createSession(walletAddress, data);
      show({
        kind: "success",
        title: "Session created",
        description: `${title.trim()} is now open for bookings.`,
      });
      onCreated();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not create session.";
      show({
        kind: "error",
        title: "Could not create session",
        description: msg,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full my-8">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
              / New session
            </p>
            <h2 className="font-display text-2xl tracking-tight">
              Schedule a group call
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          <div className="space-y-1.5">
            <Label htmlFor="s-title">Title</Label>
            <Input
              id="s-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Solana Workshop: Building escrows"
              disabled={submitting}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-desc">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <textarea
              id="s-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={submitting}
              placeholder="What will attendees learn?"
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-date">Date</Label>
              <Input
                id="s-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={submitting}
                aria-invalid={!!errors.date}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-time">Time</Label>
              <Input
                id="s-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={submitting}
                aria-invalid={!!errors.time}
              />
              {errors.time && (
                <p className="text-xs text-destructive">{errors.time}</p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-duration">Duration</Label>
              <select
                id="s-duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                disabled={submitting}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} minutes
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-max">Max participants</Label>
              <Input
                id="s-max"
                type="number"
                min="2"
                max="100"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                disabled={submitting}
                aria-invalid={!!errors.maxParticipants}
                className="font-mono tabular"
              />
              {errors.maxParticipants && (
                <p className="text-xs text-destructive">
                  {errors.maxParticipants}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-rate">
              Custom rate (USDC){" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="s-rate"
              type="number"
              step="0.5"
              min="0"
              value={rateUsdc}
              onChange={(e) => setRateUsdc(e.target.value)}
              disabled={submitting}
              placeholder="Leave blank to use your default rate"
              className="font-mono tabular"
            />
            <p className="text-xs text-muted-foreground">
              Charge a different rate for this session — useful for
              masterclasses or special events.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? (
                "Creating…"
              ) : (
                <>
                  Create session
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
