# Kin live demo runbook (10 minutes)

**Cast:** Phone A = **Priya (Mom)**. Phone B = **Raj (Dad)**. Put both on the projector or hold them side by side.
**Story in one line:** Priya says it once, Kin remembers, picks the right person, and Raj's phone buzzes.

---

## Pre-flight (T-15 min)

- [ ] `npx convex dev` is running, and `npx convex env list` shows `OPENAI_API_KEY`, `SUPERMEMORY_API_KEY`, `WHOP_API_KEY`.
- [ ] Both phones have Expo Go open on the same dev server, or Phone B has the web build open: https://vnmoorthy.github.io/kin-family-ai/
- [ ] Phone A's camera roll has a **school flyer** photo, for example "Field trip to the Science Museum, Fri Nov 21, $15, permission slip due Wed, bring a packed lunch". Add a **fridge** photo with no eggs as a backup.
- [ ] Ringer and haptics are on, and brightness is at max.
- [ ] **Private-mode check.** Do one dry run of the surprise-party line from Raj's 🔒 Just me, then check **Lists** on Priya's phone. If a "Book restaurant" item shows up there, use the safer line in step 6. Today's build saves list items to the household, even when Kin creates them from a private chat.
- [ ] Dry-run done? Reset with Family sheet → **Load sample family**.

---

## 0:00 Hook (30s)

> "In most homes, one person is the router. Usually mom. She notices we're out of eggs, remembers who drives past the store, and texts until it's done. Kin is one shared brain for the whole family, so the AI does the routing."

## 0:30 Priya starts the family (Phone A, 1 min)

1. **Start a family** → name **Priya**, pick 👩🏽, role **Mom**.
2. Family name: **The Sharma Home**. Leave **Fill with a sample family** on.
3. **Create our family**.

**On screen:** Home shows Priya's big number (**2 things on you**), her ring, the black **Kin brief** card ("Good evening, Priya…"), **Family today** rings for Priya, Raj, Arjun, and Paati, **Recently handled**, and the **🔥 streak** from a week of history.

> "The sample family comes with a week of memory: Arjun's peanut allergy, Raj's commute past Trader Joe's, Paati's 8pm medicine."

## 1:30 Raj joins (Phone B, 45s)

1. Phone A: tap the **avatar stack** (top right) to open the Family sheet, then **Copy** the 6-letter **INVITE CODE** and read it out.
2. Phone B: **Join with a code**, type the code, and under "Tap your name if you're already here" tap **Raj**.

**On screen (Phone B):** Raj's Home shows **3 things on you**: milk, blueberries, soccer pickup.

## 2:15 The magic moment: eggs (Phone A → Phone B, 1.5 min)

1. Phone A: open the **Kin** tab (Family thread). Type or tap the chip:
   **`We're out of eggs 🥚`**
2. **Phone A:** Kin's thinking dots, then a reply like *"On it! Raj drives past Trader Joe's on his way home, so eggs are on him."* Under it are chips: **🥚 Eggs → Raj** and **🔔 Nudged Raj** (Kin's wording varies).
3. **Phone B, same moment:** a black banner drops in from the top with a haptic:
   **🥚 "Hey Raj — Priya noticed we're out of eggs. Grab a dozen at Trader Joe's on your way home?"**
   Raj's number goes from 3 to **4 things on you**.

> "Nobody texted Raj. Kin knew he drives past Trader Joe's, because the family told it once."

## 3:45 Close the loop (Phone B → Phone A, 45s)

1. Phone B: under **For you**, tap the circle next to **Eggs** to check it off.
2. **Phone A:** banner **"✅ Raj finished 'Eggs…'"**. On Priya's Home, Raj's ring fills, and Eggs shows up under **Recently handled**.

Optional: on Phone B open **Lists**, tap an item, and tap **I've got it**. Whoever asked gets "🙋 Raj said 'I've got it'".

## 4:30 Snap a school flyer (Phone A, 1.5 min)

1. Phone A: tap the black **＋**, choose **Photo** (or **Snap** to use the camera), and pick the flyer.
2. **On screen:** Kin reads the flyer and creates the **event** (field trip Fri), the **form** (permission slip, assigned to Priya because she handles school forms), and a **nut-free packed lunch**, since Arjun is allergic to peanuts.
3. Phone B or the Lists tab: the new items appear live. Filter by person to show who has what.

