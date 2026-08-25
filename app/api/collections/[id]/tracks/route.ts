import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import type { TrackDto } from "@/lib/spotify/dto";

async function requireOwnedCollection(userId: string, collectionId: string) {
  const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!collection || collection.userId !== userId) return null;
  return collection;
}

function toTrackDto(item: {
  spotifyTrackId: string;
  trackName: string;
  trackArtists: string;
  albumImage: string | null;
  durationMs: number;
  spotifyUrl: string;
}): TrackDto {
  return {
    id: item.spotifyTrackId,
    name: item.trackName,
    artists: item.trackArtists,
    albumName: "",
    albumImage: item.albumImage,
    durationMs: item.durationMs,
    spotifyUrl: item.spotifyUrl,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const collection = await requireOwnedCollection(user.id, id);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });

  const items = await prisma.collectionTrack.findMany({
    where: { collectionId: id },
    orderBy: [{ position: "asc" }, { addedAt: "asc" }],
  });

  return Response.json(items.map(toTrackDto));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const collection = await requireOwnedCollection(user.id, id);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as { track?: TrackDto };
  const track = body.track;
  if (!track?.id || !track.name) {
    return Response.json({ error: "track is required" }, { status: 400 });
  }

  const item = await prisma.collectionTrack.upsert({
    where: { collectionId_spotifyTrackId: { collectionId: id, spotifyTrackId: track.id } },
    create: {
      collectionId: id,
      spotifyTrackId: track.id,
      trackName: track.name,
      trackArtists: track.artists,
      albumImage: track.albumImage,
      durationMs: track.durationMs,
      spotifyUrl: track.spotifyUrl,
    },
    update: {},
  });

  return Response.json(toTrackDto(item), { status: 201 });
}
