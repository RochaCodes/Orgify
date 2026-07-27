import { spotifyFetch, SpotifyApiError } from "@/lib/spotify/client";
import { toNowPlayingDto } from "@/lib/spotify/dto";
import type { SpotifyCurrentlyPlayingResponse } from "@/lib/spotify/types";

export async function GET() {
  try {
    const data = await spotifyFetch<SpotifyCurrentlyPlayingResponse>(
      "/me/player/currently-playing?additional_types=track"
    );
    return Response.json(toNowPlayingDto(data));
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
