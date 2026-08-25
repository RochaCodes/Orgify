import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

async function requireOwnedCollection(userId: string, collectionId: string) {
  const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!collection || collection.userId !== userId) return null;
  return collection;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const collection = await requireOwnedCollection(user.id, id);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });
  if (collection.isSmart) {
    return Response.json({ error: "Smart collections don't support manual membership" }, { status: 400 });
  }

  const body = (await req.json()) as { trackIds?: string[] };
  const trackIds = body.trackIds?.filter(Boolean) ?? [];
  if (trackIds.length === 0) {
    return Response.json({ error: "trackIds is required" }, { status: 400 });
  }

  // Resolve display fields server-side from the synced liked-songs cache rather than
  // trusting client-supplied denormalized fields.
  const likedTracks = await prisma.likedTrack.findMany({
    where: { userId: user.id, spotifyTrackId: { in: trackIds } },
  });

  // SQLite doesn't support Prisma's `skipDuplicates`, so upsert one by one in a transaction.
  const result = await prisma.$transaction(
    likedTracks.map((track) =>
      prisma.collectionTrack.upsert({
        where: { collectionId_spotifyTrackId: { collectionId: id, spotifyTrackId: track.spotifyTrackId } },
        create: {
          collectionId: id,
          spotifyTrackId: track.spotifyTrackId,
          trackName: track.trackName,
          trackArtists: track.trackArtists,
          albumImage: track.albumImage,
          durationMs: track.durationMs,
          spotifyUrl: track.spotifyUrl,
        },
        update: {},
      })
    )
  );

  return Response.json({ count: result.length }, { status: 201 });
}
