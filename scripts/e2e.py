#!/usr/bin/env python3
"""End-to-end test of Kin's live backend (Convex + OpenAI + Supermemory + Whop + device webhook).

Run from the repo root:  python3 scripts/e2e.py
Uses `npx convex run` against the configured dev deployment.
"""
import json, subprocess, sys, time, urllib.request

SITE = None
for line in open(".env.local"):
    if line.startswith("EXPO_PUBLIC_CONVEX_SITE_URL="):
        SITE = line.split("=", 1)[1].strip()

passed, failed = [], []


def run(fn, args=None):
    r = subprocess.run(["npx", "convex", "run", fn, json.dumps(args or {})], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or "error")
    out = r.stdout.strip()
    return json.loads(out) if out and out[0] in "[{\"" else out


def check(name, cond, detail=""):
    (passed if cond else failed).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name + (f"  — {detail}" if detail else ""))


def wait_kin(h, m, mode="family", timeout=40):
    for _ in range(timeout // 2):
        msgs = run("messages:list", {"householdId": h, "memberId": m, "mode": mode})
        last = msgs[-1]
        if last["role"] == "kin" and not last.get("pending"):
            return last
        time.sleep(2)
    return msgs[-1]


print("\n🏡 Onboarding + sample data")
r = run("households:create", {"householdName": "The Miller Home", "name": "Sarah", "emoji": "👩", "role": "Mom"})
H, SARAH = r["householdId"], r["memberId"]
run("households:seedDemo", {"householdId": H, "memberId": SARAH})
members = run("households:members", {"householdId": H})
by = {m["name"]: m["_id"] for m in members}
check("5 family members", len(members) == 5, ", ".join(by))
mems = run("memories:visible", {"householdId": H, "memberId": SARAH})
check("house rules seeded", sum(1 for m in mems if m.get("rule")) == 4)
check("Mike's private memory hidden from Sarah", not any("surprise" in m["text"].lower() for m in mems))
devs = run("devices:list", {"householdId": H})
check("5 home devices connected", len(devs) == 5, ", ".join(d["name"] for d in devs))
code = run("households:get", {"householdId": H})["code"]

print("\n🧠 AI coordinator (OpenAI + Supermemory recall)")
run("messages:send", {"householdId": H, "memberId": SARAH, "text": "We're out of eggs, and Jake needs a snack for tomorrow's field trip", "visibility": "family"})
k = wait_kin(H, SARAH)
labels = " | ".join(a["label"] for a in (k.get("actions") or []))
check("Kin replied", bool(k["text"]), k["text"][:90])
check("eggs assigned to Mike (commute memory)", "Mike" in labels and "gg" in labels, labels[:120])
items = run("items:list", {"householdId": H, "memberId": SARAH})
snack = [i for i in items if "snack" in i["title"].lower() and i["status"] != "done"]
check("snack respects peanut allergy", any("nut" in i["title"].lower() for i in snack) or "nut" in k["text"].lower(), snack[0]["title"] if snack else "")
nudges = run("nudges:unseen", {"memberId": by["Mike"]})
check("Mike got a live nudge", len(nudges) > 0, nudges[0]["text"][:90] if nudges else "")

print("\n📜 House rules + parent authority")
run("messages:send", {"householdId": H, "memberId": by["Jake"], "text": "Can I play Fortnite now? It's a school night", "visibility": "family"})
k = wait_kin(H, by["Jake"])
check("Kin enforces 'homework first' rule for Jake", any(w in k["text"].lower() for w in ["homework", "rule", "volcano", "first"]), k["text"][:110])
parent_item = [i for i in items if i.get("createdById") == SARAH and i["status"] != "done"][0]
try:
    run("items:remove", {"itemId": parent_item["_id"], "memberId": by["Jake"]})
    check("kid can't delete a parent's task", False)
except RuntimeError as e:
    check("kid can't delete a parent's task", "Only a parent" in str(e), "blocked: Only a parent can change this")
jake_item = [i for i in items if i.get("assigneeId") == by["Jake"] and i["status"] == "open"][0]
run("items:followUp", {"itemId": jake_item["_id"], "byId": SARAH})
check("parent follow-up nudges Jake", any("checking in" in n["text"] for n in run("nudges:unseen", {"memberId": by["Jake"]})))
run("autopilot:sweep", {})
check("autopilot sweep runs", True)

print("\n🏠 IoT device webhook (POST /device)")
req = urllib.request.Request(f"{SITE}/device", data=json.dumps({"code": code, "device": "fridge", "event": "Egg tray is empty and milk expires tomorrow"}).encode(), headers={"Content-Type": "application/json"})
resp = json.loads(urllib.request.urlopen(req, timeout=20).read())
check("webhook accepted", resp.get("ok") is True)
k = wait_kin(H, SARAH)
check("Kin handled the fridge event", bool(k["text"]), k["text"][:100])

print("\n🔒 Private mode")
run("messages:send", {"householdId": H, "memberId": by["Mike"], "text": "Remind me to book the restaurant for Sarah's surprise 40th", "visibility": "private"})
wait_kin(H, by["Mike"], "private")
s_items = run("items:list", {"householdId": H, "memberId": SARAH})
check("surprise never reaches Sarah's lists", not any("surprise" in i["title"].lower() or "restaurant" in i["title"].lower() for i in s_items))
check("surprise not in family thread", not any("surprise" in m["text"].lower() for m in run("messages:list", {"householdId": H, "memberId": SARAH, "mode": "family"})))

print("\n🧩 Supermemory sync")
time.sleep(4)
mems = run("memories:visible", {"householdId": H, "memberId": SARAH})
synced = sum(1 for m in mems if m.get("synced"))
check("memories synced to Supermemory", synced >= len(mems) - 2, f"{synced}/{len(mems)}")

print("\n💳 Whop")
w = run("whop:createCheckout", {"householdId": H, "memberId": SARAH})
check("Whop checkout URL", bool(w.get("url")), w.get("url") or w.get("error"))

print(f"\n{len(passed)} passed, {len(failed)} failed")
if failed:
    print("FAILED:", ", ".join(failed))
print(f"\nTest family code: {code}")
sys.exit(1 if failed else 0)
