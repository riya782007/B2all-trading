import "server-only";
import { hasSupabase, supabaseServer } from "./supabase";
import type { Table, Tables } from "./types";

/** One tiny storage interface. Business logic lives in domain.ts and only uses these six calls,
 *  so the same code runs on Supabase (live) and in memory (demo and tests). */
export interface Store {
  all<T extends Table>(t: T, match?: Partial<Tables[T]>): Promise<Tables[T][]>;
  one<T extends Table>(t: T, id: string): Promise<Tables[T] | null>;
  insert<T extends Table>(t: T, row: Partial<Tables[T]>): Promise<Tables[T]>;
  update<T extends Table>(t: T, id: string, patch: Partial<Tables[T]>): Promise<void>;
  remove<T extends Table>(t: T, id: string): Promise<void>;
  next(kind: string): Promise<number>;
}

type Mem = { rows: { [K in Table]?: Tables[K][] }; counters: Record<string, number>; seeded?: Promise<void> };
const g = globalThis as unknown as { __b2mem?: Mem };

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const match = (row: Record<string, unknown>, m?: Record<string, unknown>) => !m || Object.entries(m).every(([k, v]) => row[k] === v);

function memoryStore(): Store {
  const M = (g.__b2mem ??= { rows: {}, counters: {} });
  const tbl = <T extends Table>(t: T) => (M.rows[t] ??= []) as Tables[T][];
  return {
    async all(t, m) { return structuredClone(tbl(t).filter((r) => match(r as Record<string, unknown>, m as Record<string, unknown>))); },
    async one(t, id) { const r = tbl(t).find((x) => (x as { id: string }).id === id); return r ? structuredClone(r) : null; },
    async insert(t, row) { const r = { id: uid(), created_at: now(), ...row } as Tables[typeof t]; tbl(t).push(r); return structuredClone(r); },
    async update(t, id, patch) { const r = tbl(t).find((x) => (x as { id: string }).id === id); if (r) Object.assign(r, patch); },
    async remove(t, id) { const a = tbl(t); const i = a.findIndex((x) => (x as { id: string }).id === id); if (i >= 0) a.splice(i, 1); },
    async next(k) { M.counters[k] = (M.counters[k] ?? 0) + 1; return M.counters[k]; },
  };
}

function supabaseStore(): Store {
  return {
    async all(t, m) {
      // Supabase returns at most 1000 rows per request, so read in pages. Without this, reports would
      // silently drop vouchers once the books pass 1000 entries.
      const sb = await supabaseServer();
      const PAGE = 1000, out: Tables[typeof t][] = [];
      for (let from = 0; ; from += PAGE) {
        let q = sb.from(t).select("*");
        for (const [k, v] of Object.entries(m ?? {})) q = q.eq(k, v as string);
        const { data, error } = await q.order("id").range(from, from + PAGE - 1);
        if (error) throw new Error(`${t}: ${error.message}`);
        out.push(...((data ?? []) as Tables[typeof t][]));
        if (!data || data.length < PAGE) break;
      }
      return out;
    },
    async one(t, id) { const sb = await supabaseServer(); const { data } = await sb.from(t).select("*").eq("id", id).maybeSingle(); return data as Tables[typeof t] | null; },
    async insert(t, row) { const sb = await supabaseServer(); const { data, error } = await sb.from(t).insert(row as never).select("*").single(); if (error) throw new Error(`${t}: ${error.message}`); return data as Tables[typeof t]; },
    async update(t, id, patch) { const sb = await supabaseServer(); const { error } = await sb.from(t).update(patch as never).eq("id", id); if (error) throw new Error(`${t}: ${error.message}`); },
    async remove(t, id) { const sb = await supabaseServer(); const { error } = await sb.from(t).delete().eq("id", id); if (error) throw new Error(`${t}: ${error.message}`); },
    async next(k) { const sb = await supabaseServer(); const { data, error } = await sb.rpc("next_number", { k }); if (error) throw new Error(error.message); return data as number; },
  };
}

export async function getStore(): Promise<Store> {
  if (hasSupabase) return supabaseStore();
  const s = memoryStore();
  const M = g.__b2mem!;
  M.seeded ??= import("./seed").then((m) => m.seed(s));
  await M.seeded;
  return s;
}
