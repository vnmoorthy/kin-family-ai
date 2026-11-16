import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Modal, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Avatar, Button, Card, Press, T, tap, timeAgo } from "@/components/ui";
import { useSession } from "@/lib/session";
import { C, R, onTheme, THEMES, ThemeName } from "@/lib/theme";

export default function Family({
  visible,
  onClose,
  householdId,
  me,
  members,
}: {
  visible: boolean;
  onClose: () => void;
  householdId: Id<"households">;
  me: Doc<"members">;
  members: Doc<"members">[];
}) {
  const insets = useSafeAreaInsets();
  const { signIn, signOut, theme, setTheme } = useSession();
  const household = useQuery(api.households.get, { householdId });
  const seed = useMutation(api.households.seedDemo);
  const reset = useMutation(api.households.resetAll);
  const checkout = useAction(api.whop.createCheckout);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: 18, paddingBottom: insets.bottom + 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <T style={s.title}>Family</T>
          <Press onPress={onClose} style={s.close}>
            <T style={{ fontWeight: "800" }}>Done</T>
          </Press>
        </View>
        <T style={{ color: C.muted, marginTop: 2 }}>🏡 {household?.name}</T>

        {/* Invite */}
        <Card style={{ marginTop: 18, alignItems: "center", paddingVertical: 24 }}>
          <T style={{ color: C.muted, fontWeight: "800", fontSize: 12, letterSpacing: 0.8 }}>INVITE CODE</T>
          <T style={s.code}>{household?.code ?? "······"}</T>
          <T style={{ color: C.muted, textAlign: "center", marginTop: 4 }}>Anyone at home opens Kin → “Join with a code”</T>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Press
              onPress={async () => {
                if (!household) return;
                await Clipboard.setStringAsync(household.code);
                tap("success");
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              style={s.smallBtn}
            >
              <T style={{ fontWeight: "800" }}>{copied ? "Copied ✓" : "Copy"}</T>
            </Press>
            <Press
              onPress={() =>
                household &&
                Share.share({ message: `Join our family on Kin 🧠 — code ${household.code}. Kin remembers everything at home and nudges the right person.` })
              }
              style={[s.smallBtn, { backgroundColor: C.black }]}
            >
              <T style={{ fontWeight: "800", color: C.white }}>Share</T>
            </Press>
          </View>
        </Card>

        {/* Members */}
        <T style={s.section}>Members · {members.length}</T>
        <Card style={{ paddingVertical: 6 }}>
          {members.map((m, i) => (
            <View key={m._id} style={[s.member, i ? { borderTopWidth: 1, borderTopColor: C.line } : null]}>
              <Avatar m={m} size={42} ring />
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: "800", fontSize: 16 }}>
                  {m.name} {m._id === me._id ? <T style={{ color: C.muted, fontWeight: "600" }}>(you)</T> : null}
                </T>
                <T style={{ color: C.muted, fontSize: 13 }}>
                  {m.role} · active {timeAgo(m.lastSeenAt)} ago
                </T>
              </View>
              {m._id !== me._id ? (
                <Press
                  onPress={async () => {
                    tap("medium");
                    await signIn({ householdId, memberId: m._id });
                    onClose();
                  }}
                  style={s.switch}
                >
                  <T style={{ fontWeight: "700", fontSize: 13 }}>Be {m.name}</T>
                </Press>
              ) : null}
            </View>
          ))}
        </Card>
        <T style={{ color: C.muted, fontSize: 12.5, marginTop: 8, paddingHorizontal: 4 }}>
          Sharing one phone? Tap “Be …” to switch who's using Kin.
        </T>

        {/* Theme */}
        <T style={s.section}>Theme</T>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(Object.keys(THEMES) as ThemeName[]).map((t) => {
            const th = THEMES[t];
            const on = theme === t;
            return (
              <Press key={t} onPress={() => (tap("success"), setTheme(t))} style={[s.swatch, { backgroundColor: th.bg, borderColor: on ? th.black : C.line }] as any}>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <View style={[s.dotLg, { backgroundColor: th.black }]} />
                  <View style={[s.dotLg, { backgroundColor: th.card, borderWidth: 1, borderColor: th.line }]} />
                  <View style={[s.dotLg, { backgroundColor: th.ink }]} />
                </View>
                <T style={{ fontWeight: "800", marginTop: 8, color: th.ink, fontSize: 13 }}>{th.label}</T>
                {on ? <T style={{ fontSize: 11, color: th.black, fontWeight: "800" }}>ACTIVE</T> : null}
              </Press>
            );
          })}
        </View>

        {/* Plus */}
        <View style={s.plus}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <T style={{ color: C.white, fontSize: 22, fontWeight: "900" }}>Kin Plus</T>
            <View style={[s.badge, household?.plan === "plus" ? { backgroundColor: C.grocery } : null]}>
              <T style={{ color: C.white, fontWeight: "800", fontSize: 12 }}>{household?.plan === "plus" ? "ACTIVE" : "$4.99/mo"}</T>
            </View>
          </View>
          {["Unlimited family members & memories", "Photo snaps: fridge, flyers, homework", "Morning & evening briefs for everyone", "Grandparents & nanny over SMS"].map((f) => (
            <T key={f} style={{ color: "#D4D4DA", marginTop: 8 }}>
              ✓ {f}
            </T>
          ))}
          {household?.plan !== "plus" ? (
            <Press
              onPress={async () => {
                setBusy("plus");
                setNote("");
                try {
                  const r = await checkout({ householdId, memberId: me._id });
                  if (r?.url) await WebBrowser.openBrowserAsync(r.url);
                  else setNote(r?.error ?? "Checkout unavailable right now.");
                } catch (e: any) {
                  setNote("Checkout unavailable right now.");
                } finally {
                  setBusy("");
                }
              }}
              style={s.plusBtn}
            >
              <T style={{ fontWeight: "900", fontSize: 16 }}>{busy === "plus" ? "Opening checkout…" : "Upgrade with Whop"}</T>
            </Press>
          ) : (
            <T style={{ color: C.white, marginTop: 14, fontWeight: "700" }}>🎉 Your family is on Plus. Thank you!</T>
          )}
          {note ? <T style={{ color: "#FCA5A5", marginTop: 8 }}>{note}</T> : null}
        </View>

        {/* Demo tools */}
        <T style={s.section}>Demo & data</T>
        <View style={{ gap: 10 }}>
          <Button
            dark={false}
            icon="✨"
            label={busy === "seed" ? "Loading…" : "Load sample family"}
            onPress={async () => {
              setBusy("seed");
              await seed({ householdId, memberId: me._id });
              setBusy("");
              tap("success");
              onClose();
            }}
          />
          <Button
            dark={false}
            icon="🧹"
            label="Clear lists, chat & memory"
            onPress={async () => {
              await reset({ householdId });
              tap("medium");
            }}
          />
          <Press onPress={() => (signOut(), onClose())} style={{ alignItems: "center", padding: 14 }}>
            <T style={{ color: C.danger, fontWeight: "800" }}>Leave on this phone</T>
          </Press>
        </View>
        <T style={{ color: C.faint, textAlign: "center", marginTop: 10, fontSize: 12 }}>
          Built with Capy · Convex · Supermemory · Whop · tested on Revyl
        </T>
        <Text />
      </ScrollView>
    </Modal>
  );
}

const s_ = () => StyleSheet.create({
  title: { fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  close: { backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: C.line },
  code: { fontSize: 44, fontWeight: "900", letterSpacing: 8, marginTop: 6 },
  smallBtn: { backgroundColor: C.chip, borderRadius: R.pill, paddingHorizontal: 22, paddingVertical: 11 },
  swatch: { flex: 1, borderRadius: R.md, padding: 12, borderWidth: 2, alignItems: "center" },
  dotLg: { width: 14, height: 14, borderRadius: 7 },
  section: { fontSize: 20, fontWeight: "900", marginTop: 26, marginBottom: 10, letterSpacing: -0.4 },
  member: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  switch: { backgroundColor: C.chip, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7 },
  plus: { backgroundColor: C.black, borderRadius: R.lg, padding: 20, marginTop: 26 },
  badge: { backgroundColor: "#2C2C34", borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5 },
  plusBtn: { backgroundColor: C.white, borderRadius: R.pill, height: 52, alignItems: "center", justifyContent: "center", marginTop: 18 },
});
let s = s_();
onTheme(() => {
  s = s_();
});
