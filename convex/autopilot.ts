/**
 * Kin Autopilot: the household runs itself.
 * Every few minutes Kin looks at open items. If someone hasn't acted, Kin follows up with them,
 * and if they still don't, Kin escalates to a parent, so nobody has to nag and everybody follows through.
 */
import { internalMutation } from "./_generated/server";
import { isParent } from "./memories";

const FOLLOW_UP_AFTER_MS = 45 * 60_000; // first follow-up after 45 min
const ESCALATE_AFTER = 2; // after 2 follow-ups, tell a parent

export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const open = await ctx.db
      .query("items")
      .filter((q) => q.and(q.eq(q.field("status"), "open"), q.neq(q.field("assigneeId"), undefined)))
      .take(500);
    for (const item of open) {
      if (item.privateTo || item.kind === "event") continue;
      const last = item.lastNudgedAt ?? item.createdAt;
      if (now - last < FOLLOW_UP_AFTER_MS) continue;
      const n = (item.nudgeCount ?? 0) + 1;
      await ctx.db.patch(item._id, { nudgeCount: n, lastNudgedAt: now });
      const assignee = await ctx.db.get(item.assigneeId!);
      if (!assignee) continue;
      await ctx.db.insert("nudges", {
        householdId: item.householdId,
        toId: assignee._id,
        itemId: item._id,
        emoji: "⏰",
        text: `Friendly follow-up from Kin: “${item.title}” is still open${item.dueLabel ? ` (${item.dueLabel})` : ""}. Tap “I've got it” so everyone knows.`,
        seen: false,
        createdAt: now,
      });
      if (n >= ESCALATE_AFTER && !isParent(assignee.role)) {
        const members = await ctx.db
          .query("members")
          .withIndex("by_household", (q) => q.eq("householdId", item.householdId))
          .collect();
        const parent =
          members.find((m) => m._id === item.createdById && isParent(m.role)) ?? members.find((m) => isParent(m.role));
        if (parent) {
          await ctx.db.insert("nudges", {
            householdId: item.householdId,
            toId: parent._id,
            itemId: item._id,
            emoji: "👀",
            text: `Heads up: ${assignee.name} hasn't done “${item.title}” after ${n} reminders. Want to step in?`,
            seen: false,
            createdAt: now,
          });
        }
      }
    }
  },
});
