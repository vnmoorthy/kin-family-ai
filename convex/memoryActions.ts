/**
 * Supermemory = Kin's long-term family brain.
 *
 * Namespaces:
 *   kin_<household>_family      -> shared by everyone in the family (and only the family)
 *   kin_<household>_<member>    -> one person's private memory; never shown to others
 *
 * Convex keeps a mirror of every memory (table `memories`) so the UI is live and the
 * AI still has context if Supermemory is slow. Supermemory adds semantic recall and
 * automatic memory extraction from conversations ("dreaming").
 */
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { scope } from "./schema";

const BASE = "https://api.supermemory.ai";

export function familyNs(householdId: string) {
  return `kin_${householdId}_family`;
}
export function memberNs(householdId: string, memberId: string) {
  return `kin_${householdId}_${memberId}`;
}

async function smFetch(path: string, body: unknown, timeoutMs = 5000, method = "POST"): Promise<any> {
  const key = process.env.SUPERMEMORY_API_KEY;
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn("supermemory", path, res.status, text.slice(0, 300));
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (e) {
    console.warn("supermemory error", path, String(e));
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function smAdd(ns: string, content: string, id?: string, metadata?: Record<string, string>) {
  return smFetch(`/ns/${encodeURIComponent(ns)}/document`, {
    content,
    ...(id ? { id } : {}),
    metadata: metadata ?? {},
    dreaming: "instant",
  });
}

function collectStrings(x: any, out: string[], depth = 0) {
  if (!x || depth > 4 || out.length > 12) return;
  if (Array.isArray(x)) {
    for (const el of x) collectStrings(el, out, depth + 1);
    return;
  }
  if (typeof x === "object") {
    const direct = x.memory ?? x.content ?? x.text ?? x.chunk ?? x.summary;
    if (typeof direct === "string" && direct.trim()) {
      out.push(direct.trim());
      return;
    }
    for (const k of ["results", "memories", "chunks", "data", "documents", "related"]) {
      if (x[k]) collectStrings(x[k], out, depth + 1);
    }
  }
}

export async function smSearch(ns: string, query: string, limit = 6): Promise<string[]> {
  const res = await smFetch(
    `/ns/${encodeURIComponent(ns)}/search`,
    { query, searchMode: "hybrid", limit },
    4000,
  );
  const out: string[] = [];
  collectStrings(res, out);
  return Array.from(new Set(out)).slice(0, limit);
}

export const push = internalAction({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, { memoryId }) => {
    const m = await ctx.runQuery(internal.memories.getInternal, { memoryId });
    if (!m) return;
    const ns =
      m.scope === "family" || !m.ownerId ? familyNs(m.householdId) : memberNs(m.householdId, m.ownerId);
    const res = await smAdd(ns, m.text, `mem_${memoryId}`, { scope: m.scope, kind: "fact" });
    if (res) await ctx.runMutation(internal.memories.markSynced, { memoryId });
  },
});

/** Remove a memory's copy from Supermemory, using the scope/owner it was stored under. */
export const forget = internalAction({
  args: {
    memoryId: v.id("memories"),
    householdId: v.id("households"),
    ownerId: v.optional(v.id("members")),
    scope,
  },
  handler: async (_ctx, { memoryId, householdId, ownerId, scope }) => {
    const ns = scope === "family" || !ownerId ? familyNs(householdId) : memberNs(householdId, ownerId);
    await smFetch(`/ns/${encodeURIComponent(ns)}/document/mem_${memoryId}`, undefined, 5000, "DELETE");
  },
});

export const syncAll = internalAction({
  args: { householdId: v.id("households") },
  handler: async (ctx, { householdId }) => {
    const c = await ctx.runQuery(internal.households.context, { householdId });
    await Promise.all(
      c.memories.map(async (m) => {
        const ns =
          m.scope === "family" || !m.ownerId ? familyNs(householdId) : memberNs(householdId, m.ownerId);
        const res = await smAdd(ns, m.text, `mem_${m._id}`, { scope: m.scope, kind: "fact" });
        if (res) await ctx.runMutation(internal.memories.markSynced, { memoryId: m._id });
      }),
    );
  },
});
