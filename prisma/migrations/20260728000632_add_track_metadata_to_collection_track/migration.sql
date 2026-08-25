/*
  Warnings:

  - Added the required column `durationMs` to the `CollectionTrack` table without a default value. This is not possible if the table is not empty.
  - Added the required column `spotifyUrl` to the `CollectionTrack` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trackArtists` to the `CollectionTrack` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trackName` to the `CollectionTrack` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CollectionTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "spotifyTrackId" TEXT NOT NULL,
    "trackName" TEXT NOT NULL,
    "trackArtists" TEXT NOT NULL,
    "albumImage" TEXT,
    "durationMs" INTEGER NOT NULL,
    "spotifyUrl" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "position" INTEGER,
    CONSTRAINT "CollectionTrack_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CollectionTrack" ("addedAt", "collectionId", "id", "position", "spotifyTrackId") SELECT "addedAt", "collectionId", "id", "position", "spotifyTrackId" FROM "CollectionTrack";
DROP TABLE "CollectionTrack";
ALTER TABLE "new_CollectionTrack" RENAME TO "CollectionTrack";
CREATE UNIQUE INDEX "CollectionTrack_collectionId_spotifyTrackId_key" ON "CollectionTrack"("collectionId", "spotifyTrackId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
