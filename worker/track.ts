// Day-granularity sightings, read-before-write: a user hitting GO many times in one day costs one
// cheap read (D1 free tier: ~5M/day) and at most one write (free tier: ~100k/day) rather than one
// write per request.
export async function recordSighting(db: D1Database, userHash: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD', UTC

  const existing = await db
    .prepare("SELECT last_seen_date FROM user_sightings WHERE user_hash = ?")
    .bind(userHash)
    .first<{ last_seen_date: string }>();
  if (existing?.last_seen_date === today) return;

  await db
    .prepare(
      "INSERT INTO user_sightings (user_hash, last_seen_date) VALUES (?, ?) " +
        "ON CONFLICT(user_hash) DO UPDATE SET last_seen_date = excluded.last_seen_date",
    )
    .bind(userHash, today)
    .run();
}
