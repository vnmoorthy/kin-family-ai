/**
 * Kin's brain: one family memory, many people.
 *
 * Flow for every message (text or photo):
 *   1. Load the live household (members, open items, recent chat) from Convex
 *   2. Recall: family memory (+ the speaker's private memory in private mode) from Convex
 *      and semantic recall from Supermemory
 *   3. Ask the LLM to decide what to DO: add/assign items, nudge people, remember facts, close items
 *   4. Apply those actions in one Convex mutation -> every family phone updates instantly
 */
import { v } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { familyNs, memberNs, smAdd, smSearch } from "./memoryActions";

type KinAction =
  | {
      type: "add_item";
      kind: "task" | "grocery" | "event" | "reminder";
      title: string;
      emoji?: string;
      assignee?: string | null;
      due?: string | null;
      nudge?: string | null;
    }
  | { type: "complete_item"; id: string }
  | { type: "remember"; text: string; scope?: "family" | "private" }
  | { type: "nudge"; to: string; text: string; emoji?: string };

function nowString() {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function callLLM(messages: any[], json = true): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  const models = [process.env.OPENAI_MODEL || "gpt-4.1-mini", "gpt-4o-mini"];
  let lastErr = "";
  for (const model of models) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.4,
          ...(json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: ctrl.signal,
      });
      const body = await res.json();
      if (!res.ok) {
        lastErr = `${model}: ${res.status} ${JSON.stringify(body).slice(0, 200)}`;
        console.warn("openai", lastErr);
        continue;
      }
      return body.choices?.[0]?.message?.content ?? "";
    } catch (e) {
      lastErr = String(e);
      console.warn("openai error", model, lastErr);
    } finally {
      clearTimeout(t);
    }
  }
  throw new Error(lastErr || "LLM failed");
}

function describeItems(items: Doc<"items">[], members: Doc<"members">[]) {
  const name = (id?: Id<"members">) => members.find((m) => m._id === id)?.name ?? "unassigned";
  return items
    .filter((i) => i.status !== "done")
    .slice(0, 40)
    .map((i) => `- [${i._id}] ${i.kind}: ${i.title} → ${name(i.assigneeId)}${i.dueLabel ? ` (${i.dueLabel})` : ""}${i.status === "claimed" ? " [claimed]" : ""}`)
    .join("\n");
}

