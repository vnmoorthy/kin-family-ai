import { v } from "convex/values";
import { mutation, query, internalQuery, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { insertDefaultDevices } from "./devices";

const COLORS = ["#FF6B4A", "#4A7DFF", "#2EC27E", "#B15CFF", "#FFB020", "#FF4F9A"];

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const get = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, { householdId }) => ctx.db.get(householdId),
});

export const members = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, { householdId }) =>
    ctx.db
      .query("members")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect(),
});

export const getMember = query({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => ctx.db.get(memberId),
});

export const lookupCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const h = await ctx.db
      .query("households")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .first();
    if (!h) return null;
    const members = await ctx.db
      .query("members")
      .withIndex("by_household", (q) => q.eq("householdId", h._id))
      .collect();
    return { household: h, members };
  },
});

export const create = mutation({
  args: {
    householdName: v.string(),
    name: v.string(),
    emoji: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    let code = makeCode();
    while (await ctx.db.query("households").withIndex("by_code", (q) => q.eq("code", code)).first()) {
      code = makeCode();
    }
    const householdId = await ctx.db.insert("households", {
      name: args.householdName.trim() || "Our Home",
      code,
      plan: "free",
      createdAt: Date.now(),
    });
    const memberId = await ctx.db.insert("members", {
      householdId,
      name: args.name.trim(),
      emoji: args.emoji,
      color: COLORS[0],
      role: args.role,
      lastSeenAt: Date.now(),
    });
    await ctx.db.insert("messages", {
      householdId,
      role: "kin",
      visibility: "family",
      text: `Hi ${args.name.trim()}! I'm Kin, your family's shared brain. Tell me anything going on at home — "we're out of eggs", "Arjun's science fair is Friday" — and I'll remember it, split it up and nudge the right person. Invite your family with code ${code}.`,
      createdAt: Date.now(),
    });
    return { householdId, memberId };
  },
});

export const join = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    emoji: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const h = await ctx.db
      .query("households")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .first();
    if (!h) throw new Error("No family with that code");
    const existing = await ctx.db
      .query("members")
      .withIndex("by_household", (q) => q.eq("householdId", h._id))
      .collect();
    const same = existing.find((m) => m.name.toLowerCase() === args.name.trim().toLowerCase());
    if (same) return { householdId: h._id, memberId: same._id };
    const memberId = await ctx.db.insert("members", {
      householdId: h._id,
      name: args.name.trim(),
      emoji: args.emoji,
      color: COLORS[existing.length % COLORS.length],
      role: args.role,
      lastSeenAt: Date.now(),
    });
    await ctx.db.insert("messages", {
      householdId: h._id,
      role: "kin",
      visibility: "family",
      text: `${args.emoji} ${args.name.trim()} joined the family. Welcome! Everything the family shares with me is now yours too.`,
      createdAt: Date.now(),
    });
    return { householdId: h._id, memberId };
  },
});

/** Claim an existing member profile (used on the "Who are you?" picker). */
export const touch = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    await ctx.db.patch(memberId, { lastSeenAt: Date.now() });
  },
});

export const updateMember = mutation({
  args: {
    memberId: v.id("members"),
    name: v.optional(v.string()),
    emoji: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, { memberId, ...rest }) => {
    const patch: Record<string, string> = {};
    for (const [k, val] of Object.entries(rest)) if (val) patch[k] = val;
    await ctx.db.patch(memberId, patch);
  },
});

export const setPlan = mutation({
  args: { householdId: v.id("households"), plan: v.union(v.literal("free"), v.literal("plus")) },
  handler: async (ctx, { householdId, plan }) => {
    await ctx.db.patch(householdId, { plan });
  },
});

export const context = internalQuery({
  args: { householdId: v.id("households") },
  handler: async (ctx, { householdId }) => {
    const household = await ctx.db.get(householdId);
    const members = await ctx.db
      .query("members")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();
    const items = await ctx.db
      .query("items")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .order("desc")
      .take(80);
    const memories = await ctx.db
      .query("memories")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .order("desc")
      .take(150);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .order("desc")
      .take(30);
    return { household, members, items, memories, messages: messages.reverse() };
  },
});

// ---------------------------------------------------------------------------
// Demo family: one tap seeds a realistic household so the demo never starts empty.
// ---------------------------------------------------------------------------

async function wipe(ctx: MutationCtx, householdId: Id<"households">) {
  for (const table of ["items", "messages", "memories"] as const) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();
    for (const r of rows) await ctx.db.delete(r._id);
  }
  const members = await ctx.db
    .query("members")
    .withIndex("by_household", (q) => q.eq("householdId", householdId))
    .collect();
  for (const m of members) {
    const ns = await ctx.db.query("nudges").withIndex("by_to_seen", (q) => q.eq("toId", m._id)).collect();
    for (const n of ns) await ctx.db.delete(n._id);
  }
}

