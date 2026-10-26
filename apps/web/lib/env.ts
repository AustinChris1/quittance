import { join } from "node:path";

let loaded = false;

/** Secrets live in the repo-root .env so there is one copy, never one per app. */
export function loadRootEnv(): void {
  if (loaded) return;
  loaded = true;
  for (const candidate of [join(process.cwd(), ".env"), join(process.cwd(), "..", "..", ".env")]) {
    try {
      process.loadEnvFile(candidate);
      return;
    } catch {
      // try the next candidate
    }
  }
}
