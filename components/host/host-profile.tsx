import type { Host } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatUSDC } from "@/lib/utils";
import { Clock, Globe } from "lucide-react";

interface HostProfileProps {
  host: Host;
}

export function HostProfile({ host }: HostProfileProps) {
  const initials = host.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 ring-1 ring-primary/30 grid place-items-center">
          {host.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={host.avatarUrl}
              alt={host.name}
              className="h-full w-full rounded-2xl object-cover"
            />
          ) : (
            <span className="font-display text-3xl tracking-tight text-primary">
              {initials}
            </span>
          )}
        </div>
        {/* Accent chip on corner */}
        <div className="absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full bg-background ring-2 ring-background">
          <div className="h-full w-full rounded-full bg-success animate-pulse" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
          {host.name}
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed max-w-xl text-pretty">
          {host.bio}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge variant="primary" className="font-mono">
            {formatUSDC(host.rate)} per call
          </Badge>
          <Badge variant="outline">
            <Clock className="h-3 w-3" />
            {host.durationMinutes} min
          </Badge>
          <Badge variant="outline">
            <Globe className="h-3 w-3" />
            {host.timezone.split("/").pop()?.replace("_", " ")}
          </Badge>
        </div>
      </div>
    </div>
  );
}
