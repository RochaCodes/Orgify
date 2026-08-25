# Spotiganizer

A personal app for organizing your Spotify library and playlists more freely than Spotify allows natively,
with a minimal "HUD" dashboard for tracking what you're listening to.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui + Auth.js v5 (OAuth PKCE) + Prisma + SQLite.

## Features

- **HUD dashboard** — live now-playing tile, recent activity, and stats derived from your listening history.
- **Collections** — user-defined folders that group saved tracks and playlists, something the Spotify API
  does not expose. Drag tracks from your library straight into a collection.
- **Tags** — lightweight labels you can attach to any track, independent of collections.
- **Export to Spotify** — push a collection to a real private playlist in your account.
  Re-exporting ("Sync") updates that same playlist instead of creating duplicates.

## Setup

### 1. Create an app in the Spotify Developer Dashboard

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and sign in
   (a **Premium** account is required for Development Mode).
2. **Create app**.
3. **Redirect URI**: `http://127.0.0.1:3000/api/auth/callback/spotify`
   > Spotify no longer accepts `localhost` as a redirect URI (only HTTPS or the literal loopback IP
   > `127.0.0.1`). Always use `127.0.0.1`, never `localhost`.
4. Save the **Client ID** and **Client Secret** from the app's Settings.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` with the values from the previous step. Generate
`AUTH_SECRET` and `TOKEN_ENCRYPTION_KEY` yourself:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"      # TOKEN_ENCRYPTION_KEY
```

`TOKEN_ENCRYPTION_KEY` encrypts the Spotify refresh token at rest (AES-256-GCM).

### 3. Install dependencies and prepare the database

```bash
npm install
npx prisma migrate dev
```

### 4. Run in development

```bash
npm run dev
```

Open **http://127.0.0.1:3000** (not `localhost`, so it matches the Redirect URI registered with Spotify).

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
npx tsc --noEmit # typecheck
```

## Notes

- This project is designed for personal, single-user use. The Spotify app stays in **Development Mode**,
  which is limited to 5 authorized users.
- Several Spotify Web API endpoints (`/recommendations`, `/audio-features`, `/related-artists`) have been
  blocked for new apps since Nov 2024, and `GET /tracks` returns 403 without Extended Quota access. Because
  of this, track metadata is snapshotted when a track is added to a collection rather than re-fetched by ID,
  and the planned suggestion engine uses genre/artist overlap instead of audio features. See
  `prisma/schema.prisma` and `lib/spotify/` for details.
- Spotify's February 2026 Dev Mode migration also renamed the playlist endpoints — playlist creation goes
  through `POST /me/playlists` and playlist track writes through `/playlists/{id}/items`; the legacy
  `/users/{id}/playlists` and `/playlists/{id}/tracks` return 403 in Development Mode.
- The local database is SQLite. `DATABASE_URL="file:./dev.db"` resolves relative to the process working
  directory, so the file lands at the repo root (`./dev.db`) and is gitignored.

## Deploy

[Vercel](https://vercel.com/new) — remember to configure the environment variables (with a Postgres
`DATABASE_URL`; Vercel's filesystem is not persistent, so SQLite will not survive) and to update the
Redirect URI in the Spotify Dashboard to your production domain.

## License

[MIT](LICENSE)
