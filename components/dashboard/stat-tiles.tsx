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

export function StatTiles() {
  const { data, isLoading } = useRecentlyPlayed();

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const today = new Date().toDateString();
    const playedToday = data.filter((item) => new Date(item.playedAt).toDateString() === today);

    const artistCounts = new Map<string, number>();
    for (const item of data) {
      const artist = item.track.artists.split(",")[0]?.trim();
      if (!artist) continue;
      artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
    }
    const topArtist = [...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    return {
      playedToday: playedToday.length,
      topArtist,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatTile label="Faixas hoje" value={String(stats?.playedToday ?? 0)} />
      <StatTile label="Artista recorrente" value={stats?.topArtist ?? "—"} />
    </div>
  );
}
