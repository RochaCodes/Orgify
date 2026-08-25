"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  });
}

export function useSyncLikedTracks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<{ syncedAt: string; count: number }>("/api/spotify/library/sync", {
        method: "POST",
      }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["track-tags"] }),
  });
}
