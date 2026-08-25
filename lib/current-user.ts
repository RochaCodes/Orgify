import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/** Resolves the DB User row for the signed-in Spotify account, or null if unauthenticated. */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.spotifyId) return null;
  return prisma.user.findUnique({ where: { spotifyId: session.user.spotifyId } });
}
