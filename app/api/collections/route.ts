import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { countSmartCollectionTracks } from "@/lib/collections/smart";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      smartPlaylistRule: true,
      _count: { select: { trackItems: true, playlistItems: true } },
    },
  });

  // A smart collection's tracks are computed, so its count has to be too.
  const smartCounts = new Map(
    await Promise.all(
      collections
        .filter((c) => c.smartPlaylistRule)
        .map(
          async (c) =>
            [c.id, await countSmartCollectionTracks(user.id, c.smartPlaylistRule!.tagId)] as const
        )
    )
  );

  return Response.json(
    collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      color: c.color,
      icon: c.icon,
      spotifyPlaylistId: c.spotifyPlaylistId,
      exportedAt: c.exportedAt,
      isSmart: c.smartPlaylistRule !== null,
      trackCount: c.smartPlaylistRule ? (smartCounts.get(c.id) ?? 0) : c._count.trackItems,
      playlistCount: c._count.playlistItems,
    }))
  );
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as {
    name?: string;
    color?: string;
    icon?: string;
    tagId?: string;
  };
  const name = body.name?.trim();
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });

  // A tagId turns this into a smart collection — the rule's presence is the only flag.
  if (body.tagId) {
    const tag = await prisma.tag.findUnique({ where: { id: body.tagId } });
    if (!tag || tag.userId !== user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  const collection = await prisma.collection.create({
    data: {
      userId: user.id,
      name,
      color: body.color,
      icon: body.icon,
      ...(body.tagId ? { smartPlaylistRule: { create: { tagId: body.tagId } } } : {}),
    },
  });

  return Response.json(collection, { status: 201 });
}
