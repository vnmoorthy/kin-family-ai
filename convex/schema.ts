import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const itemKind = v.union(
  v.literal("task"),
  v.literal("grocery"),
  v.literal("event"),
  v.literal("reminder"),
);
export const itemStatus = v.union(v.literal("open"), v.literal("claimed"), v.literal("done"));
export const scope = v.union(v.literal("family"), v.literal("private"));

export default defineSchema({
  households: defineTable({
    name: v.string(),
    code: v.string(),
    plan: v.union(v.literal("free"), v.literal("plus")),
    brief: v.optional(v.object({ text: v.string(), generatedAt: v.number() })),
    createdAt: v.number(),
  }).index("by_code", ["code"]),

  members: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    emoji: v.string(),
    color: v.string(),
    role: v.string(),
    lastSeenAt: v.number(),
  }).index("by_household", ["householdId"]),

  items: defineTable({
    householdId: v.id("households"),
    kind: itemKind,
    title: v.string(),
    notes: v.optional(v.string()),
    emoji: v.optional(v.string()),
    assigneeId: v.optional(v.id("members")),
    createdById: v.optional(v.id("members")),
    status: itemStatus,
    dueLabel: v.optional(v.string()),
    source: v.union(v.literal("kin"), v.literal("manual"), v.literal("snap")),
    createdAt: v.number(),
    doneAt: v.optional(v.number()),
    doneById: v.optional(v.id("members")),
  })
    .index("by_household", ["householdId"])
    .index("by_household_status", ["householdId", "status"]),

  messages: defineTable({
    householdId: v.id("households"),
    authorId: v.optional(v.id("members")),
    role: v.union(v.literal("user"), v.literal("kin")),
    text: v.string(),
    visibility: scope,
    // For private threads: whose private thread this belongs to.
    threadOwnerId: v.optional(v.id("members")),
    imageId: v.optional(v.id("_storage")),
    actions: v.optional(
      v.array(v.object({ icon: v.string(), label: v.string() })),
    ),
    pending: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_household", ["householdId"]),

  memories: defineTable({
    householdId: v.id("households"),
    ownerId: v.optional(v.id("members")),
    scope: scope,
    text: v.string(),
    source: v.union(v.literal("kin"), v.literal("manual")),
    synced: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_household", ["householdId"]),

  nudges: defineTable({
    householdId: v.id("households"),
    toId: v.id("members"),
    fromId: v.optional(v.id("members")),
    text: v.string(),
    emoji: v.string(),
    itemId: v.optional(v.id("items")),
    seen: v.boolean(),
    createdAt: v.number(),
  }).index("by_to_seen", ["toId", "seen"]),
});
