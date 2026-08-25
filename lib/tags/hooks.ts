"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface TrackTagRow {
  tagId: string;
  spotifyTrackId: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function useTags() {
  return useQuery({ queryKey: ["tags"], queryFn: () => fetchJson<Tag[]>("/api/tags") });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      fetchJson<Tag>("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`/api/tags/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["track-tags"] });
    },
  });
}

export function useTrackTagsMap() {
  const query = useQuery({
    queryKey: ["track-tags"],
    queryFn: () => fetchJson<TrackTagRow[]>("/api/track-tags"),
  });

  const map = useMemo(() => {
    const result = new Map<string, string[]>();
    for (const row of query.data ?? []) {
      const existing = result.get(row.spotifyTrackId) ?? [];
      existing.push(row.tagId);
      result.set(row.spotifyTrackId, existing);
    }
    return result;
  }, [query.data]);

  return { ...query, map };
}

export function useAssignTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ trackId, tagId }: { trackId: string; tagId: string }) =>
      fetchJson(`/api/tracks/${trackId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["track-tags"] }),
  });
}

export function useUnassignTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ trackId, tagId }: { trackId: string; tagId: string }) =>
      fetchJson(`/api/tracks/${trackId}/tags?tagId=${tagId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["track-tags"] }),
  });
}