> "A photo turns into tasks for three different people, and Kin respected the allergy without being asked."

Backup: snap the **fridge** photo. Kin lists the missing staples as groceries, mostly assigned to Raj.

## 6:00 Private mode: the surprise party (Phone B → Phone A, 1.5 min)

1. Phone B: open the **Kin** tab and switch to **🔒 Just me**. The subtitle reads "Private · only you see this".
2. Type:
   **`Planning Priya's surprise 40th on Dec 6 — remind me to book the restaurant`**
   *Safer line, if the pre-flight check showed private items leaking onto Lists:* **`Remember privately: I'm planning Priya's surprise 40th on Dec 6 and still need to book the restaurant`**
3. **Phone B:** Kin replies privately, with a 🔒 **Remembered…** chip.
4. **Phone A, the reveal:** Priya's Kin Family thread shows nothing new. Her **Family Brain → Only me** tab shows only *her* private notes. There's no banner and no nudge.
5. Phone B: **Brain → 🔒 Only me** shows the surprise-party memory. It sits in Raj's private Supermemory namespace (`kin_<household>_<raj>`), not the family one.

> "Every person keeps a private memory. Kin uses it only when you're talking to it privately, and the server never sends it to anyone else's phone."

## 7:30 Family Brain (Phone A, 1 min)

1. Phone A: open the **Brain** tab, **👨‍👩‍👧 Shared with family**. Point at the facts Kin used today (peanut allergy, Trader Joe's commute, soccer pickup) and the **● Supermemory** sync badges.
2. Teach it something: **`Paati's eye doctor is Dr. Mehta on El Camino`** → **＋**. It syncs and is shared with the family.
3. Tap any memory to show **Make private (only me)** and **Forget this**.

## 8:30 Kin Plus with Whop (Phone A, 45s)

1. Phone A: open the Family sheet, find the **Kin Plus** card ($4.99/mo), and tap **Upgrade with Whop**.
2. Whop's hosted checkout opens (sandbox). Complete it with Whop's sandbox test flow.
3. When Whop's webhook hits `/whop`, the card flips to **ACTIVE** with "🎉 Your family is on Plus."

> "Families pay $4.99 a month. That's less than one forgotten-groceries trip."

## 9:15 Close (45s)

> "Kin is one shared brain for the family. Convex keeps every phone live, Supermemory gives it a long-term memory with private corners, Whop handles the subscription, and we built it with Capy and tested it on Revyl. Next up: SMS for grandparents, calendar and email ingest, and location nudges like 'you're near Costco'."

---

## Fallbacks

| Problem | Do this |
|---|---|
| **No second phone** | Run the whole demo on Phone A. Family sheet → **Be Raj** switches profiles. Raj's unseen nudges drop in right after you switch, so send as Priya and then tap **Be Raj**. Switch back with **Be Priya**. |
| **Second phone can't reach the dev server** | Open the web build on a laptop or phone: https://vnmoorthy.github.io/kin-family-ai/, then join with the code and tap Raj. |
| **Missed the banner** (it auto-hides after about 7s) | The item is still on Raj's Home under **For you**, and in Lists filtered to Raj. Send another line, like "Arjun needs poster board for the volcano". |
| **Kin replies "I'm not connected to my brain yet"** | `OPENAI_API_KEY` is missing: `npx convex env set OPENAI_API_KEY sk-...`, then resend. |
| **Kin is slow** (over 10s) | Talk over it. The thinking dots are live on every phone. Kin retries with `gpt-4o-mini` automatically. |
| **Supermemory badge says "○ syncing"** | Fine for the demo. Convex keeps a live mirror, so Kin still uses every fact. |
| **Whop checkout won't open or the webhook doesn't fire** | Say "this is Whop's hosted checkout in sandbox", then flip the plan by hand: `npx convex run households:setPlan '{"householdId":"<id>","plan":"plus"}'` (copy the id from the Convex dashboard). |
| **Camera permission or no photo** | Use **Photo** (library) instead of **Snap**, or type the flyer: "Arjun's field trip is Friday, permission slip due Wednesday, bring a packed lunch". |
| **Demo state got messy** | Family sheet → **Load sample family**. It wipes lists, chat, memory, and nudges, then re-seeds Priya, Raj, Arjun, and Paati. |
