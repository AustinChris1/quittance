// A tiny key-value store for watches: Upstash Redis over its REST API in production, a local file in development.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadRootEnv } from "./env.ts";

export type Store = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  sadd(set: string, member: string): Promise<void>;
  srem(set: string, member: string): Promise<void>;
  smembers(set: string): Promise<string[]>;
  /** Adds one to a counter that disappears after `ttlSeconds`, and returns the new count. */
  incr(key: string, ttlSeconds: number): Promise<number>;
};

function redisEnv(): { url: string; token: string } | undefined {
  loadRootEnv();
  // The Vercel Marketplace integration has used both names.
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : undefined;
}

function redisStore(env: { url: string; token: string }): Store {
  const call = async <T>(command: (string | number)[]): Promise<T> => {
    const res = await fetch(env.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.token}`, "content-type": "application/json" },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    const body = (await res.json()) as { result?: T; error?: string };
    if (!res.ok || body.error) throw new Error(`watch store: ${body.error ?? `HTTP ${res.status}`}`);
    return body.result as T;
  };
  return {
    get: (key) => call<string | null>(["GET", key]),
    set: async (key, value) => void (await call(["SET", key, value])),
    del: async (key) => void (await call(["DEL", key])),
    sadd: async (set, member) => void (await call(["SADD", set, member])),
    srem: async (set, member) => void (await call(["SREM", set, member])),
    smembers: (set) => call<string[]>(["SMEMBERS", set]),
    incr: async (key, ttlSeconds) => {
      const n = await call<number>(["INCR", key]);
      if (n === 1) await call(["EXPIRE", key, ttlSeconds]);
      return n;
    },
  };
}

/** Development only: one JSON file, so the whole flow runs locally without an account. */
function fileStore(): Store {
  const path = join(tmpdir(), "quittance-watch-store.json");
  type Data = { kv: Record<string, string>; sets: Record<string, string[]>; counters?: Record<string, { n: number; until: number }> };
  const read = (): Data => {
    try {
      return JSON.parse(readFileSync(path, "utf8")) as Data;
    } catch {
      return { kv: {}, sets: {} };
    }
  };
  const write = (d: Data) => writeFileSync(path, JSON.stringify(d));
  return {
    get: async (key) => read().kv[key] ?? null,
    set: async (key, value) => {
      const d = read();
      d.kv[key] = value;
      write(d);
    },
    del: async (key) => {
      const d = read();
      delete d.kv[key];
      write(d);
    },
    sadd: async (set, member) => {
      const d = read();
      d.sets[set] = [...new Set([...(d.sets[set] ?? []), member])];
      write(d);
    },
    srem: async (set, member) => {
      const d = read();
      d.sets[set] = (d.sets[set] ?? []).filter((m) => m !== member);
      write(d);
    },
    smembers: async (set) => read().sets[set] ?? [],
    incr: async (key, ttlSeconds) => {
      const d = read();
      const now = Date.now();
      const c = d.counters?.[key];
      const next = c && c.until > now ? { n: c.n + 1, until: c.until } : { n: 1, until: now + ttlSeconds * 1000 };
      d.counters = { ...d.counters, [key]: next };
      write(d);
      return next.n;
    },
  };
}

/** Undefined in production without Upstash: a file on a serverless instance would silently lose watches. */
export function getStore(): Store | undefined {
  const env = redisEnv();
  if (env) return redisStore(env);
  return process.env.VERCEL ? undefined : fileStore();
}
