const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export interface RefreshedSpotifyToken {
  accessToken: string;
  accessTokenExpires: number;
  refreshToken: string;
}

/**
 * Exchanges a refresh token for a new access token.
 * Spotify may or may not rotate the refresh token itself — fall back to the
 * previous one if the response doesn't include a new one.
 */
export async function refreshSpotifyAccessToken(
  refreshToken: string
): Promise<RefreshedSpotifyToken> {
  const basicAuth = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to refresh Spotify access token: ${response.status} ${body}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  return {
    accessToken: data.access_token,
    accessTokenExpires: Date.now() + data.expires_in * 1000,
    refreshToken: data.refresh_token ?? refreshToken,
  };
}
