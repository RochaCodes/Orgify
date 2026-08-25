"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStats } from "@/lib/stats/hooks";
import { useCollections } from "@/lib/collections/hooks";
import { LikedOverTimeChart } from "@/components/stats/liked-over-time-chart";

function BarRow({ label, count, max, tone }: { label: string; count: number; max: number; tone: "primary" | "muted" }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
        <span className="truncate text-foreground">{label}</span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-foreground/10">
        <div
          className={`h-full rounded-full ${tone === "primary" ? "bg-primary" : "bg-muted-foreground"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { data, isLoading, isError, error } = useStats();
  const { data: collections } = useCollections();

  if (isError) {
    return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  }

  const maxArtistCount = Math.max(...(data?.topArtists.map((a) => a.count) ?? [0]), 1);
  const maxTagCount = Math.max(...(data?.tagDistribution.map((t) => t.count) ?? [0]), 1);

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      {/* Overview: one dominant number plus secondary stats, not four equal boxes. */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-8 p-6">
          {isLoading ? (
            <Skeleton className="h-16 w-40" />
          ) : (
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Liked songs
              </p>
              <p className="text-5xl font-semibold tracking-tight text-foreground">
                {data?.totalLikedSongs ?? 0}
              </p>
            </div>
          )}
          <div className="hidden self-stretch border-l border-border sm:block" />
          <div className="flex flex-wrap gap-8">
            {isLoading ? (
              <Skeleton className="h-12 w-64" />
            ) : (
              <>
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Top artist
                  </p>
                  <p className="text-lg font-medium text-foreground">{data?.topArtists[0]?.artist ?? "—"}</p>
                </div>
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Collections
                  </p>
                  <p className="text-lg font-medium text-foreground">{collections?.length ?? 0}</p>
                </div>
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Tags used
                  </p>
                  <p className="text-lg font-medium text-foreground">{data?.tagDistribution.length ?? 0}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Over-time: a wide feature card with room to breathe. */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Liked songs over time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <LikedOverTimeChart data={data?.likedOverTime ?? []} />
          )}
        </CardContent>
      </Card>

      {/* Breakdown: proportional bars instead of plain name/count rows. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Top artists
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {isLoading && <Skeleton className="h-24 w-full" />}
            {!isLoading && (data?.topArtists.length ?? 0) === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Sync your liked songs to see this.
              </p>
            )}
            {data?.topArtists.map((row) => (
              <BarRow key={row.artist} label={row.artist} count={row.count} max={maxArtistCount} tone="primary" />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Tag distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {isLoading && <Skeleton className="h-24 w-full" />}
            {!isLoading && (data?.tagDistribution.length ?? 0) === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Tag some tracks to see this.
              </p>
            )}
            {data?.tagDistribution.map((row) => (
              <BarRow key={row.tag} label={row.tag} count={row.count} max={maxTagCount} tone="muted" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
