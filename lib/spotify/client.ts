import { auth } from "@/auth";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export class SpotifyApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "SpotifyApiError";
  }
}

/** Authenticated fetch against the Spotify Web API using the current server session. */
export async function spotifyFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new SpotifyApiError(401, "Not authenticated");
  }

  const res = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...init?.headers,
    },
    cache: "no-store",
  });

  // Spotify returns 204 when there's nothing to report (e.g. no active playback).
  if (res.status === 204) return null;

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`Spotify API error ${res.status} for ${path}: ${body}`);
    throw new SpotifyApiError(res.status, body || res.statusText);
  }

  return (await res.json()) as T;
}
