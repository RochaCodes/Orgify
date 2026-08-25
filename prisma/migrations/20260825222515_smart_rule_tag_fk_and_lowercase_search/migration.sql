-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Collection: drop `isSmart`. A collection is smart iff it has a SmartPlaylistRule, so the
-- boolean was a second source of truth that could disagree with the rule (and did, once the
-- rule's tag was deleted).
CREATE TABLE "new_Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "spotifyPlaylistId" TEXT,
    "exportedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Collection" ("color", "createdAt", "description", "exportedAt", "icon", "id", "name", "spotifyPlaylistId", "updatedAt", "userId") SELECT "color", "createdAt", "description", "exportedAt", "icon", "id", "name", "spotifyPlaylistId", "updatedAt", "userId" FROM "Collection";
DROP TABLE "Collection";
ALTER TABLE "new_Collection" RENAME TO "Collection";
CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");

-- SmartPlaylistRule: replace the `ruleJson` blob with a real tagId foreign key, carrying the
-- existing rules over by extracting the id the JSON already held. Rules whose tag no longer
-- exists are dropped by the FK, which is the point of the change.
CREATE TABLE "new_SmartPlaylistRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "lastRunAt" DATETIME,
    CONSTRAINT "SmartPlaylistRule_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SmartPlaylistRule_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SmartPlaylistRule" ("id", "collectionId", "tagId", "lastRunAt")
SELECT "id", "collectionId", json_extract("ruleJson", '$.tagId'), "lastRunAt"
FROM "SmartPlaylistRule"
WHERE json_extract("ruleJson", '$.tagId') IN (SELECT "id" FROM "Tag");
DROP TABLE "SmartPlaylistRule";
ALTER TABLE "new_SmartPlaylistRule" RENAME TO "SmartPlaylistRule";
CREATE UNIQUE INDEX "SmartPlaylistRule_collectionId_key" ON "SmartPlaylistRule"("collectionId");
CREATE INDEX "SmartPlaylistRule_tagId_idx" ON "SmartPlaylistRule"("tagId");

-- LikedTrack: add Unicode-lowercased search columns. Backfilled here with SQLite's lower(),
-- which only folds ASCII; the next full sync rewrites them with JS toLowerCase().
CREATE TABLE "new_LikedTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "spotifyTrackId" TEXT NOT NULL,
    "trackName" TEXT NOT NULL,
    "trackArtists" TEXT NOT NULL,
    "trackNameLower" TEXT NOT NULL,
    "trackArtistsLower" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "albumImage" TEXT,
    "durationMs" INTEGER NOT NULL,
    "spotifyUrl" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LikedTrack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LikedTrack" ("id", "userId", "spotifyTrackId", "trackName", "trackArtists", "trackNameLower", "trackArtistsLower", "albumName", "albumImage", "durationMs", "spotifyUrl", "addedAt", "syncedAt")
SELECT "id", "userId", "spotifyTrackId", "trackName", "trackArtists", lower("trackName"), lower("trackArtists"), "albumName", "albumImage", "durationMs", "spotifyUrl", "addedAt", "syncedAt" FROM "LikedTrack";
DROP TABLE "LikedTrack";
ALTER TABLE "new_LikedTrack" RENAME TO "LikedTrack";
CREATE UNIQUE INDEX "LikedTrack_userId_spotifyTrackId_key" ON "LikedTrack"("userId", "spotifyTrackId");
CREATE INDEX "LikedTrack_userId_trackNameLower_idx" ON "LikedTrack"("userId", "trackNameLower");
CREATE INDEX "LikedTrack_userId_trackArtistsLower_idx" ON "LikedTrack"("userId", "trackArtistsLower");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
