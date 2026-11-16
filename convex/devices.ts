/**
 * Kin Home: connected devices (fridge, door camera, robot vacuum, TV, washer…) report events,
 * and Kin turns each event into "who should handle this?" + a live nudge, the same way it
 * handles a message from a person.
 *
 * Any smart-home hub can post events to the HTTP endpoint in convex/http.ts:
 *   POST https://<deployment>.convex.site/device
 *   { "code": "<6-letter family code>", "device": "fridge", "event": "Egg tray is empty" }
 */
import { v } from "convex/values";
import { internalMutation, mutation, query, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const DEFAULT_DEVICES = [
  { kind: "fridge", name: "Smart Fridge", emoji: "🧊", room: "Kitchen" },
  { kind: "camera", name: "Front Door Cam", emoji: "📷", room: "Entrance" },
  { kind: "robot", name: "Robo Vacuum", emoji: "🤖", room: "Living room" },
  { kind: "tv", name: "Living Room TV", emoji: "📺", room: "Living room" },
  { kind: "washer", name: "Washer", emoji: "🧺", room: "Laundry" },
];

export async function insertDefaultDevices(ctx: MutationCtx, householdId: Id<"households">) {
  const existing = await ctx.db
    .query("devices")
    .withIndex("by_household", (q) => q.eq("householdId", householdId))
    .collect();
  for (const d of DEFAULT_DEVICES) {
    if (!existing.find((e) => e.kind === d.kind)) await ctx.db.insert("devices", { householdId, ...d });
  }
}

export const list = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, { householdId }) =>
    ctx.db
      .query("devices")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect(),
});

export const connectDemo = mutation({
  args: { householdId: v.id("households") },
  handler: async (ctx, { householdId }) => insertDefaultDevices(ctx, householdId),
});

async function fire(ctx: MutationCtx, deviceId: Id<"devices">, event: string) {
  const d = await ctx.db.get(deviceId);
  if (!d) throw new Error("device not found");
  const now = Date.now();
  await ctx.db.patch(deviceId, { lastEvent: event, lastEventAt: now });
  const userMessageId = await ctx.db.insert("messages", {
    householdId: d.householdId,
    role: "user",
    text: event,
    visibility: "family",
    deviceLabel: d.name,
    deviceEmoji: d.emoji,
    createdAt: now,
  });
  const kinMessageId = await ctx.db.insert("messages", {
    householdId: d.householdId,
    role: "kin",
    text: "",
    pending: true,
    visibility: "family",
    createdAt: now + 1,
  });
  await ctx.scheduler.runAfter(0, internal.ai.respond, { userMessageId, kinMessageId });
}

/** Simulate / relay a device event from the app. */
export const trigger = mutation({
  args: { deviceId: v.id("devices"), event: v.string() },
  handler: async (ctx, { deviceId, event }) => fire(ctx, deviceId, event.trim()),
});

/** Used by the public /device webhook. Creates the device on first contact. */
export const ingest = internalMutation({
  args: { code: v.string(), device: v.string(), event: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, { code, device, event, name }) => {
    const h = await ctx.db
      .query("households")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .first();
    if (!h) return { ok: false, error: "unknown family code" };
    const kind = device.trim().toLowerCase();
    const devices = await ctx.db
      .query("devices")
      .withIndex("by_household", (q) => q.eq("householdId", h._id))
      .collect();
    let d = devices.find((x) => x.kind === kind || x.name.toLowerCase() === kind);
    if (!d) {
      const preset = DEFAULT_DEVICES.find((p) => p.kind === kind);
      const id = await ctx.db.insert("devices", {
        householdId: h._id,
        kind,
        name: name ?? preset?.name ?? device,
        emoji: preset?.emoji ?? "🔌",
        room: preset?.room ?? "Home",
      });
      d = (await ctx.db.get(id))!;
    }
    await fire(ctx, d._id, event.trim());
    return { ok: true };
  },
});
