import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { Avatar, Button, Card, Press, T, tap } from "@/components/ui";
import { useSession } from "@/lib/session";
import { C, R } from "@/lib/theme";

const EMOJIS = ["👩🏽", "👨🏽", "🧒🏽", "👧🏽", "👵🏽", "👴🏽", "👩🏻", "👨🏿", "🧑🏼", "🐶"];
const ROLES = ["Mom", "Dad", "Kid", "Grandparent", "Partner", "Roommate"];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const [mode, setMode] = useState<"welcome" | "create" | "join">("welcome");
  const [householdName, setHouseholdName] = useState("");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [role, setRole] = useState("Mom");
  const [code, setCode] = useState("");
  const [demo, setDemo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const create = useMutation(api.households.create);
  const join = useMutation(api.households.join);
  const seed = useMutation(api.households.seedDemo);
  const found = useQuery(api.households.lookupCode, code.trim().length === 6 ? { code } : "skip");

  if (mode === "welcome") {
    return (
      <View style={[s.screen, { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 24 }]}>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <View style={s.orbit}>
            {["👩🏽", "👨🏽", "🧒🏽", "👵🏽"].map((e, i) => (
              <View
                key={e}
                style={[
                  s.orbitAvatar,
                  [
                    { top: 0, left: 70 },
                    { top: 70, right: 0 },
                    { bottom: 0, left: 70 },
                    { top: 70, left: 0 },
                  ][i] as any,
                ]}
              >
                <Text style={{ fontSize: 30 }}>{e}</Text>
              </View>
            ))}
            <View style={s.brain}>
              <Text style={{ fontSize: 40 }}>🧠</Text>
            </View>
          </View>
          <T style={s.h1}>Kin</T>
          <T style={s.tag}>One shared brain for your whole family.</T>
          <T style={s.sub}>
            Tell Kin anything happening at home. It remembers, picks the right person, and nudges them — so nobody has to be the
            family's full-time coordinator.
          </T>
        </View>
        <View style={{ gap: 12 }}>
          <Button label="Start a family" onPress={() => setMode("create")} />
          <Button label="Join with a code" dark={false} onPress={() => setMode("join")} />
        </View>
      </View>
    );
  }

  const profileFields = (
    <>
      <T style={s.label}>YOUR NAME</T>
      <TextInput value={name} onChangeText={setName} placeholder="e.g. Priya" placeholderTextColor={C.faint} style={s.input} />
      <T style={s.label}>PICK YOUR AVATAR</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {EMOJIS.map((e) => (
          <Press key={e} onPress={() => setEmoji(e)} style={[s.emojiPick, emoji === e ? { borderColor: C.black, borderWidth: 2.5 } : null] as any}>
            <Text style={{ fontSize: 28 }}>{e}</Text>
          </Press>
        ))}
      </ScrollView>
      <T style={s.label}>YOUR ROLE</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ROLES.map((r) => (
          <Press key={r} onPress={() => setRole(r)} style={[s.role, role === r ? { backgroundColor: C.black } : null] as any}>
            <T style={{ fontWeight: "700", color: role === r ? C.white : C.ink2 }}>{r}</T>
          </Press>
        ))}
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingTop: insets.top + 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Press onPress={() => (setMode("welcome"), setErr(""))} style={s.back}>
          <T style={{ fontSize: 20, fontWeight: "700" }}>←</T>
        </Press>
        <T style={s.h2}>{mode === "create" ? "Start your family" : "Join your family"}</T>
        <T style={{ color: C.muted, marginTop: 6, marginBottom: 18, fontSize: 15 }}>
          {mode === "create"
            ? "You'll get a 6-letter code to invite everyone at home."
            : "Ask anyone in your family for the 6-letter code in their Kin."}
        </T>

        {mode === "create" ? (
          <>
            <T style={s.label}>FAMILY NAME</T>
            <TextInput
              value={householdName}
              onChangeText={setHouseholdName}
              placeholder="e.g. The Sharma Home"
              placeholderTextColor={C.faint}
              style={s.input}
            />
            {profileFields}
            <Press onPress={() => setDemo(!demo)} style={s.demoRow}>
              <View style={[s.box, demo ? { backgroundColor: C.black, borderColor: C.black } : null]}>
                {demo ? <T style={{ color: C.white, fontWeight: "900", fontSize: 12 }}>✓</T> : null}
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: "700" }}>Fill with a sample family</T>
                <T style={{ color: C.muted, fontSize: 13 }}>Adds Raj, Arjun & Paati with a week of memories so you can try Kin right away.</T>
              </View>
            </Press>
          </>
        ) : (
          <>
            <T style={s.label}>FAMILY CODE</T>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="ABC123"
              autoCapitalize="characters"
              placeholderTextColor={C.faint}
              style={[s.input, { fontSize: 28, letterSpacing: 8, fontWeight: "800", textAlign: "center" }]}
            />
            {found === null && code.length === 6 ? <T style={{ color: C.danger, marginTop: 8 }}>No family with that code.</T> : null}
            {found ? (
              <>
                <Card style={{ marginTop: 14 }}>
                  <T style={{ fontWeight: "800", fontSize: 18 }}>🏡 {found.household.name}</T>
                  <T style={{ color: C.muted, marginTop: 4 }}>Tap your name if you're already here</T>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                    {found.members.map((m) => (
                      <Press
                        key={m._id}
                        onPress={async () => {
                          tap("success");
                          await signIn({ householdId: found.household._id, memberId: m._id });
                        }}
                        style={s.existing}
                      >
                        <Avatar m={m} size={44} />
                        <T style={{ fontWeight: "700", marginTop: 6 }}>{m.name}</T>
                        <T style={{ color: C.muted, fontSize: 12 }}>{m.role}</T>
                      </Press>
                    ))}
                  </View>
                </Card>
                <T style={{ color: C.muted, marginVertical: 16, textAlign: "center" }}>— or join as someone new —</T>
                {profileFields}
              </>
            ) : null}
          </>
        )}

        {err ? <T style={{ color: C.danger, marginTop: 14 }}>{err}</T> : null}
        {mode === "create" || found ? (
          <Button
            style={{ marginTop: 26 }}
            label={busy ? "Setting up…" : mode === "create" ? "Create our family" : "Join family"}
            disabled={busy || !name.trim()}
            onPress={async () => {
              setBusy(true);
              setErr("");
              try {
                if (mode === "create") {
                  const r = await create({ householdName, name, emoji, role });
                  if (demo) await seed({ householdId: r.householdId, memberId: r.memberId });
                  tap("success");
                  await signIn(r);
                } else {
                  const r = await join({ code, name, emoji, role });
                  tap("success");
                  await signIn(r);
                }
              } catch (e: any) {
                setErr(e?.message?.includes("No family") ? "No family with that code." : "Something went wrong. Try again.");
              } finally {
                setBusy(false);
              }
            }}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 24 },
  h1: { fontSize: 64, fontWeight: "900", letterSpacing: -2.5, textAlign: "center", marginTop: 28 },
  tag: { fontSize: 22, fontWeight: "800", textAlign: "center", letterSpacing: -0.5, marginTop: 4 },
  sub: { fontSize: 15.5, color: C.muted, textAlign: "center", marginTop: 12, lineHeight: 22, paddingHorizontal: 8 },
  h2: { fontSize: 34, fontWeight: "900", letterSpacing: -1, marginTop: 12 },
  label: { color: C.muted, fontWeight: "800", fontSize: 12, letterSpacing: 0.8, marginTop: 18, marginBottom: 8 },
  input: { backgroundColor: C.card, borderRadius: R.md, paddingHorizontal: 16, height: 56, fontSize: 17, color: C.ink, borderWidth: 1, borderColor: C.line },
  emojiPick: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  role: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  demoRow: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 22, backgroundColor: C.card, padding: 14, borderRadius: R.md, borderWidth: 1, borderColor: C.line },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: C.faint, alignItems: "center", justifyContent: "center" },
  existing: { alignItems: "center", padding: 10, borderRadius: R.md, backgroundColor: C.chip, minWidth: 84 },
  orbit: { width: 200, height: 200, alignSelf: "center" },
  orbitAvatar: { position: "absolute", width: 60, height: 60, borderRadius: 30, backgroundColor: C.card, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  brain: { position: "absolute", top: 60, left: 60, width: 80, height: 80, borderRadius: 40, backgroundColor: C.black, alignItems: "center", justifyContent: "center" },
});
