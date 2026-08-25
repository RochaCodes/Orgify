"use client";

import { useQuery } from "@tanstack/react-query";

export interface StatsDto {
  totalLikedSongs: number;
  topArtists: { artist: string; count: number }[];
  likedOverTime: { month: string; count: number }[];
  tagDistribution: { tag: string; count: number }[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: () => fetchJson<StatsDto>("/api/stats") });
}
