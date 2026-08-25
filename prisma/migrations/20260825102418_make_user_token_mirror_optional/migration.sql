-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spotifyId" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT,
    "image" TEXT,
    "accessToken" TEXT,
    "accessTokenExpires" DATETIME,
    "refreshTokenEnc" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("accessToken", "accessTokenExpires", "createdAt", "displayName", "email", "id", "image", "refreshTokenEnc", "spotifyId") SELECT "accessToken", "accessTokenExpires", "createdAt", "displayName", "email", "id", "image", "refreshTokenEnc", "spotifyId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_spotifyId_key" ON "User"("spotifyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
