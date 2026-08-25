import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { nonEmptyString, readJson } from "@/lib/api/request";
import { Prisma } from "@/app/generated/prisma/client";

export async function POST(req: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { trackId } = await params;
  const body = await readJson<{ tagId?: string }>(req);
  if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  const tagId = nonEmptyString(body.tagId);
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

  try {
    await prisma.trackTag.delete({ where: { tagId_spotifyTrackId: { tagId, spotifyTrackId: trackId } } });
  } catch (error) {
    // P2025 = the tag was already removed from the track; deleting it again is still success.
    // Anything else is a real failure and must not masquerade as one.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2025") {
      throw error;
    }
  }

  return new Response(null, { status: 204 });
}
