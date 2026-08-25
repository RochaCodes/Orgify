-- AlterTable
ALTER TABLE "User" ADD COLUMN "likedTracksSyncedAt" DATETIME;

-- CreateTable
CREATE TABLE "LikedTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "spotifyTrackId" TEXT NOT NULL,
    "trackName" TEXT NOT NULL,
    "trackArtists" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "albumImage" TEXT,
    "durationMs" INTEGER NOT NULL,
    "spotifyUrl" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LikedTrack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "spotifyPlaylistId" TEXT,
    "exportedAt" DATETIME,
    "isSmart" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Collection" ("color", "createdAt", "description", "exportedAt", "icon", "id", "name", "spotifyPlaylistId", "updatedAt", "userId") SELECT "color", "createdAt", "description", "exportedAt", "icon", "id", "name", "spotifyPlaylistId", "updatedAt", "userId" FROM "Collection";
DROP TABLE "Collection";
ALTER TABLE "new_Collection" RENAME TO "Collection";
CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LikedTrack_userId_trackName_idx" ON "LikedTrack"("userId", "trackName");

-- CreateIndex
CREATE INDEX "LikedTrack_userId_trackArtists_idx" ON "LikedTrack"("userId", "trackArtists");

-- CreateIndex
CREATE UNIQUE INDEX "LikedTrack_userId_spotifyTrackId_key" ON "LikedTrack"("userId", "spotifyTrackId");
