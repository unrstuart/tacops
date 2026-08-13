import type { Environment } from "./api/types";

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Privacy-preserving usage tracking: only a SHA-256 hash of userId ever leaves the browser for
// this, never the raw id. QA/dev traffic is excluded so it doesn't pollute real usage numbers.
// Best-effort - a tracking failure must never affect the actual data fetch, so this swallows errors.
export async function trackUsage(userId: string, environment: Environment): Promise<void> {
  if (environment !== "prod") return;
  try {
    const userHash = await sha256Hex(userId);
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userHash }),
    });
  } catch {
    // best-effort, see above
  }
}
