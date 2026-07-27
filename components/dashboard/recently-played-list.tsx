"use client";

import Image from "next/image";
import { useRecentlyPlayed } from "@/lib/spotify/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

export function RecentlyPlayedList() {
  const { data, isLoading } = useRecentlyPlayed();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Atividade recente
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <Skeleton className="size-9 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </div>
          ))}

        {!isLoading && data?.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Ainda sem atividade recente.
          </p>
        )}

        {data?.map((item, index) => (
          <div
            key={`${item.track.id}-${item.playedAt}-${index}`}
            className="flex items-center gap-3 py-1.5"
          >
            {item.track.albumImage ? (
              <Image
                src={item.track.albumImage}
                alt={item.track.albumName}
                width={36}
                height={36}
                className="size-9 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="size-9 shrink-0 rounded-md bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{item.track.name}</p>
              <p className="truncate text-xs text-muted-foreground">{item.track.artists}</p>
            </div>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {formatTime(item.playedAt)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
