import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Button, Card, Press, Sheet, T, tap, timeAgo } from "@/components/ui";
import { C, R, onTheme } from "@/lib/theme";

/** What each kind of device can report. In production these come from the hub via POST /device. */
const EVENTS: Record<string, string[]> = {
  fridge: ["Egg tray is empty", "Milk expires tomorrow", "Only 1 bottle of water left", "Fridge door left open for 5 minutes"],
  camera: ["Package left at the front door", "Jake just got home from school", "Someone is at the door", "Garage door left open"],
  robot: ["Dustbin is full", "Stuck under Jake's bed", "Finished cleaning the living room", "Found a lost earring under the sofa"],
  tv: ["Jake has watched 2 hours of TV today", "Movie night: family is on the couch", "Grandma's show starts in 10 minutes"],
  washer: ["Laundry is done, clothes are wet", "Detergent is running low", "Cycle finished 2 hours ago, clothes still inside"],
};

export default function HomeDevices({ householdId }: { householdId: Id<"households"> }) {
  const devices = useQuery(api.devices.list, { householdId });
  const connect = useMutation(api.devices.connectDemo);
  const trigger = useMutation(api.devices.trigger);
  const [sel, setSel] = useState<Doc<"devices"> | null>(null);
  const [sent, setSent] = useState("");

  if (devices === undefined) return null;
  return (
    <>
      <View style={s.head}>
        <T style={s.section}>Your home</T>
        <T style={{ color: C.muted, fontWeight: "600" }}>{devices.length ? `${devices.length} connected` : ""}</T>
      </View>
      {devices.length === 0 ? (
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Text style={{ fontSize: 34 }}>🏠</Text>
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: "800" }}>Connect your home</T>
            <T style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>Fridge, door camera, robot vacuum, TV, washer: Kin turns what they notice into who-does-what.</T>
          </View>
          <Press onPress={() => (tap("success"), connect({ householdId }))} style={s.connect}>
            <T style={{ color: C.white, fontWeight: "800", fontSize: 13 }}>Connect</T>
          </Press>
        </Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8 }}>
          {devices.map((d) => (
            <Press key={d._id} onPress={() => (setSent(""), setSel(d))} style={s.tile}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 28 }}>{d.emoji}</Text>
                <View style={s.live}>
                  <View style={s.liveDot} />
                  <T style={{ fontSize: 10.5, fontWeight: "800", color: C.grocery }}>LIVE</T>
                </View>
              </View>
              <T style={{ fontWeight: "800", marginTop: 8 }} numberOfLines={1}>
                {d.name}
              </T>
              <T style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
                {d.room}
              </T>
              <T style={{ color: C.ink2, fontSize: 12.5, marginTop: 8, minHeight: 34 }} numberOfLines={2}>
                {d.lastEvent ? `“${d.lastEvent}” · ${timeAgo(d.lastEventAt ?? Date.now())}` : "All quiet"}
              </T>
            </Press>
          ))}
        </ScrollView>
      )}

      <Sheet visible={!!sel} onClose={() => setSel(null)}>
        {sel ? (
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ fontSize: 38 }}>{sel.emoji}</Text>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 20, fontWeight: "900" }}>{sel.name}</T>
                <T style={{ color: C.muted }}>{sel.room} · connected to Kin</T>
              </View>
            </View>
            <T style={{ color: C.muted, fontWeight: "800", fontSize: 12, letterSpacing: 0.6, marginTop: 18, marginBottom: 8 }}>
              WHEN IT NOTICES…
            </T>
            <View style={{ gap: 8 }}>
              {(EVENTS[sel.kind] ?? ["Something needs attention"]).map((e) => (
                <Press
                  key={e}
                  onPress={async () => {
                    tap("success");
                    await trigger({ deviceId: sel._id, event: e });
                    setSent(e);
                  }}
                  style={s.event}
                >
                  <T style={{ flex: 1, fontWeight: "600" }}>{e}</T>
                  <T style={{ color: C.muted, fontWeight: "800" }}>→ Kin</T>
                </Press>
              ))}
            </View>
            {sent ? (
              <T style={{ color: C.grocery, fontWeight: "700", marginTop: 12 }}>
                ✓ Sent to Kin. It's deciding who should handle “{sent}”.
              </T>
            ) : (
              <T style={{ color: C.muted, fontSize: 12.5, marginTop: 12 }}>
                Real devices post these to Kin's webhook (POST /device) from Home Assistant, SmartThings or a robot SDK.
              </T>
            )}
            <Button dark={false} label="Done" style={{ marginTop: 14 }} onPress={() => setSel(null)} />
          </View>
        ) : null}
      </Sheet>
    </>
  );
}

const s_ = () => StyleSheet.create({
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 24, marginBottom: 10, paddingHorizontal: 2 },
  section: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  connect: { backgroundColor: C.black, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 9 },
  tile: { width: 150, backgroundColor: C.card, borderRadius: R.lg, padding: 14, borderWidth: 1, borderColor: C.line },
  live: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8F8EE", borderRadius: R.pill, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.grocery },
  event: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.chip, borderRadius: R.md, padding: 14 },
});
let s = s_();
onTheme(() => {
  s = s_();
});
