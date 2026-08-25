# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev            # Next dev server — open http://127.0.0.1:3000, NOT localhost (see below)
npm run build
npm run lint           # bare `eslint` (flat config, eslint-config-next)
npx tsc --noEmit       # typecheck; there is no `typecheck` script

npx prisma migrate dev --name <name>   # create + apply a migration, regenerates the client
npx prisma generate                    # required after clone: app/generated/prisma is gitignored
npx prisma studio
```

No test framework is configured — there are no tests to run.

## Setup constraints

- **`127.0.0.1`, never `localhost`.** Spotify rejects `localhost` redirect URIs; the registered URI is
  `http://127.0.0.1:3000/api/auth/callback/spotify` and `AUTH_URL` must match. Browsing the app on
  `localhost` breaks the OAuth callback.
- Env lives in `.env.local` (see `.env.example`). `TOKEN_ENCRYPTION_KEY` is required at runtime —
  `lib/crypto.ts` throws without it.
- `DATABASE_URL="file:./dev.db"` resolves **relative to the process cwd**, so the SQLite file is at the
  repo root (`./dev.db`), not `prisma/dev.db`.

## Architecture

Next.js 16 App Router + Auth.js v5 (JWT sessions) + Prisma 7 (libSQL driver adapter) + TanStack Query.
Single-user personal app; the Spotify app runs in Development Mode.

### Two identities, two lookups

Auth state exists in two places and they are used for different things — don't conflate them:

- **The JWT session** (`auth()` in `auth.ts`) carries the Spotify access token. `lib/spotify/client.ts`'s
  `spotifyFetch` reads it to call the Spotify Web API. Refresh happens inside the `jwt` callback when the
  token is within 60s of expiry; failures set `token.error = "RefreshAccessTokenError"`.
- **The `User` row** (`getCurrentUser()` in `lib/current-user.ts`, keyed by `spotifyId`) is the ownership
  anchor for everything in the DB. Every DB-backed route handler starts with `getCurrentUser()` → 401, then
  scopes the query by `user.id`; for nested resources it re-checks `collection.userId === user.id` → 404.
  The row also mirrors the tokens (refresh token encrypted via `lib/crypto.ts` AES-256-GCM) for future
  background jobs — the request path does not read them, and they are nullable for that reason.
  `getCurrentUser()` recreates the row from session identity if it is missing, because a JWT session
  outlives the database (a migration reset leaves every DB route returning 401 otherwise).

`app/api/auth/[...nextauth]/route.ts` deliberately bypasses Auth.js's Next.js handler and calls `@auth/core`'s
`Auth()` with a request rebuilt from the real `Host` header. Next.js 16 route handlers report a fixed
`localhost` origin, which would make the callback's `redirect_uri` differ from the authorize request's and
Spotify's token exchange would reject it. Don't "simplify" this back to `export const { GET, POST } = handlers`.

### API route families

- `app/api/spotify/*` — thin proxies over the Spotify Web API. No DB. They call `spotifyFetch`, map the raw
  response through a `to*Dto` function in `lib/spotify/dto.ts`, and translate `SpotifyApiError` into
  `Response.json({ error }, { status })`. `spotifyFetch` returns `null` on Spotify's 204 (e.g. nothing
  playing) — handle the null rather than assuming a body.
- `app/api/{collections,tags,tracks,track-tags}/*` — local Prisma data, ownership-checked as above.

Spotify's shapes live in `lib/spotify/types.ts` and never leave the server; the client only ever sees the
DTOs from `lib/spotify/dto.ts`. Add a mapper rather than widening a DTO with raw Spotify fields.

### Client data layer

Every fetch from the browser goes through a TanStack Query hook, never a bare `fetch` in a component:
`lib/spotify/hooks.ts` (reads, polled: now-playing 7s, recently-played 60s), `lib/collections/hooks.ts`,
`lib/tags/hooks.ts`. Query keys in use: `["spotify", ...]`, `["collections"]`,
`["collection-tracks", id]`, `["tags"]`, `["track-tags"]`. Track↔collection mutations do optimistic
`onMutate`/rollback-on-`onError`/`onSettled`-invalidate — match that pattern when adding mutations that a
drag gesture triggers.

### Drag and drop

The only `DndContext` is in `app/(app)/library/page.tsx`. Convention: draggables are
`id: "track:<spotifyId>"` with `data: { type: "track", track }`, droppables are `id: "collection:<id>"` with
`data: { type: "collection", collectionId }`; `handleDragEnd` dispatches on those `type` discriminators.

## Spotify Web API limitations shaping the design

Apps created after Nov 2024 without Extended Quota get 403/404 on several endpoints, and the code works
around them rather than calling them:

- `GET /tracks` (catalog track lookup) is **403** in Development Mode. This is why `CollectionTrack` in
  `prisma/schema.prisma` snapshots `trackName`/`trackArtists`/`albumImage`/`durationMs`/`spotifyUrl` at
  add-time instead of storing only the Spotify ID. Anything that persists a track must carry the same
  denormalized fields — see the schema comment before changing this.
- `/recommendations`, `/audio-features`, `/related-artists` are unavailable; the planned suggestion engine
  must use genre/artist overlap instead.
- Spotify's February 2026 Dev Mode migration renamed the playlist endpoints — the legacy names now return
  plain `403 Forbidden` (not an "insufficient scope" error) in Development Mode:
  - `POST /users/{id}/playlists` → `POST /me/playlists`
  - `{GET,POST,PUT} /playlists/{id}/tracks` → `{GET,POST,PUT} /playlists/{id}/items`

New Spotify features usually need a new scope in `lib/spotify/scopes.ts`, which forces a re-consent.

## Prisma 7 specifics

- The generated client is at `app/generated/prisma` (gitignored) — import from
  `@/app/generated/prisma/client`, not `@prisma/client`.
- The datasource URL comes from `prisma.config.ts`, not from `schema.prisma` (which has `provider` only).
- Runtime uses the libSQL driver adapter (`PrismaLibSql` in `lib/db.ts`); a driver adapter is mandatory in v7.
- Prisma skills are vendored in `.agents/skills/` (`prisma-client-api`, `prisma-upgrade-v7`, etc.) — consult
  them for v7 API details.

## UI conventions

- The project is English-only (UI copy, code, comments, docs) — it is a public repo. Dates and times render
  with the `en-GB` locale.
- Dark theme is hardcoded (`className="dark"` on `<html>`) — there is no theme toggle.
- shadcn/ui with the `base-nova` style over `@base-ui/react`; components go in `components/ui/` via
  `npx shadcn@latest add <component>`. Feature components live in `components/{dashboard,library}/`.
- Remote images are restricted to the Spotify CDN hosts allowlisted in `next.config.ts`; a new image host
  needs a `remotePatterns` entry.
