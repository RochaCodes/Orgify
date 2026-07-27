import { spotifyFetch, SpotifyApiError } from "@/lib/spotify/client";
import { toRecentlyPlayedDto } from "@/lib/spotify/dto";
import type { SpotifyRecentlyPlayedResponse } from "@/lib/spotify/types";

export async function GET() {
  try {
    const data = await spotifyFetch<SpotifyRecentlyPlayedResponse>(
      "/me/player/recently-played?limit=20"
    );
    return Response.json(toRecentlyPlayedDto(data));
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
