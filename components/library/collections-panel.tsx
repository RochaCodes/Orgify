"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectionDropTile } from "@/components/library/collection-drop-tile";
import {
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useCollectionTracks,
  useRemoveTrackFromCollection,
  useExportCollection,
} from "@/lib/collections/hooks";
import { useCreateTag, useDeleteTag, useTags } from "@/lib/tags/hooks";

export function CollectionsPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { data: collections, isLoading } = useCollections();
  const createCollection = useCreateCollection();
  const deleteCollection = useDeleteCollection();
  const [newName, setNewName] = useState("");

  const { data: resolvedTracks } = useCollectionTracks(selectedId);
  const removeTrack = useRemoveTrackFromCollection();
  const exportCollection = useExportCollection();

  const { data: tags } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const [newTagName, setNewTagName] = useState("");

  const selectedCollection = collections?.find((c) => c.id === selectedId);

  function handleCreateCollection(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createCollection.mutate(name);
    setNewName("");
  }

  function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    const name = newTagName.trim();
    if (!name) return;
    createTag.mutate(name);
    setNewTagName("");
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Collections
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <form onSubmit={handleCreateCollection} className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New collection…"
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" disabled={!newName.trim()}>
              +
            </Button>
          </form>

          {isLoading && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {collections?.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Create a collection, then drag tracks here.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {collections?.map((collection) => (
              <div key={collection.id} className="flex items-center gap-1">
                <div className="flex-1">
                  <CollectionDropTile
                    collection={collection}
                    isSelected={collection.id === selectedId}
                    onSelect={() => onSelect(collection.id === selectedId ? null : collection.id)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    deleteCollection.mutate(collection.id);
                    if (selectedId === collection.id) onSelect(null);
                  }}
                  aria-label={`Delete ${collection.name}`}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedCollection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <span className="truncate">{selectedCollection.name}</span>
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={exportCollection.isPending || selectedCollection.trackCount === 0}
                onClick={() => exportCollection.mutate(selectedCollection.id)}
              >
                Export
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {exportCollection.isSuccess && (
              <a
                href={exportCollection.data.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-1 text-xs text-primary underline"
              >
                Playlist created on Spotify — open
              </a>
            )}
            {exportCollection.isError && (
              <p className="mb-1 text-xs text-destructive">
                {(exportCollection.error as Error).message}
              </p>
            )}
            {!resolvedTracks || resolvedTracks.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No tracks in this collection yet. Drag one in from the library.
              </p>
            ) : (
              resolvedTracks.map((track) => (
                <div key={track.id} className="flex items-center gap-2 py-1">
                  {track.albumImage ? (
                    <Image
                      src={track.albumImage}
                      alt={track.name}
                      width={28}
                      height={28}
                      className="size-7 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="size-7 shrink-0 rounded bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-foreground">{track.name}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      removeTrack.mutate({ collectionId: selectedCollection.id, spotifyTrackId: track.id })
                    }
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <form onSubmit={handleCreateTag} className="flex gap-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="New tag…"
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" disabled={!newTagName.trim()}>
              +
            </Button>
          </form>
          <div className="flex flex-wrap gap-1">
            {tags?.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => deleteTag.mutate(tag.id)}
                className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
                title="Delete tag"
              >
                {tag.name} ×
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
