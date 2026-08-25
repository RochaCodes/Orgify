import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { requireOwnedCollection } from "@/lib/collections/ownership";
import { nonEmptyString, readJson } from "@/lib/api/request";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const collection = await requireOwnedCollection(user.id, id);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await readJson<{ spotifyPlaylistId?: string }>(req);
  if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  const spotifyPlaylistId = nonEmptyString(body.spotifyPlaylistId);
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
