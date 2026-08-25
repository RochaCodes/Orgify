"use client";

import Image from "next/image";
import { useNowPlaying } from "@/lib/spotify/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function NowPlayingTile() {
  const { data, isLoading } = useNowPlaying();

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-1 py-10 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            now playing
          </span>
          <p className="text-sm text-muted-foreground">Nothing playing right now.</p>
        </CardContent>
      </Card>
    );
  }

  const { track, isPlaying, progressMs } = data;
  const progressPct = Math.min(100, (progressMs / track.durationMs) * 100);

  return (
    <Card className="overflow-hidden border-primary/30">
      <CardContent className="flex items-center gap-4 p-4">
        {track.albumImage ? (
          <Image
            src={track.albumImage}
            alt={track.albumName}
            width={64}
            height={64}
            className="size-16 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="size-16 shrink-0 rounded-md bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`size-1.5 rounded-full ${
                isPlaying ? "animate-pulse bg-emerald-400" : "bg-muted-foreground"
              }`}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {isPlaying ? "now playing" : "paused"}
            </span>
          </div>
          <p className="truncate text-sm font-medium text-foreground">{track.name}</p>
          <p className="truncate text-xs text-muted-foreground">{track.artists}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full bg-muted">
              <div
                className="h-1 rounded-full bg-primary transition-[width]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {formatMs(progressMs)}/{formatMs(track.durationMs)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
