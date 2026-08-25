import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection || collection.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as { spotifyPlaylistId?: string };
  const spotifyPlaylistId = body.spotifyPlaylistId?.trim();
  if (!spotifyPlaylistId) {
    return Response.json({ error: "spotifyPlaylistId is required" }, { status: 400 });
  }

  const item = await prisma.collectionPlaylist.upsert({
    where: { collectionId_spotifyPlaylistId: { collectionId: id, spotifyPlaylistId } },
    create: { collectionId: id, spotifyPlaylistId },
    update: {},
  });

  return Response.json(item, { status: 201 });
}
