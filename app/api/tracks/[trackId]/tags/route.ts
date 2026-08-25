import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { trackId } = await params;
  const body = (await req.json()) as { tagId?: string };
  const tagId = body.tagId?.trim();
  if (!tagId) return Response.json({ error: "tagId is required" }, { status: 400 });

  const tag = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!tag || tag.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const trackTag = await prisma.trackTag.upsert({
    where: { tagId_spotifyTrackId: { tagId, spotifyTrackId: trackId } },
    create: { tagId, spotifyTrackId: trackId },
    update: {},
  });

  return Response.json(trackTag, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { trackId } = await params;
  const tagId = req.nextUrl.searchParams.get("tagId");
  if (!tagId) return Response.json({ error: "tagId is required" }, { status: 400 });

  const tag = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!tag || tag.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.trackTag
    .delete({ where: { tagId_spotifyTrackId: { tagId, spotifyTrackId: trackId } } })
    .catch(() => null);

  return new Response(null, { status: 204 });
}
