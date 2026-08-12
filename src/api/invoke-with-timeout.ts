import { invoke, type InvokeArgs } from "@tauri-apps/api/core";

export const DEFAULT_RPC_TIMEOUT_MS = 20_000;

// A hung command (e.g. a stalled network request on the Rust side) would otherwise leave the
// frontend waiting forever - this makes sure the UI always gets an answer within timeoutMs, even
// though the underlying command keeps running until it naturally finishes.
export async function invokeWithTimeout<T>(
  command: string,
  args?: InvokeArgs,
  timeoutMs: number = DEFAULT_RPC_TIMEOUT_MS,
): Promise<T> {
  return Promise.race([
    invoke<T>(command, args),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`"${command}" timed out after ${timeoutMs / 1000}s`)), timeoutMs);
    }),
  ]);
}
