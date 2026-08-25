"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import type { PlaylistDto } from "@/lib/spotify/dto";
import type { CollectionSummary } from "@/lib/collections/hooks";

export function PlaylistCard({
  playlist,
  collections,
  onAddToCollection,
}: {
  playlist: PlaylistDto;
  collections: CollectionSummary[];
  onAddToCollection: (collectionId: string) => void;
}) {
  return (
    <Card className="flex items-center gap-3 p-3">
      {playlist.image ? (
        <Image
          src={playlist.image}
          alt={playlist.name}
          width={44}
          height={44}
          className="size-11 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="size-11 shrink-0 rounded-md bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{playlist.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {playlist.trackCount} tracks{playlist.ownerName ? ` · ${playlist.ownerName}` : ""}
        </p>
      </div>
      {collections.length > 0 && (
        <select
          className="shrink-0 rounded-md border border-border bg-background px-1.5 py-1 text-xs text-foreground"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) onAddToCollection(e.target.value);
            e.target.value = "";
          }}
        >
          <option value="" disabled>
            + collection
          </option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </Card>
  );
}