export const respond = internalAction({
  args: { userMessageId: v.id("messages"), kinMessageId: v.id("messages") },
  handler: async (ctx, { userMessageId, kinMessageId }) => {
    const msg = await ctx.runMutation(internal.messages.getInternal, { messageId: userMessageId });
    if (!msg || !msg.authorId) return;
    const householdId = msg.householdId;
    const c = await ctx.runQuery(internal.households.context, { householdId });
    const speaker = c.members.find((m) => m._id === msg.authorId)!;
    const isPrivate = msg.visibility === "private";
    // Family mode never sees anyone's private items; private mode sees only the speaker's.
    const visibleItems = c.items.filter((i) => !i.privateTo || (isPrivate && i.privateTo === speaker._id));

    // ---- Recall -------------------------------------------------------------
    const familyFacts = c.memories.filter((m) => m.scope === "family").map((m) => m.text);
    const myPrivate = c.memories
      .filter((m) => m.scope === "private" && m.ownerId === speaker._id)
      .map((m) => m.text);
    const q = msg.text || "photo from the family";
    const [smFamily, smMine] = await Promise.all([
      smSearch(familyNs(householdId), q, 6),
      isPrivate ? smSearch(memberNs(householdId, speaker._id), q, 4) : Promise.resolve([] as string[]),
    ]);
    const recalled = Array.from(new Set([...smFamily, ...smMine])).filter(
      (s) => !familyFacts.includes(s) && !myPrivate.includes(s),
    );

    const recent = c.messages
      .filter((m) => m.visibility === "family" || m.threadOwnerId === speaker._id)
      .filter((m) => !m.pending && m._id !== userMessageId)
      .slice(-12)
      .map((m) => {
        const who = m.role === "kin" ? "Kin" : c.members.find((x) => x._id === m.authorId)?.name ?? "Someone";
        return `${who}: ${m.text}`;
      })
      .join("\n");

    const system = `You are Kin, the shared AI brain of the "${c.household?.name}" family. You are the household coordinator so that no single person (usually mom) has to chase everyone. You remember everything the family tells you and you turn it into action: you assign the right person, nudge them, and close the loop.

Now: ${nowString()} (Pacific).
Family members:
${c.members.map((m) => `- ${m.name} (${m.role})`).join("\n")}

Speaker: ${speaker.name} (${speaker.role}).
Mode: ${isPrivate ? `PRIVATE chat — only ${speaker.name} sees your reply.` : "FAMILY thread — everyone in the family sees your reply."}

Family memory (shared with the whole family):
${familyFacts.slice(0, 60).map((f) => `- ${f}`).join("\n") || "- (nothing yet)"}
${isPrivate ? `\n${speaker.name}'s PRIVATE memory (never reveal to others, never put in nudges):\n${myPrivate.map((f) => `- ${f}`).join("\n") || "- (nothing yet)"}` : ""}
${recalled.length ? `\nAlso recalled by long-term memory:\n${recalled.map((f) => `- ${f}`).join("\n")}` : ""}

Open items (id in brackets):
${describeItems(visibleItems, c.members) || "- (none)"}

Recent conversation:
${recent || "(none)"}

How to act:
- Turn what the speaker says (or shows in a photo) into concrete items. Assign each to the BEST person using memory (who passes which store, who handles school forms, schedules, roles). Don't assign everything to the speaker; that's the point of Kin. Kids get kid-appropriate tasks.
- For each assigned item, write a short warm nudge in Kin's voice addressed to the assignee, e.g. "Hey Raj 🥚 Priya noticed we're out of eggs — can you grab a dozen at Trader Joe's on your way home?"
- Save durable facts (allergies, schedules, routines, preferences, important dates, who-does-what) with "remember". Use scope "private" only in private mode or when the speaker says it's private/secret/a surprise.
- If someone says they did something, complete the matching open item by id.
- Questions: answer from memory and open items, specifically.
- Photos: fridge/pantry → groceries that look missing or low for staples the family uses; school flyer/letter → ALWAYS add the event itself (kind "event", with date/time in "due") plus forms, payments and things to bring; homework → tasks with due dates; receipt → complete matching grocery items.
- Never duplicate an existing open item. Respect allergies (e.g. say nut-free) when adding food.
- In FAMILY mode never reveal anyone's private memory.
- In PRIVATE mode, anything you add is private to ${speaker.name}: assign it to ${speaker.name} and do not nudge anyone else (it might be a surprise).

Reply with ONLY a JSON object:
{"reply": "<= 55 words, warm, specific, mention who you assigned and the reason in a few words",
 "actions": [
  {"type":"add_item","kind":"task|grocery|event|reminder","title":"...","emoji":"one emoji","assignee":"member name or null","due":"short label like tonight / Fri 5pm, or null","nudge":"message to assignee or null"},
  {"type":"complete_item","id":"<item id>"},
  {"type":"remember","text":"...","scope":"family|private"},
  {"type":"nudge","to":"member name","text":"...","emoji":"one emoji"}
 ]}`;

    const userContent: any[] = [{ type: "text", text: msg.text || "(sent a photo)" }];
    if (msg.imageUrl) userContent.push({ type: "image_url", image_url: { url: msg.imageUrl } });

    let parsed: { reply?: string; actions?: KinAction[] } = {};
    try {
      const raw = await callLLM([
        { role: "system", content: system },
        { role: "user", content: userContent },
      ]);
      parsed = JSON.parse(raw);
    } catch (e) {
      const err = String(e);
      await ctx.runMutation(internal.messages.finishKin, {
        kinMessageId,
        text: err.includes("NO_KEY")
          ? "I'm not connected to my brain yet — add OPENAI_API_KEY to Convex env and try again."
          : "Sorry, I blanked for a second. Could you say that again?",
      });
      return;
    }

    const chips = await ctx.runMutation(internal.ai.apply, {
      householdId,
      speakerId: speaker._id,
      isPrivate,
      actions: JSON.stringify(parsed.actions ?? []),
    });
    await ctx.runMutation(internal.messages.finishKin, {
      kinMessageId,
      text: parsed.reply || "Done.",
      actions: chips,
    });

    // Let Supermemory "dream" over the conversation to extract new long-term memories.
    const transcript = `${speaker.name}: ${msg.text || "(photo)"}\nKin: ${parsed.reply ?? ""}`;
    await smAdd(
      isPrivate ? memberNs(householdId, speaker._id) : familyNs(householdId),
      transcript,
      `chat_${userMessageId}`,
      { kind: "conversation", speaker: speaker.name },
    );
  },
});

export const apply = internalMutation({
  args: {
    householdId: v.id("households"),
    speakerId: v.id("members"),
    isPrivate: v.boolean(),
    actions: v.string(),
  },
  handler: async (ctx, { householdId, speakerId, isPrivate, actions }) => {
    let list: KinAction[] = [];
    try {
      list = JSON.parse(actions);
    } catch {
      return [];
    }
    const members = await ctx.db
      .query("members")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();
    const speaker = members.find((m) => m._id === speakerId);
    const find = (n?: string | null) => {
      if (!n) return undefined;
      const s = n.toLowerCase().trim();
      return (
        members.find((m) => m.name.toLowerCase() === s) ??
        members.find((m) => s.includes(m.name.toLowerCase()) || m.role.toLowerCase().startsWith(s))
      );
    };
    const chips: { icon: string; label: string }[] = [];
    const now = Date.now();
    for (const a of list.slice(0, 12)) {
      if (a.type === "add_item" && a.title) {
        const kind = (["task", "grocery", "event", "reminder"] as const).includes(a.kind as any) ? a.kind : "task";
        const who = isPrivate ? speaker : find(a.assignee);
        const itemId = await ctx.db.insert("items", {
          householdId,
          kind,
          title: a.title.slice(0, 120),
          emoji: a.emoji || (kind === "grocery" ? "🛒" : kind === "event" ? "📅" : kind === "reminder" ? "⏰" : "✅"),
          assigneeId: who?._id,
          createdById: speakerId,
          status: "open",
          dueLabel: a.due || undefined,
          source: "kin",
          createdAt: now,
          privateTo: isPrivate ? speakerId : undefined,
        });
        chips.push({ icon: isPrivate ? "🔒" : a.emoji || "📌", label: `${a.title}${who ? ` → ${isPrivate ? "you, privately" : who.name}` : ""}` });
        if (who && who._id !== speakerId) {
          await ctx.db.insert("nudges", {
            householdId,
            toId: who._id,
            fromId: speakerId,
            itemId,
            emoji: a.emoji || "📌",
            text: a.nudge || `${speaker?.name ?? "Family"} needs you: ${a.title}${a.due ? ` · ${a.due}` : ""}`,
            seen: false,
            createdAt: now,
          });
        }
      } else if (a.type === "complete_item" && a.id) {
        const item = await ctx.db.get(a.id as Id<"items">).catch(() => null);
        if (item && item.householdId === householdId && item.status !== "done") {
          await ctx.db.patch(item._id, { status: "done", doneAt: now, doneById: speakerId });
          chips.push({ icon: "✅", label: `Done: ${item.title}` });
          if (item.createdById && item.createdById !== speakerId) {
            await ctx.db.insert("nudges", {
              householdId,
              toId: item.createdById,
              fromId: speakerId,
              itemId: item._id,
              emoji: "✅",
              text: `${speaker?.name ?? "Someone"} finished “${item.title}”`,
              seen: false,
              createdAt: now,
            });
          }
        }
      } else if (a.type === "remember" && a.text) {
        const scope: "family" | "private" =
          a.scope === "private" || (isPrivate && a.scope !== "family") ? "private" : "family";
        const memoryId = await ctx.db.insert("memories", {
          householdId,
          ownerId: speakerId,
          text: a.text.slice(0, 300),
          scope,
          source: "kin",
          createdAt: now,
        });
        await ctx.scheduler.runAfter(0, internal.memoryActions.push, { memoryId });
        chips.push({ icon: scope === "private" ? "🔒" : "🧠", label: `Remembered: ${a.text.slice(0, 60)}` });
      } else if (a.type === "nudge" && a.to && a.text && !isPrivate) {
        const who = find(a.to);
        if (who && who._id !== speakerId) {
          await ctx.db.insert("nudges", {
            householdId,
            toId: who._id,
            fromId: speakerId,
            emoji: a.emoji || "🔔",
            text: a.text.slice(0, 200),
            seen: false,
            createdAt: now,
          });
          chips.push({ icon: "🔔", label: `Nudged ${who.name}` });
        }
      }
    }
    return chips;
  },
});

/** A 2–3 sentence personal brief for the Home screen ("what do I need to do today?"). */
export const brief = action({
  args: { householdId: v.id("households"), memberId: v.id("members") },
  handler: async (ctx, { householdId, memberId }): Promise<string> => {
    const c = await ctx.runQuery(internal.households.context, { householdId });
    const me = c.members.find((m) => m._id === memberId);
    if (!me) return "";
    const facts = c.memories
      .filter((m) => m.scope === "family" || m.ownerId === memberId)
      .slice(0, 40)
      .map((m) => `- ${m.text}`)
      .join("\n");
    try {
      const raw = await callLLM(
        [
          {
            role: "system",
            content: `You are Kin, a warm family AI. Write ${me.name}'s personal brief for right now (${nowString()}). Max 45 words, 2-3 short sentences, start with a greeting by name, mention their own open items first (most urgent), then one helpful family heads-up. No lists, no markdown. Return JSON {"brief": "..."}.

Family: ${c.members.map((m) => `${m.name} (${m.role})`).join(", ")}
Memory:\n${facts}
Open items:\n${describeItems(c.items.filter((i) => !i.privateTo || i.privateTo === memberId), c.members)}`,
          },
          { role: "user", content: "Brief me." },
        ],
        true,
      );
      return JSON.parse(raw).brief ?? "";
    } catch {
      return "";
    }
  },
});
