import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const USDC_DECIMALS = 6;

/**
 * Format a USDC minor-unit amount as a human-readable string.
 * Accepts either `number` (from the real API) or `string` (legacy / very large amounts).
 * e.g. formatUSDC(5000000) -> "5 USDC", formatUSDC("1500000") -> "1.5 USDC"
 */
export function formatUSDC(
  minor: number | string,
  opts: { symbol?: boolean } = {},
): string {
  const { symbol = true } = opts;
  const n = Number(minor) / 10 ** USDC_DECIMALS;
  const body = Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, "");
  return symbol ? `${body} USDC` : body;
}

/** Format a wallet address for display: "6WUN...E8fX". */
export function shortenAddress(addr: string | null | undefined, chars = 4): string {
  if (!addr) return "—";
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

/** Format a time like "2:30 PM" in the given timezone (or local). */
export function formatTime(iso: string, timezone?: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
}

/** Format a date like "Tue, Apr 22" in the given timezone (or local). */
export function formatShortDate(iso: string | Date, timezone?: string): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  });
}

/** Format a longer form: "Tuesday, April 22, 2026 · 2:30 PM WAT". */
export function formatFullDateTime(iso: string, timezone?: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  });
  return `${datePart} · ${timePart}`;
}

/** "in 3 hours", "in 2 days", "12 minutes ago". */
export function formatRelative(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const sign = diff >= 0 ? 1 : -1;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const MIN = 60_000;
  const HR = 60 * MIN;
  const DAY = 24 * HR;

  if (abs < HR) return rtf.format(sign * Math.round(abs / MIN), "minute");
  if (abs < DAY) return rtf.format(sign * Math.round(abs / HR), "hour");
  return rtf.format(sign * Math.round(abs / DAY), "day");
}

/** mm:ss remaining until the given iso (floors at 00:00). */
export function formatCountdown(iso: string): string {
  const remaining = Math.max(0, new Date(iso).getTime() - Date.now());
  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/** Yield the next `count` days starting from today as Date objects (UTC midnight). */
export function nextDays(count: number, start = new Date()): Date[] {
  const days: Date[] = [];
  const base = new Date(start);
  base.setUTCHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    days.push(d);
  }
  return days;
}

/** YYYY-MM-DD in UTC — the date key used by the slots API. */
export function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}