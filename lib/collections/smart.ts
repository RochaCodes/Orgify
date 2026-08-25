import { prisma } from "@/lib/db";

/**
 * The set of liked tracks a smart rule selects: everything carrying the rule's tag that is
 * still in the user's synced liked-songs cache.
 *
 * Both readers below build on this one predicate on purpose — when the count and the listing
 * derived it separately they disagreed, so a collection could show "3" and open empty.
 */
async function likedTracksMatchingTag(userId: string, tagId: string) {
  const trackTags = await prisma.trackTag.findMany({
    where: { tagId },
    select: { spotifyTrackId: true },
  });
  return { userId, spotifyTrackId: { in: trackTags.map((t) => t.spotifyTrackId) } };
}

export async function resolveSmartCollectionTracks(userId: string, tagId: string) {
  return prisma.likedTrack.findMany({
    where: await likedTracksMatchingTag(userId, tagId),
    orderBy: { addedAt: "desc" },
  });
}

export async function countSmartCollectionTracks(userId: string, tagId: string) {
  return prisma.likedTrack.count({ where: await likedTracksMatchingTag(userId, tagId) });
}
