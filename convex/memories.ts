import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { scope } from "./schema";

/** Family memories + only *my* private memories. Other people's private memories never leave the server. */
export const visible = query({
  args: { householdId: v.id("households"), memberId: v.id("members") },
  handler: async (ctx, { householdId, memberId }) => {
    const all = await ctx.db
      .query("memories")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .order("desc")
      .take(300);
    return all.filter((m) => m.scope === "family" || m.ownerId === memberId);
  },
});

export const add = mutation({
  args: {
    householdId: v.id("households"),
    ownerId: v.id("members"),
    text: v.string(),
    scope,
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("memories", {
      ...args,
      text: args.text.trim(),
      source: "manual",
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.memoryActions.push, { memoryId: id });
    return id;
  },
});

export const setScope = mutation({
  args: { memoryId: v.id("memories"), scope },
  handler: async (ctx, { memoryId, scope }) => {
    await ctx.db.patch(memoryId, { scope, synced: false });
    await ctx.scheduler.runAfter(0, internal.memoryActions.push, { memoryId });
  },
});

export const remove = mutation({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, { memoryId }) => {
    await ctx.db.delete(memoryId);
  },
});

export const insertFromKin = internalMutation({
  args: {
    householdId: v.id("households"),
    ownerId: v.optional(v.id("members")),
    text: v.string(),
    scope,
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("memories", { ...args, source: "kin", createdAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.memoryActions.push, { memoryId: id });
    return id;
  },
});

export const markSynced = internalMutation({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, { memoryId }) => {
    const m = await ctx.db.get(memoryId);
    if (m) await ctx.db.patch(memoryId, { synced: true });
  },
});

export const getInternal = internalQuery({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, { memoryId }) => ctx.db.get(memoryId),
});
