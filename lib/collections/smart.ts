import { prisma } from "@/lib/db";

async function resolveSmartCollectionTagId(collectionId: string): Promise<string | undefined> {
  const rule = await prisma.smartPlaylistRule.findUnique({ where: { collectionId } });
  return rule ? (JSON.parse(rule.ruleJson) as { tagId?: string }).tagId : undefined;
}

/**
 * Resolves the live membership of a smart collection (rule: `{"type":"tag","tagId"}`) by
 * joining TrackTag against the user's synced LikedTrack cache. Smart collections have no
 * CollectionTrack rows — membership is always computed, never stored.
 */
export async function resolveSmartCollectionTracks(userId: string, collectionId: string) {
  const tagId = await resolveSmartCollectionTagId(collectionId);
  if (!tagId) return [];

  const trackTags = await prisma.trackTag.findMany({ where: { tagId } });
  const spotifyTrackIds = trackTags.map((t) => t.spotifyTrackId);
  if (spotifyTrackIds.length === 0) return [];

  return prisma.likedTrack.findMany({
    where: { userId, spotifyTrackId: { in: spotifyTrackIds } },
    orderBy: { addedAt: "desc" },
  });
}

/** Same rule resolution as resolveSmartCollectionTracks, but only counts — no track rows. */
export async function countSmartCollectionTracks(collectionId: string) {
  const tagId = await resolveSmartCollectionTagId(collectionId);
  if (!tagId) return 0;
  return prisma.trackTag.count({ where: { tagId } });
}
