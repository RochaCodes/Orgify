import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { spotifyFetch, SpotifyApiError } from "@/lib/spotify/client";

interface CreatedPlaylist {
  id: string;
  external_urls: { spotify: string };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection || collection.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const items = await prisma.collectionTrack.findMany({
    where: { collectionId: id },
    orderBy: [{ position: "asc" }, { addedAt: "asc" }],
  });
  if (items.length === 0) {
    return Response.json({ error: "Collection is empty" }, { status: 400 });
  }

  try {
    const playlist = await spotifyFetch<CreatedPlaylist>(`/users/${user.spotifyId}/playlists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: collection.name,
        description: collection.description ?? `Exported from Spotify Organizer`,
        public: false,
      }),
    });
    if (!playlist) throw new SpotifyApiError(500, "Failed to create playlist");

    const uriBatches = chunk(
      items.map((i) => `spotify:track:${i.spotifyTrackId}`),
      100
    );
    for (const uris of uriBatches) {
      await spotifyFetch(`/playlists/${playlist.id}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uris }),
      });
    }

    return Response.json({ spotifyUrl: playlist.external_urls.spotify });
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
