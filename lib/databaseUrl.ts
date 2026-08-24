/**
 * Vercel's Postgres integration (Neon) names its connection string env var
 * differently depending on how the database was created — this checks the
 * common variants so setup doesn't hinge on getting the exact name right.
 */
export function getDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "No database connection string found. Set DATABASE_URL (or POSTGRES_URL / POSTGRES_PRISMA_URL) in your environment."
    );
  }
  return url;
}
