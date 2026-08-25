"use client";

import { useMemo } from "react";
import { useRecentlyPlayed } from "@/lib/spotify/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </span>
        <span className="truncate text-xl font-semibold text-foreground">{value}</span>
      </CardContent>
    </Card>
  );
}

function formatDuration(ms: number) {
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function StatTiles() {
  const { data, isLoading, isError, error } = useRecentlyPlayed();

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const today = new Date().toDateString();
    const playedToday = data.filter((item) => new Date(item.playedAt).toDateString() === today);

    const artistCounts = new Map<string, number>();
    const trackCounts = new Map<string, { name: string; count: number }>();
    let totalMs = 0;

    for (const item of data) {
      const artist = item.track.artists.split(",")[0]?.trim();
      if (artist) artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);

      const existing = trackCounts.get(item.track.id);
      trackCounts.set(item.track.id, {
        name: item.track.name,
        count: (existing?.count ?? 0) + 1,
      });

      totalMs += item.track.durationMs;
    }

    const topArtist = [...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const topTrack = [...trackCounts.values()].sort((a, b) => b.count - a.count)[0]?.name ?? "—";

    return {
      playedToday: playedToday.length,
      topArtist,
      topTrack,
      totalMs,
    };
  }, [data]);

  if (isError) {
    // Without this the tiles just read "0" and "—", which is indistinguishable from a quiet day.
    return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="Tracks today" value={String(stats?.playedToday ?? 0)} />
      <StatTile label="Top artist" value={stats?.topArtist ?? "—"} />
      <StatTile label="Top track" value={stats?.topTrack ?? "—"} />
      <StatTile label="Listening time (recent)" value={stats ? formatDuration(stats.totalMs) : "—"} />
    </div>
  );
}
