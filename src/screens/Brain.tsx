import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Avatar, Button, Card, Empty, Press, Sheet, T, tap, timeAgo } from "@/components/ui";
import { C, R, onTheme } from "@/lib/theme";

export default function Brain({ householdId, me, members }: { householdId: Id<"households">; me: Doc<"members">; members: Doc<"members">[] }) {
  const insets = useSafeAreaInsets();
  const memories = useQuery(api.memories.visible, { householdId, memberId: me._id });
  const add = useMutation(api.memories.add);
  const addRule = useMutation(api.memories.addRule);
  const [ruleErr, setRuleErr] = useState("");
  const amParent = /mom|dad|mother|father|parent|guardian|grand/i.test(me.role);
  const setScope = useMutation(api.memories.setScope);
  const remove = useMutation(api.memories.remove);
  const [tab, setTab] = useState<"family" | "private" | "rules">("family");
  const [text, setText] = useState("");
  const [sel, setSel] = useState<Doc<"memories"> | null>(null);

  const list = (memories ?? []).filter((m) => (tab === "rules" ? m.rule : !m.rule && m.scope === tab));
  const rulesCount = (memories ?? []).filter((m) => m.rule).length;
  const familyCount = (memories ?? []).filter((m) => m.scope === "family" && !m.rule).length;
  const mineCount = (memories ?? []).filter((m) => m.scope === "private").length;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 18, paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
        <T style={s.title}>Family Brain</T>
        <T style={{ color: C.muted }}>Everything Kin knows — and who can see it</T>

        <View style={s.stats}>
          <Press onPress={() => setTab("family")} style={[s.stat, tab === "family" ? s.statOn : null] as any}>
            <T style={[s.statNum, tab === "family" ? { color: C.white } : null] as any}>{familyCount}</T>
            <T style={{ fontWeight: "700", color: tab === "family" ? "#C9C9D0" : C.muted }}>🏡 Shared with family</T>
          </Press>
          <Press onPress={() => setTab("private")} style={[s.stat, tab === "private" ? s.statOn : null] as any}>
            <T style={[s.statNum, tab === "private" ? { color: C.white } : null] as any}>{mineCount}</T>
            <T style={{ fontWeight: "700", color: tab === "private" ? "#C9C9D0" : C.muted }}>🔒 Only me</T>
          </Press>
        </View>

        <Press onPress={() => setTab("rules")} style={[s.rulesBtn, tab === "rules" ? s.statOn : null] as any}>
          <Text style={{ fontSize: 22 }}>📜</Text>
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: "900", fontSize: 16, color: tab === "rules" ? C.white : C.ink }}>House rules · {rulesCount}</T>
            <T style={{ fontSize: 12.5, color: tab === "rules" ? "#C9C9D0" : C.muted }}>Set by parents. Kin makes sure everyone follows them.</T>
          </View>
        </Press>

        <Card style={{ marginTop: 14, flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: tab === "family" ? "#EEF7F1" : tab === "rules" ? "#FFF6E8" : "#EEF0FF" }}>
          <Text style={{ fontSize: 24 }}>{tab === "family" ? "🏡" : tab === "rules" ? "⚖️" : "🔐"}</Text>
          <T style={{ flex: 1, color: C.ink2, fontSize: 13.5, lineHeight: 19 }}>
            {tab === "rules"
              ? amParent
                ? "As a parent, your rules are decisions for the whole household. Kin enforces them in every chat and nudge."
                : "Only parents can set house rules. Kin will remind you of them."
              : tab === "family"
              ? "Shared only inside your family. Everyone's Kin uses these to coordinate — nobody outside the family ever sees them."
              : "Your private memory. Kin uses it only when talking to you — it never shows up in the family thread or anyone's nudges."}
          </T>
        </Card>

        <View style={s.addBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={tab === "rules" ? (amParent ? "New house rule, e.g. No phones at dinner" : "Only parents can add rules") : tab === "family" ? "Teach Kin something about the family…" : "Something only you and Kin know…"}
            editable={tab !== "rules" || amParent}
            placeholderTextColor={C.faint}
            style={s.input}
            multiline
          />
          <Press
            disabled={!text.trim()}
            onPress={async () => {
              setRuleErr("");
              try {
                if (tab === "rules") await addRule({ householdId, ownerId: me._id, text });
                else await add({ householdId, ownerId: me._id, text, scope: tab });
                tap("success");
                setText("");
              } catch {
                setRuleErr("Only parents can set house rules.");
              }
            }}
            style={[s.addBtn, !text.trim() ? { backgroundColor: C.faint } : null] as any}
          >
            <T style={{ color: C.white, fontWeight: "900", fontSize: 18 }}>＋</T>
          </Press>
        </View>

        {ruleErr ? <T style={{ color: C.danger, marginTop: 8, fontWeight: "700" }}>🔒 {ruleErr}</T> : null}
        <View style={{ marginTop: 16, gap: 10 }}>
          {memories && list.length === 0 ? (
            <Empty emoji="🧠" title="Nothing here yet" sub="Chat with Kin — it learns allergies, routines and who-does-what automatically." />
          ) : null}
          {list.map((m) => {
            const owner = members.find((x) => x._id === m.ownerId);
            return (
              <Press key={m._id} onPress={() => setSel(m)} style={s.mem}>
                <T style={{ fontSize: 15.5, lineHeight: 22, fontWeight: "600" }}>{m.text}</T>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <Avatar m={owner} size={22} />
                  <T style={{ color: C.muted, fontSize: 12.5, flex: 1 }}>
                    {m.source === "kin" ? "Learned by Kin" : `Added by ${owner?._id === me._id ? "you" : owner?.name ?? "family"}`} · {timeAgo(m.createdAt)}
                  </T>
                  <View style={[s.sync, m.synced ? { backgroundColor: "#E8F8EE" } : null]}>
                    <T style={{ fontSize: 11, fontWeight: "800", color: m.synced ? C.grocery : C.muted }}>
                      {m.synced ? "● Supermemory" : "○ syncing"}
                    </T>
                  </View>
                </View>
              </Press>
            );
          })}
        </View>
      </ScrollView>

      <Sheet visible={!!sel} onClose={() => setSel(null)}>
        {sel ? (
          <View style={{ gap: 12 }}>
            <T style={{ fontSize: 18, fontWeight: "800", lineHeight: 25 }}>{sel.text}</T>
            {sel.ownerId === me._id || sel.scope === "family" ? (
              <Button
                label={sel.scope === "family" ? "Make private (only me)" : "Share with family"}
                icon={sel.scope === "family" ? "🔒" : "🏡"}
                onPress={async () => {
                  await setScope({ memoryId: sel._id, scope: sel.scope === "family" ? "private" : "family" });
                  tap("success");
                  setSel(null);
                }}
              />
            ) : null}
            <Button
              dark={false}
              label="Forget this"
              onPress={async () => {
                await remove({ memoryId: sel._id });
                setSel(null);
              }}
            />
          </View>
        ) : null}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const s_ = () => StyleSheet.create({
  title: { fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  stats: { flexDirection: "row", gap: 10, marginTop: 16 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: 1, borderColor: C.line },
  statOn: { backgroundColor: C.black, borderColor: C.black },
  statNum: { fontSize: 38, fontWeight: "900", letterSpacing: -1.5 },
  addBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 14, backgroundColor: C.card, borderRadius: 24, padding: 6, borderWidth: 1, borderColor: C.line },
  input: { flex: 1, minHeight: 44, maxHeight: 120, fontSize: 15.5, color: C.ink, paddingHorizontal: 10, paddingTop: 12, paddingBottom: 10 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.black, alignItems: "center", justifyContent: "center" },
  rulesBtn: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10, backgroundColor: C.card, borderRadius: R.lg, padding: 14, borderWidth: 1, borderColor: C.line },
  mem: { backgroundColor: C.card, borderRadius: R.md, padding: 16, borderWidth: 1, borderColor: C.line },
  sync: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.pill, backgroundColor: C.chip },
});
let s = s_();
onTheme(() => {
  s = s_();
});
