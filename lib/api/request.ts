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
