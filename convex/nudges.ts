import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const unseen = query({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) =>
    ctx.db
      .query("nudges")
      .withIndex("by_to_seen", (q) => q.eq("toId", memberId).eq("seen", false))
      .order("desc")
      .take(5),
});

export const markSeen = mutation({
  args: { nudgeId: v.id("nudges") },
  handler: async (ctx, { nudgeId }) => {
    const n = await ctx.db.get(nudgeId);
    if (n) await ctx.db.patch(nudgeId, { seen: true });
  },
});
