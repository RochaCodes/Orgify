import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { nonEmptyString, readJson } from "@/lib/api/request";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = await readJson<{ trackIds?: string[]; tagId?: string }>(req);
  if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });

  const trackIds = Array.isArray(body.trackIds) ? body.trackIds.filter(Boolean) : [];
  const tagId = nonEmptyString(body.tagId);
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
