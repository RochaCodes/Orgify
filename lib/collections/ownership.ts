import { prisma } from "@/lib/db";
import type { Collection, SmartPlaylistRule } from "@/app/generated/prisma/client";

export type OwnedCollection = Collection & { smartPlaylistRule: SmartPlaylistRule | null };

/**
 * Loads a collection only if it belongs to the user, always with its smart rule attached —
 * every caller needs to know whether membership is rule-derived before it can do anything.
 * `smartPlaylistRule !== null` is the definition of a smart collection.
 */
export async function requireOwnedCollection(
  userId: string,
  collectionId: string
): Promise<OwnedCollection | null> {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: { smartPlaylistRule: true },
  });
  if (!collection || collection.userId !== userId) return null;
  return collection;
}

export const SMART_COLLECTION_READONLY_ERROR =
  "Smart collections don't support manual membership";