export const seedDemo = mutation({
  args: { householdId: v.id("households"), memberId: v.id("members") },
  handler: async (ctx, { householdId, memberId }) => {
    await wipe(ctx, householdId);
    const me = await ctx.db.get(memberId);
    if (!me) throw new Error("member not found");
    let members = await ctx.db
      .query("members")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();
    const want = [
      { name: "Priya", emoji: "👩🏽", role: "Mom" },
      { name: "Raj", emoji: "👨🏽", role: "Dad" },
      { name: "Arjun", emoji: "🧒🏽", role: "Son, 12" },
      { name: "Paati", emoji: "👵🏽", role: "Grandma" },
    ];
    for (const w of want) {
      if (!members.find((m) => m.name.toLowerCase() === w.name.toLowerCase())) {
        await ctx.db.insert("members", {
          householdId,
          name: w.name,
          emoji: w.emoji,
          role: w.role,
          color: COLORS[members.length % COLORS.length],
          lastSeenAt: Date.now() - 3600_000,
        });
        members = await ctx.db
          .query("members")
          .withIndex("by_household", (q) => q.eq("householdId", householdId))
          .collect();
      }
    }
    const by = (n: string) => members.find((m) => m.name === n)?._id;
    const now = Date.now();
    const day = 86_400_000;
    const facts: [string, "family" | "private", Id<"members"> | undefined][] = [
      ["Arjun is allergic to peanuts — all snacks and lunches must be nut-free.", "family", by("Priya")],
      ["Raj drives past Costco and Trader Joe's on his commute home around 6pm.", "family", by("Raj")],
      ["Arjun has soccer practice Tuesdays and Thursdays at 5pm; Raj does pickup.", "family", by("Raj")],
      ["Paati takes blood-pressure medicine at 8am and 8pm every day.", "family", by("Priya")],
      ["Priya handles school forms and permission slips.", "family", by("Priya")],
      ["The family likes Saturday pancake breakfast — needs eggs, milk and blueberries.", "family", by("Paati")],
      ["Wi-Fi password is on the fridge; trash and recycling go out Wednesday night.", "family", by("Raj")],
      ["Arjun's science fair project (volcano) is due Friday — he needs poster board.", "family", by("Arjun")],
      ["Planning a surprise 40th birthday dinner for Priya on Dec 6.", "private", by("Raj")],
    ];
    for (const [text, scope, ownerId] of facts) {
      await ctx.db.insert("memories", {
        householdId,
        text,
        scope,
        ownerId,
        source: "manual",
        createdAt: now - Math.floor(Math.random() * 6) * day,
      });
    }
    const items: {
      kind: "task" | "grocery" | "event" | "reminder";
      title: string;
      emoji: string;
      who?: string;
      due?: string;
      status?: "open" | "claimed" | "done";
      ago?: number;
    }[] = [
      { kind: "grocery", title: "Milk (2 gallons)", emoji: "🥛", who: "Raj", due: "tonight" },
      { kind: "task", title: "Book Paati's eye checkup", emoji: "👓", who: "Priya", due: "this week" },
      { kind: "event", title: "Parent-teacher conference", emoji: "🏫", who: "Priya", due: "Tue 3:30 PM" },
      { kind: "grocery", title: "Blueberries", emoji: "🫐", who: "Raj", due: "before Saturday" },
      { kind: "task", title: "Take out trash & recycling", emoji: "🗑️", who: "Arjun", due: "Wed night" },
      { kind: "reminder", title: "Paati's 8pm BP medicine", emoji: "💊", who: "Paati", due: "8:00 PM" },
      { kind: "event", title: "Soccer practice pickup", emoji: "⚽️", who: "Raj", due: "Thu 5:00 PM" },
      { kind: "task", title: "Finish volcano science project", emoji: "🌋", who: "Arjun", due: "Friday" },
      { kind: "task", title: "Sign field-trip permission slip", emoji: "✍️", who: "Priya", due: "done", status: "done", ago: 2 },
      { kind: "task", title: "Water the plants", emoji: "🪴", who: "Paati", status: "done", ago: 1 },
      { kind: "grocery", title: "Rice (10 lb)", emoji: "🍚", who: "Raj", status: "done", ago: 3 },
    ];
    for (const it of items) {
      await ctx.db.insert("items", {
        householdId,
        kind: it.kind,
        title: it.title,
        emoji: it.emoji,
        assigneeId: it.who ? by(it.who) : undefined,
        createdById: by("Priya"),
        status: it.status ?? "open",
        dueLabel: it.due === "done" ? undefined : it.due,
        source: "kin",
        createdAt: now - 3 * 3600_000,
        doneAt: it.status === "done" ? now - (it.ago ?? 1) * 3600_000 : undefined,
        doneById: it.status === "done" && it.who ? by(it.who) : undefined,
      });
    }
    // A few days of history so the family streak is real.
    for (let d = 1; d <= 6; d++) {
      await ctx.db.insert("items", {
        householdId,
        kind: "task",
        title: ["Unload dishwasher", "Feed the fish", "Fold laundry", "Pack lunches", "Vacuum living room", "Return library books"][d - 1],
        emoji: ["🍽️", "🐠", "🧺", "🥪", "🧹", "📚"][d - 1],
        assigneeId: by(["Arjun", "Paati", "Priya", "Raj", "Arjun", "Priya"][d - 1]),
        status: "done",
        source: "manual",
        createdAt: now - d * day - 3600_000,
        doneAt: now - d * day,
        doneById: by(["Arjun", "Paati", "Priya", "Raj", "Arjun", "Priya"][d - 1]),
      });
    }
    await ctx.db.insert("messages", {
      householdId,
      role: "kin",
      visibility: "family",
      text: "Good evening, family 👋 I'm caught up: Arjun's volcano is due Friday, Paati's 8pm medicine is set, and Raj is on milk + blueberries for Saturday pancakes. Just tell me what's going on — I'll handle the who-does-what.",
      createdAt: now - 60_000,
    });
    await ctx.db.patch(householdId, { brief: undefined });
    await insertDefaultDevices(ctx, householdId);
    await ctx.scheduler.runAfter(0, internal.memoryActions.syncAll, { householdId });
    return null;
  },
});

export const resetAll = mutation({
  args: { householdId: v.id("households") },
  handler: async (ctx, { householdId }) => {
    await wipe(ctx, householdId);
    await ctx.db.patch(householdId, { brief: undefined });
  },
});
