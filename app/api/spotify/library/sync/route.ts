import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { spotifyFetch, SpotifyApiError } from "@/lib/spotify/client";
import { toTrackDto } from "@/lib/spotify/dto";
import type { SpotifyPagingResponse, SpotifySavedTrackItem } from "@/lib/spotify/types";

const PAGE_SIZE = 50;

/**
 * Full liked-songs sync: pages through all of GET /me/tracks, upserts each into the local
 * LikedTrack cache, then sweeps any row this run didn't touch (i.e. no longer liked on
 * Spotify). Runs in-request like the rest of this codebase's Spotify integrations — fine at
 * personal-library scale. Each page's upserts run as one transaction rather than sequential
 * awaits, so a page is committed atomically and pages don't wait on one round trip per track.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const startedAt = new Date();
  let offset = 0;
  let total = Infinity;

  try {
    while (offset < total) {
      const page = await spotifyFetch<SpotifyPagingResponse<SpotifySavedTrackItem>>(
        `/me/tracks?limit=${PAGE_SIZE}&offset=${offset}`
      );
      if (!page) break;
      total = page.total;

      const items = page.items.filter((i) => i.track);
      if (items.length > 0) {
        await prisma.$transaction(
          items.map((item) => {
            const dto = toTrackDto(item.track);
            const data = {
              trackName: dto.name,
              trackArtists: dto.artists,
              albumName: dto.albumName,
              albumImage: dto.albumImage,
              durationMs: dto.durationMs,
              spotifyUrl: dto.spotifyUrl,
              addedAt: new Date(item.added_at),
            };
            return prisma.likedTrack.upsert({
              where: { userId_spotifyTrackId: { userId: user.id, spotifyTrackId: dto.id } },
              create: { userId: user.id, spotifyTrackId: dto.id, ...data },
              update: data,
            });
          })
        );
      }

      offset += PAGE_SIZE;
    }

    await prisma.likedTrack.deleteMany({
      where: { userId: user.id, syncedAt: { lt: startedAt } },
    });

    const { likedTracksSyncedAt } = await prisma.user.update({
      where: { id: user.id },
      data: { likedTracksSyncedAt: new Date() },
      select: { likedTracksSyncedAt: true },
    });

    return Response.json({ syncedAt: likedTracksSyncedAt, count: total === Infinity ? 0 : total });
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
