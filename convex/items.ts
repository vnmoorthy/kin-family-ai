import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { itemKind } from "./schema";

/** Everything the family shares + my own private items. Other people's private items never leave the server. */
export const list = query({
  args: { householdId: v.id("households"), memberId: v.optional(v.id("members")) },
  handler: async (ctx, { householdId, memberId }) => {
    const rows = await ctx.db
      .query("items")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .order("desc")
      .take(300);
    return rows.filter((i) => !i.privateTo || i.privateTo === memberId);
  },
});

export const add = mutation({
  args: {
    householdId: v.id("households"),
    kind: itemKind,
    title: v.string(),
    emoji: v.optional(v.string()),
    assigneeId: v.optional(v.id("members")),
    createdById: v.optional(v.id("members")),
    dueLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("items", {
      ...args,
      title: args.title.trim(),
      status: "open",
      source: "manual",
      createdAt: Date.now(),
    });
    if (args.assigneeId && args.assigneeId !== args.createdById) {
      const from = args.createdById ? await ctx.db.get(args.createdById) : null;
      await ctx.db.insert("nudges", {
        householdId: args.householdId,
        toId: args.assigneeId,
        fromId: args.createdById,
        itemId: id,
        emoji: args.emoji ?? "📌",
        text: `${from?.name ?? "Someone"} added “${args.title.trim()}” for you${args.dueLabel ? ` · ${args.dueLabel}` : ""}`,
        seen: false,
        createdAt: Date.now(),
      });
    }
    return id;
  },
});

export const toggleDone = mutation({
  args: { itemId: v.id("items"), memberId: v.id("members") },
  handler: async (ctx, { itemId, memberId }) => {
    const item = await ctx.db.get(itemId);
    if (!item) return;
    if (item.status === "done") {
      await ctx.db.patch(itemId, { status: "open", doneAt: undefined, doneById: undefined });
      return;
    }
    await ctx.db.patch(itemId, { status: "done", doneAt: Date.now(), doneById: memberId });
    // Close the loop: tell whoever asked for it.
    if (item.createdById && item.createdById !== memberId) {
      const me = await ctx.db.get(memberId);
      await ctx.db.insert("nudges", {
        householdId: item.householdId,
        toId: item.createdById,
        fromId: memberId,
        itemId,
        emoji: "✅",
        text: `${me?.name ?? "Someone"} finished “${item.title}”`,
        seen: false,
        createdAt: Date.now(),
      });
    }
  },
});

export const claim = mutation({
  args: { itemId: v.id("items"), memberId: v.id("members") },
  handler: async (ctx, { itemId, memberId }) => {
    const item = await ctx.db.get(itemId);
    if (!item) return;
    const prev = item.assigneeId;
    await ctx.db.patch(itemId, { assigneeId: memberId, status: "claimed" });
    const me = await ctx.db.get(memberId);
    const notify = new Set([prev, item.createdById].filter((x) => x && x !== memberId));
    for (const to of notify) {
      await ctx.db.insert("nudges", {
        householdId: item.householdId,
        toId: to!,
        fromId: memberId,
        itemId,
        emoji: "🙋",
        text: `${me?.name ?? "Someone"} said “I've got it” for “${item.title}”`,
        seen: false,
        createdAt: Date.now(),
      });
    }
  },
});

export const reassign = mutation({
  args: { itemId: v.id("items"), assigneeId: v.id("members"), byId: v.id("members") },
  handler: async (ctx, { itemId, assigneeId, byId }) => {
    const item = await ctx.db.get(itemId);
    if (!item) return;
    await ctx.db.patch(itemId, { assigneeId, status: "open" });
    if (assigneeId !== byId) {
      const by = await ctx.db.get(byId);
      await ctx.db.insert("nudges", {
        householdId: item.householdId,
        toId: assigneeId,
        fromId: byId,
        itemId,
        emoji: item.emoji ?? "📌",
        text: `${by?.name ?? "Someone"} passed “${item.title}” to you`,
        seen: false,
        createdAt: Date.now(),
      });
    }
  },
});

export const remove = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    await ctx.db.delete(itemId);
  },
});
