import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

/** All track<->tag assignments for the current user, for building a client-side lookup map. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const trackTags = await prisma.trackTag.findMany({
    where: { tag: { userId: user.id } },
    select: { tagId: true, spotifyTrackId: true },
  });

  return Response.json(trackTags);
}
