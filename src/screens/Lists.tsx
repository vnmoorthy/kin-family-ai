import { useMutation } from "convex/react";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Avatar, Card, Empty, ItemRow, Pill, Press, T, tap } from "@/components/ui";
import { C, KIND, Kind, R } from "@/lib/theme";

const EMOJI_FOR: Record<Kind, string> = { grocery: "🛒", task: "✅", event: "📅", reminder: "⏰" };

export default function Lists({
  householdId,
  me,
  members,
  items,
}: {
  householdId: Id<"households">;
  me: Doc<"members">;
  members: Doc<"members">[];
  items: Doc<"items">[];
}) {
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<Kind | "all">("grocery");
  const [who, setWho] = useState<Id<"members"> | "all">("all");
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<Id<"members"> | undefined>(undefined);
  const [showDone, setShowDone] = useState(false);
  const add = useMutation(api.items.add);

  const filtered = items.filter((i) => (kind === "all" || i.kind === kind) && (who === "all" || i.assigneeId === who));
  const open = filtered.filter((i) => i.status !== "done");
  const done = filtered.filter((i) => i.status === "done").sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  const addKind: Kind = kind === "all" ? "task" : kind;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 18, paddingBottom: 220 }} keyboardShouldPersistTaps="handled">
        <T style={s.title}>Lists</T>
        <T style={{ color: C.muted, marginBottom: 14 }}>Shared live with everyone at home</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(["grocery", "task", "event", "reminder"] as Kind[]).map((k) => {
            const n = items.filter((i) => i.kind === k && i.status !== "done").length;
            return <Pill key={k} label={`${KIND[k].emoji} ${KIND[k].label} ${n || ""}`} active={kind === k} onPress={() => setKind(k)} />;
          })}
          <Pill label="All" active={kind === "all"} onPress={() => setKind("all")} />
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
          <Press onPress={() => setWho("all")} style={[s.whoChip, who === "all" ? s.whoOn : null] as any}>
            <T style={{ fontWeight: "700", color: who === "all" ? C.white : C.ink2 }}>Everyone</T>
          </Press>
          {members.map((m) => (
            <Press key={m._id} onPress={() => setWho(m._id)} style={[s.whoChip, who === m._id ? s.whoOn : null] as any}>
              <Text>{m.emoji}</Text>
              <T style={{ fontWeight: "700", color: who === m._id ? C.white : C.ink2 }}>{m._id === me._id ? "Me" : m.name}</T>
            </Press>
          ))}
        </ScrollView>

        <Card style={{ marginTop: 16, paddingVertical: 4 }}>
          {open.length === 0 ? (
            <Empty
              emoji={kind === "all" ? "✨" : KIND[kind].emoji}
              title="All clear"
              sub={kind === "grocery" ? "Tell Kin “we're out of milk” or add it below." : "Nothing open here. Nice."}
            />
          ) : (
            open.map((i, idx) => (
              <View key={i._id} style={idx ? { borderTopWidth: 1, borderTopColor: C.line } : null}>
                <ItemRow item={i} members={members} meId={me._id} />
              </View>
            ))
          )}
        </Card>

        {done.length ? (
          <>
            <Press onPress={() => setShowDone(!showDone)} style={{ marginTop: 18, flexDirection: "row", justifyContent: "space-between" }}>
              <T style={{ fontWeight: "800", color: C.muted }}>Done · {done.length}</T>
              <T style={{ fontWeight: "800", color: C.muted }}>{showDone ? "Hide" : "Show"}</T>
            </Press>
            {showDone ? (
              <Card style={{ marginTop: 10, paddingVertical: 4 }}>
                {done.slice(0, 30).map((i, idx) => (
                  <View key={i._id} style={idx ? { borderTopWidth: 1, borderTopColor: C.line } : null}>
                    <ItemRow item={i} members={members} meId={me._id} compact />
                  </View>
                ))}
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {/* Quick add */}
      <View style={[s.addWrap, { bottom: Math.max(insets.bottom, 10) + 72 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          <T style={{ color: C.muted, fontWeight: "700", fontSize: 12, alignSelf: "center", marginRight: 2 }}>FOR</T>
          <Press onPress={() => setAssignee(undefined)} style={[s.mini, !assignee ? s.whoOn : null] as any}>
            <T style={{ fontSize: 12.5, fontWeight: "700", color: !assignee ? C.white : C.ink2 }}>Anyone</T>
          </Press>
          {members.map((m) => (
            <Press key={m._id} onPress={() => setAssignee(m._id)} style={[s.mini, assignee === m._id ? s.whoOn : null] as any}>
              <Text style={{ fontSize: 12 }}>{m.emoji}</Text>
              <T style={{ fontSize: 12.5, fontWeight: "700", color: assignee === m._id ? C.white : C.ink2 }}>{m.name}</T>
            </Press>
          ))}
        </ScrollView>
        <View style={s.addBar}>
          <Text style={{ fontSize: 18, marginLeft: 6 }}>{EMOJI_FOR[addKind]}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={`Add a ${KIND[addKind].one.toLowerCase()}…`}
            placeholderTextColor={C.faint}
            style={s.addInput}
            returnKeyType="done"
            onSubmitEditing={async () => {
              if (!title.trim()) return;
              tap("success");
              await add({ householdId, kind: addKind, title, emoji: EMOJI_FOR[addKind], assigneeId: assignee, createdById: me._id });
              setTitle("");
            }}
          />
          <Press
            disabled={!title.trim()}
            onPress={async () => {
              tap("success");
              await add({ householdId, kind: addKind, title, emoji: EMOJI_FOR[addKind], assigneeId: assignee, createdById: me._id });
              setTitle("");
            }}
            style={[s.addBtn, !title.trim() ? { backgroundColor: C.faint } : null] as any}
          >
            <T style={{ color: C.white, fontWeight: "900", fontSize: 20 }}>＋</T>
          </Press>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  whoChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  whoOn: { backgroundColor: C.black, borderColor: C.black },
  addWrap: { position: "absolute", left: 12, right: 12 },
  mini: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  addBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderRadius: 28, padding: 6, borderWidth: 1, borderColor: C.line, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  addInput: { flex: 1, height: 44, fontSize: 16, color: C.ink },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.black, alignItems: "center", justifyContent: "center" },
});
