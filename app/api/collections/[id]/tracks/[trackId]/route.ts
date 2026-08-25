import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id, trackId } = await params;
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection || collection.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (collection.isSmart) {
    return Response.json({ error: "Smart collections don't support manual membership" }, { status: 400 });
  }

  await prisma.collectionTrack
    .delete({
      where: { collectionId_spotifyTrackId: { collectionId: id, spotifyTrackId: trackId } },
    })
    .catch(() => null);

  return new Response(null, { status: 204 });
}
