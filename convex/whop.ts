/**
 * Kin Plus — family subscription sold through Whop (sandbox by default).
 * createCheckout -> returns a Whop hosted checkout URL with the household id in metadata.
 * Whop's payment webhook (convex/http.ts -> /whop) flips the household to "plus".
 */
import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";

const BASE = process.env.WHOP_API_BASE || "https://sandbox-api.whop.com/api/v1";

async function whop(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {}
  return { ok: res.ok, status: res.status, body };
}

export const createCheckout = action({
  args: { householdId: v.id("households"), memberId: v.id("members") },
  handler: async (_ctx, { householdId, memberId }): Promise<{ url?: string; error?: string }> => {
    if (!process.env.WHOP_API_KEY) return { error: "Whop isn't configured yet." };
    const metadata = { householdId, memberId, product: "kin_plus" };
    const companyId = process.env.WHOP_COMPANY_ID;
    const attempts: any[] = [];
    if (process.env.WHOP_PLAN_ID) attempts.push({ plan_id: process.env.WHOP_PLAN_ID, metadata });
    if (companyId)
      attempts.push({
        plan: {
          company_id: companyId,
          initial_price: 0,
          renewal_price: 4.99,
          billing_period: 30,
          plan_type: "renewal",
          currency: "usd",
        },
        metadata,
      });
    attempts.push({
      variant: { title: "Kin Plus — family", billing_type: "one_time", initial_price: 4.99, currency: "usd" },
      metadata,
    });
    let last = "";
    for (const body of attempts) {
      const r = await whop("/checkout_configurations", { method: "POST", body: JSON.stringify(body) });
      const url = r.body?.purchase_url ?? r.body?.data?.purchase_url ?? r.body?.url;
      if (r.ok && url) return { url };
      last = `${r.status} ${JSON.stringify(r.body).slice(0, 240)}`;
      console.warn("whop checkout attempt failed", last);
    }
    return { error: "Checkout unavailable right now." };
  },
});

export const markPlus = internalMutation({
  args: { householdId: v.string() },
  handler: async (ctx, { householdId }) => {
    const id = ctx.db.normalizeId("households", householdId);
    if (id) await ctx.db.patch(id, { plan: "plus" });
  },
});

