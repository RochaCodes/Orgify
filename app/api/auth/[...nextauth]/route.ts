import { Auth } from "@auth/core";
import type { NextRequest } from "next/server";
import { authConfig } from "@/auth";

/**
 * Hosts that the rebuilt request URL may point at. Defaults to the host of
 * AUTH_URL (the origin Spotify's registered redirect_uri points at), so the
 * standard setup needs no extra configuration. Optional extra hosts can be
 * listed comma-separated in AUTH_TRUSTED_HOSTS.
 */
function trustedHosts(): Set<string> {
  const hosts = new Set<string>();
  if (process.env.AUTH_URL) {
    try {
      hosts.add(new URL(process.env.AUTH_URL).host.toLowerCase());
    } catch {
      // Ignore a malformed AUTH_URL here; AUTH_TRUSTED_HOSTS may still apply.
    }
  }
  for (const entry of process.env.AUTH_TRUSTED_HOSTS?.split(",") ?? []) {
    const host = entry.trim().toLowerCase();
    if (host) hosts.add(host);
  }
  return hosts;
}

/**
 * Rebuilds the request with an absolute URL taken from the real Host header
 * instead of `req.url`/`req.nextUrl` (which Next.js 16 route handlers report
 * as a fixed "localhost" origin in dev, regardless of the Host actually used
 * by the browser). Without this, the OAuth callback would send a different
 * `redirect_uri` than the one used for the initial authorization request.
 */
async function handler(req: NextRequest) {
  // x-forwarded-host / x-forwarded-proto are client-forgeable, so constrain
  // the host to the allowlist before rebuilding the URL. With no AUTH_URL and
  // no AUTH_TRUSTED_HOSTS there is nothing to pin against; degrade to the old
  // trust-the-header behaviour rather than rejecting every request.
  const forwardedHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const host = forwardedHost?.split(",")[0]?.trim().toLowerCase() ?? "";
  const allowed = trustedHosts();
  if (allowed.size > 0 && !allowed.has(host)) {
    return new Response("Untrusted host", { status: 403 });
  }

  const protocol = req.headers.get("x-forwarded-proto") ?? "http";
  const { pathname, search } = new URL(req.url);
  const fixedUrl = `${protocol}://${host}${pathname}${search}`;

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  const fixedRequest = new Request(fixedUrl, {
    method: req.method,
    headers: req.headers,
    body,
  });

  return Auth(fixedRequest, authConfig);
}

export { handler as GET, handler as POST };
