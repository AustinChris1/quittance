// A gentle per-visitor limit on the free check. The Explorer allows one lookup every five seconds for the
// whole deployment, so a script must not be able to spend it for everyone; a person never meets the limit.
import { getStore } from "./store.ts";

export const FREE_CHECKS = 30;
export const WINDOW_SECONDS = 600;

/** True when this visitor may run another free check. With no store configured, it never blocks. */
export async function allowFreeCheck(request: Request): Promise<boolean> {
  const store = getStore();
  if (!store) return true;
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  try {
    return (await store.incr(`free:${ip}`, WINDOW_SECONDS)) <= FREE_CHECKS;
  } catch {
    // A store outage must not take the free checker down with it.
    return true;
  }
}
