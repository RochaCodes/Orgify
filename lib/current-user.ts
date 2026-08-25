import { Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Resolves the DB User row for the signed-in Spotify account, or null if unauthenticated.
 *
 * The row is created on first sign-in, but a JWT session outlives the database (a migration
 * reset, a fresh clone, a moved dev.db). When that happens the row is recreated here from the
 * session identity instead of leaving every DB-backed route returning 401 until the user
 * signs out and back in. The token mirror stays empty in that case — the request path does not
 * read it, and the jwt callback refills it on the next token refresh.
 */
export async function getCurrentUser() {
  const session = await auth();
  const spotifyId = session?.user?.spotifyId;
  if (!spotifyId) return null;

  const user = await prisma.user.findUnique({ where: { spotifyId } });
  if (user) return user;

  try {
    return await prisma.user.create({
      data: {
        spotifyId,
        displayName: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      },
    });
  } catch (error) {
    // Two concurrent requests can both observe the missing row and race to
    // create it; the loser hits the unique constraint on spotifyId. That is
    // not an error for the caller — re-read whichever row won the race.
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
    const winner = await prisma.user.findUnique({ where: { spotifyId } });
    if (!winner) throw error;
    return winner;
  }
}
