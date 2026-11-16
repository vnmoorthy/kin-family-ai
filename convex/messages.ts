import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { scope } from "./schema";

/** The family thread + my private thread with Kin. Nobody else's private thread is ever returned. */
export const list = query({
  args: { householdId: v.id("households"), memberId: v.id("members"), mode: scope },
  handler: async (ctx, { householdId, memberId, mode }) => {
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .order("desc")
      .take(250);
    const mine = rows
      .filter((m) =>
        mode === "family" ? m.visibility === "family" : m.visibility === "private" && m.threadOwnerId === memberId,
      )
      .slice(0, 80)
      .reverse();
    return Promise.all(
      mine.map(async (m) => ({
        ...m,
        imageUrl: m.imageId ? await ctx.storage.getUrl(m.imageId) : null,
      })),
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

export const send = mutation({
  args: {
    householdId: v.id("households"),
    memberId: v.id("members"),
    text: v.string(),
    visibility: scope,
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const userMessageId = await ctx.db.insert("messages", {
      householdId: args.householdId,
      authorId: args.memberId,
      role: "user",
      text: args.text.trim(),
      visibility: args.visibility,
      threadOwnerId: args.visibility === "private" ? args.memberId : undefined,
      imageId: args.imageId,
      createdAt: now,
    });
    const kinMessageId = await ctx.db.insert("messages", {
      householdId: args.householdId,
      role: "kin",
      text: "",
      pending: true,
      visibility: args.visibility,
      threadOwnerId: args.visibility === "private" ? args.memberId : undefined,
      createdAt: now + 1,
    });
    await ctx.db.patch(args.memberId, { lastSeenAt: now });
    await ctx.scheduler.runAfter(0, internal.ai.respond, { userMessageId, kinMessageId });
    return { userMessageId, kinMessageId };
  },
});

export const getInternal = internalMutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const m = await ctx.db.get(messageId);
    if (!m) return null;
    return { ...m, imageUrl: m.imageId ? await ctx.storage.getUrl(m.imageId) : null };
  },
});

export const finishKin = internalMutation({
  args: {
    kinMessageId: v.id("messages"),
    text: v.string(),
    actions: v.optional(v.array(v.object({ icon: v.string(), label: v.string() }))),
  },
  handler: async (ctx, { kinMessageId, text, actions }) => {
    await ctx.db.patch(kinMessageId, { text, actions, pending: false });
  },
});
