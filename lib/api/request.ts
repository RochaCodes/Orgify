/**
 * Reads an integer query param, falling back to a default whenever the value is missing or
 * not a finite number. Without this `?limit=abc` becomes NaN and reaches Prisma (500) or the
 * Spotify API (cryptic 400).
 */
export function boundedInt(
  raw: string | null,
  { fallback, min, max }: { fallback: number; min: number; max: number }
): number {
  const parsed = Number(raw);
  if (raw === null || raw.trim() === "" || !Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

/**
 * Parses a route handler's JSON body, returning null when the body is absent or malformed.
 * Every JSON-body route goes through this so a bad request becomes a clean 400 instead of an
 * unhandled req.json() rejection surfacing as a 500.
 */
export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Returns the value trimmed when it is a non-empty string, otherwise null. The shared shape of
 * required body fields across the API (collection and tag names, Spotify ids, ...) — passing a
 * missing, non-string, or blank value through to Prisma instead would end in a 500.
 */
export function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
