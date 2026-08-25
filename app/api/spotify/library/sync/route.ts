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
 *
 * The sweep only runs when the whole listing was walked; a run that stopped short reports
 * `complete: false` and leaves both the cache and the "Last synced" stamp as they were.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const startedAt = new Date();
  let offset = 0;
  let total = Infinity;
  let syncedCount = 0;
  let complete = true;

  try {
    while (offset < total) {
      const page = await spotifyFetch<SpotifyPagingResponse<SpotifySavedTrackItem>>(
        `/me/tracks?limit=${PAGE_SIZE}&offset=${offset}`
      );
      // spotifyFetch maps Spotify's 204 to null. Mid-pagination that is not "end of list" —
      // it is a page we never got to read, so everything behind it is still unaccounted for.
      if (!page) {
        complete = false;
        break;
      }
      total = page.total;

      const items = page.items.filter((i) => i.track);
      if (items.length > 0) {
        await prisma.$transaction(
          items.map((item) => {
            const dto = toTrackDto(item.track);
            const data = {
              trackName: dto.name,
              trackArtists: dto.artists,
              trackNameLower: dto.name.toLowerCase(),
              trackArtistsLower: dto.artists.toLowerCase(),
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
        syncedCount += items.length;
      }

      offset += PAGE_SIZE;
    }

    // "Untouched" only means "no longer liked" if every page was actually read. After a short
    // run it means "never fetched", and sweeping on that basis silently deletes the cache.
    if (complete) {
      // Still approximate: /me/tracks is offset-paginated over a list the user can change
      // while this runs, so unliking a track mid-sync shifts the window and the track that
      // slides into the seam is never fetched — the sweep then drops a row that is still
      // liked. There is no cursor-based variant of this endpoint to close the gap; the row
      // comes back on the next sync.
      await prisma.likedTrack.deleteMany({
        where: { userId: user.id, syncedAt: { lt: startedAt } },
      });
    }

    const { likedTracksSyncedAt } = complete
      ? await prisma.user.update({
          where: { id: user.id },
          data: { likedTracksSyncedAt: new Date() },
          select: { likedTracksSyncedAt: true },
        })
      : // The UI renders this as "Last synced"; a partial run has no claim to that.
        await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { likedTracksSyncedAt: true },
        });

    return Response.json({ syncedAt: likedTracksSyncedAt, count: syncedCount, complete });
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
