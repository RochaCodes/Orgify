import { NextRequest } from "next/server";
import { boundedInt } from "@/lib/api/request";
import { spotifyFetch, SpotifyApiError } from "@/lib/spotify/client";
import { toPlaylistsPagedDto } from "@/lib/spotify/dto";
import type { SpotifyPagingResponse, SpotifyPlaylist } from "@/lib/spotify/types";

// Spotify's own bounds for GET /me/playlists: limit 1-50, offset up to 100,000. Anything
// outside them (including the NaN an unparseable param used to produce) comes back as a 400
// with no useful message, so the clamp happens here.
const MAX_LIMIT = 50;
const MAX_OFFSET = 100_000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = boundedInt(searchParams.get("limit"), { fallback: 20, min: 1, max: MAX_LIMIT });
  const offset = boundedInt(searchParams.get("offset"), { fallback: 0, min: 0, max: MAX_OFFSET });

  try {
    const data = await spotifyFetch<SpotifyPagingResponse<SpotifyPlaylist>>(
      `/me/playlists?limit=${limit}&offset=${offset}`
    );
    return Response.json(
      data ? toPlaylistsPagedDto(data) : { items: [], total: 0, limit, offset, hasMore: false }
    );
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
