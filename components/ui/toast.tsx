"use client";

import * as React from "react";
import { Check, X, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  duration: number;
};

type ToastContextValue = {
  show: (t: Omit<Toast, "id" | "duration"> & { duration?: number }) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = React.useCallback<ToastContextValue["show"]>(
    (t) => {
      const id = Math.random().toString(36).slice(2);
      const duration = t.duration ?? 6000;
      setToasts((current) => [...current, { ...t, id, duration }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const icons: Record<ToastKind, React.ReactNode> = {
    success: <Check className="h-4 w-4" strokeWidth={2.5} />,
    error: <X className="h-4 w-4" strokeWidth={2.5} />,
    warning: <AlertTriangle className="h-4 w-4" strokeWidth={2.5} />,
    info: <Info className="h-4 w-4" strokeWidth={2.5} />,
  };

  const kindStyles: Record<ToastKind, string> = {
    success: "border-success/30 bg-success/10 text-success",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    warning: "border-warning/40 bg-warning/10 text-warning-foreground",
    info: "border-border bg-card text-foreground",
  };

  return (
    <div
      className={cn(
        "pointer-events-auto rounded-xl border bg-card p-4 shadow-soft",
        "flex items-start gap-3 animate-in slide-in-from-right-4 duration-200",
      )}
    >
      <div
        className={cn(
          "mt-0.5 h-6 w-6 shrink-0 rounded-full grid place-items-center border",
          kindStyles[toast.kind],
        )}
      >
        {icons[toast.kind]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-xs text-muted-foreground text-pretty">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <a
            href={toast.action.href}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {toast.action.label} →
          </a>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}