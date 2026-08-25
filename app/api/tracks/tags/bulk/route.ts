import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as { trackIds?: string[]; tagId?: string };
  const trackIds = body.trackIds?.filter(Boolean) ?? [];
  const tagId = body.tagId?.trim();
  if (!tagId || trackIds.length === 0) {
    return Response.json({ error: "tagId and trackIds are required" }, { status: 400 });
  }

  const tag = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!tag || tag.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // SQLite doesn't support Prisma's `skipDuplicates`, so upsert one by one in a transaction.
  const result = await prisma.$transaction(
    trackIds.map((spotifyTrackId) =>
      prisma.trackTag.upsert({
        where: { tagId_spotifyTrackId: { tagId, spotifyTrackId } },
        create: { tagId, spotifyTrackId },
        update: {},
      })
    )
  );

  return Response.json({ count: result.length }, { status: 201 });
}
