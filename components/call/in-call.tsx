"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BaseCallControls,
  MicrophoneControl,
  CameraControl,
  ScreenShareControl,
  type CallControlsRenderProps,
} from "@vidbloq/react";
import { cn } from "@/lib";
import { VideoGrid } from "./video-grid";

type InCallProps = {
  scheduledEndAt: number;
};

export function InCall({ scheduledEndAt }: InCallProps) {
  const router = useRouter();

return (
  <div className="h-screen flex flex-col bg-background relative">
    {/* Video grid */}
    <div className="flex-1 min-h-0 relative">
      <VideoGrid />
      {/* Timer overlay — floats over the grid */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <CallTimer scheduledEndAt={scheduledEndAt} />
      </div>
    </div>

    {/* Controls */}
    <div className="border-t border-border bg-card">
      <BaseCallControls
        features={{
          media: true,
          recording: false,
          handRaise: false,
          guestRequests: false,
          screenShare: true,
          disconnect: true,
        }}
        onDisconnect={() => router.push("/")}
        render={(props: CallControlsRenderProps) => (
          <ControlBar props={props} />
        )}
      />
    </div>
  </div>
);
}

function ControlBar({ props }: { props: CallControlsRenderProps }) {
  const {
    canAccessMediaControls,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    handleDisconnectClick,
    displayName,
    participantCount,
  } = props;

  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="hidden md:block text-xs text-muted-foreground">
        {participantCount} {participantCount === 1 ? "person" : "people"} in
        call
      </div>

      <div className="flex items-center gap-2 mx-auto md:mx-0">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-full p-1">
          {canAccessMediaControls && toggleMic && (
            <MicrophoneControl showLabel={false} />
          )}
          {canAccessMediaControls && toggleCamera && (
            <CameraControl showLabel={false} />
          )}
          {canAccessMediaControls && toggleScreenShare && (
            <div className="hidden md:!block">
              <ScreenShareControl showLabel={false} />
            </div>
          )}
        </div>

        {handleDisconnectClick && (
          <button
            onClick={handleDisconnectClick}
            className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            <PhoneOffIcon />
            <span className="hidden md:inline">End call</span>
          </button>
        )}
      </div>

      <div className="hidden md:block text-xs text-muted-foreground">
        {displayName}
      </div>
    </div>
  );
}

function PhoneOffIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );
}

function CallTimer({ scheduledEndAt }: { scheduledEndAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const remaining = Math.max(0, scheduledEndAt - now);
  const m = Math.floor(remaining / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  const isOver = remaining === 0;
  const isWarning = remaining > 0 && remaining < 5 * 60_000;

  return (
    <div
      className={cn(
        "font-mono tabular text-xs px-3 py-1.5 rounded-full border transition-colors",
        isOver
          ? "bg-destructive/20 text-destructive border-destructive/40"
          : isWarning
            ? "bg-warning/20 text-warning-foreground border-warning/40"
            : "bg-white/10 text-white/80 border-white/10",
      )}
      aria-live="polite"
    >
      {isOver
        ? "Call ended"
        : `${m}:${s.toString().padStart(2, "0")} remaining`}
    </div>
  );
}
