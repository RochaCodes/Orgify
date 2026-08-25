import { NextRequest } from "next/server";
import { spotifyFetch, SpotifyApiError } from "@/lib/spotify/client";
import { toPlaylistsPagedDto } from "@/lib/spotify/dto";
import type { SpotifyPagingResponse, SpotifyPlaylist } from "@/lib/spotify/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));

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
