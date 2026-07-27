import { Auth } from "@auth/core";
import type { NextRequest } from "next/server";
import { authConfig } from "@/auth";

/**
 * Rebuilds the request with an absolute URL taken from the real Host header
 * instead of `req.url`/`req.nextUrl` (which Next.js 16 route handlers report
 * as a fixed "localhost" origin in dev, regardless of the Host actually used
 * by the browser). Without this, the OAuth callback would send a different
 * `redirect_uri` than the one used for the initial authorization request.
 */
async function handler(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
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
