"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateAfterTagWrite } from "@/lib/tags/hooks";
import type { PagedDto, SavedTrackDto } from "@/lib/spotify/dto";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type LikedTracksPagedDto = PagedDto<SavedTrackDto> & { syncedAt: string | null };

export function useLikedTracks(offset: number, limit: number, q: string) {
  return useQuery({
    queryKey: ["liked-tracks", offset, limit, q],
    queryFn: () =>
      fetchJson<LikedTracksPagedDto>(
        `/api/tracks/liked?offset=${offset}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`
      ),
    // Offset and query are part of the key, so paging or typing would otherwise drop back to the
    // loading state and flash skeletons over the rows the user is still reading.
    placeholderData: keepPreviousData,
  });
}

export function useSyncLikedTracks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      // `complete` is false when Spotify cut the pagination short; `syncedAt` then keeps the
      // previous run's value, and is null if no run ever completed.
      fetchJson<{ syncedAt: string | null; count: number; complete: boolean }>(
        "/api/spotify/library/sync",
        { method: "POST" }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["liked-tracks"] }),
  });
}

export function useBulkAddToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, trackIds }: { collectionId: string; trackIds: string[] }) =>
      fetchJson(`/api/collections/${collectionId}/tracks/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackIds }),
      }),
    onSuccess: (_data, { collectionId }) => {
      qc.invalidateQueries({ queryKey: ["collection-tracks", collectionId] });
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useBulkAssignTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ trackIds, tagId }: { trackIds: string[]; tagId: string }) =>
      fetchJson("/api/tracks/tags/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackIds, tagId }),
      }),
    onSuccess: () => invalidateAfterTagWrite(qc),
  });
}
