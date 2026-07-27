import NextAuth, { type NextAuthConfig } from "next-auth";
import Spotify from "next-auth/providers/spotify";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { SPOTIFY_SCOPES } from "@/lib/spotify/scopes";
import { refreshSpotifyAccessToken } from "@/lib/spotify/refresh-token";

// Exported so app/api/auth/[...nextauth]/route.ts can call @auth/core's Auth()
// directly with a request URL rebuilt from the real Host header. Next.js 16's
// NextRequest does not honor AUTH_URL-based origin overrides for route handlers
// (only for the signIn/signOut/auth() server-side helpers), which causes the
// OAuth callback to send a different `redirect_uri` than the one used for the
// initial authorization request, and Spotify's token exchange rejects it.
export const authConfig: NextAuthConfig = {
  providers: [
    Spotify({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: { scope: SPOTIFY_SCOPES },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Initial sign-in: persist tokens on the JWT and upsert the User row.
      if (account && profile) {
        const accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now();

        token.accessToken = account.access_token;
        token.accessTokenExpires = accessTokenExpires;
        token.refreshToken = account.refresh_token;
        token.spotifyId = profile.id as string;

        if (account.refresh_token) {
          await prisma.user.upsert({
            where: { spotifyId: profile.id as string },
            create: {
              spotifyId: profile.id as string,
              displayName: (profile.display_name as string) ?? null,
              email: (profile.email as string) ?? null,
              image: (profile as { images?: { url: string }[] }).images?.[0]?.url ?? null,
              accessToken: account.access_token ?? "",
              accessTokenExpires: new Date(accessTokenExpires),
              refreshTokenEnc: encrypt(account.refresh_token),
            },
            update: {
              displayName: (profile.display_name as string) ?? null,
              email: (profile.email as string) ?? null,
              image: (profile as { images?: { url: string }[] }).images?.[0]?.url ?? null,
              accessToken: account.access_token ?? "",
              accessTokenExpires: new Date(accessTokenExpires),
              refreshTokenEnc: encrypt(account.refresh_token),
            },
          });
        }

        return token;
      }

      // Subsequent requests: reuse the access token until it's close to expiring.
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 60_000) {
        return token;
      }

      // Expired: refresh it.
      if (!token.refreshToken) {
        return { ...token, error: "RefreshAccessTokenError" as const };
      }

      try {
        const refreshed = await refreshSpotifyAccessToken(token.refreshToken);
        token.accessToken = refreshed.accessToken;
        token.accessTokenExpires = refreshed.accessTokenExpires;
        token.refreshToken = refreshed.refreshToken;
        delete token.error;

        if (token.spotifyId) {
          await prisma.user.update({
            where: { spotifyId: token.spotifyId },
            data: {
              accessToken: refreshed.accessToken,
              accessTokenExpires: new Date(refreshed.accessTokenExpires),
              refreshTokenEnc: encrypt(refreshed.refreshToken),
            },
          });
        }

        return token;
      } catch (error) {
        console.error("Failed to refresh Spotify access token", error);
        return { ...token, error: "RefreshAccessTokenError" as const };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      if (session.user) {
        session.user.spotifyId = token.spotifyId;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
