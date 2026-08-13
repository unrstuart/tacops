// fetch()-based analog to invoke-with-timeout.ts's invokeWithTimeout, for the web build's calls
// to our own Cloudflare Pages Function proxy instead of a Tauri invoke.
export async function fetchWithTimeout<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
  const res = await Promise.race([
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error(`"${url}" timed out after ${timeoutMs / 1000}s`)), timeoutMs);
    }),
  ]);

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? `"${url}" returned HTTP ${res.status}`);
  }
  return data as T;
}
