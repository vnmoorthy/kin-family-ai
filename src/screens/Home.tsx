import { useAction, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import HomeDevices from "@/components/HomeDevices";
import { Avatar, Card, Empty, ItemRow, Press, Ring, T, timeAgo } from "@/components/ui";
import { C, KIND, R, onTheme } from "@/lib/theme";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function familyStreak(items: Doc<"items">[]) {
  const days = new Set(items.filter((i) => i.doneAt).map((i) => new Date(i.doneAt!).toDateString()));
  let streak = 0;
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export default function Home({
  householdId,
  me,
  members,
  items,
  onOpenFamily,
  onAsk,
}: {
  householdId: Id<"households">;
  me: Doc<"members">;
  members: Doc<"members">[];
  items: Doc<"items">[];
  onOpenFamily: () => void;
  onAsk: (text?: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const household = useQuery(api.households.get, { householdId });
  const briefAction = useAction(api.ai.brief);
  const [brief, setBrief] = useState<string | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);

  const loadBrief = async () => {
    setLoadingBrief(true);
    try {
      const b = await briefAction({ householdId, memberId: me._id });
      setBrief(b || null);
    } catch {
      setBrief(null);
    } finally {
      setLoadingBrief(false);
    }
  };
  useEffect(() => {
    loadBrief();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me._id]);

  const today = new Date().toDateString();
  const open = items.filter((i) => i.status !== "done");
  const mine = open.filter((i) => i.assigneeId === me._id);
  const doneToday = items.filter((i) => i.doneAt && new Date(i.doneAt).toDateString() === today);
  const myDoneToday = doneToday.filter((i) => i.doneById === me._id);
  const progress = mine.length + myDoneToday.length === 0 ? 1 : myDoneToday.length / (mine.length + myDoneToday.length);
  const streak = useMemo(() => familyStreak(items), [items]);
  const byKind = (k: keyof typeof KIND) => open.filter((i) => i.kind === k).length;
  const recent = items
    .filter((i) => i.doneAt && Date.now() - i.doneAt < 36 * 3600_000)
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
    .slice(0, 4);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 18, paddingBottom: 140 }}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <T style={{ color: C.muted, fontWeight: "600" }}>
            {greeting()}, {me.name}
          </T>
          <T style={s.title} numberOfLines={1}>
            {household?.name ?? "Home"}
          </T>
        </View>
        <View style={s.streak}>
          <Text style={{ fontSize: 16 }}>🔥</Text>
          <T style={{ fontWeight: "800" }}>{streak}</T>
        </View>
        <Press onPress={onOpenFamily} style={s.stack}>
          {members.slice(0, 3).map((m, i) => (
            <View key={m._id} style={{ marginLeft: i === 0 ? 0 : -12 }}>
              <Avatar m={m} size={34} ring />
            </View>
          ))}
        </Press>
      </View>

      {/* Hero: my day */}
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 18, paddingVertical: 22 }}>
        <View style={{ flex: 1 }}>
          <T style={s.big}>{mine.length}</T>
          <T style={{ color: C.muted, fontWeight: "600", marginTop: -2 }}>{mine.length === 1 ? "thing on you" : "things on you"}</T>
          <View style={{ flexDirection: "row", gap: 14, marginTop: 14 }}>
            {(["grocery", "task", "event"] as const).map((k) => (
              <View key={k}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={[s.dot, { backgroundColor: KIND[k].color }]} />
                  <T style={{ fontWeight: "800", fontSize: 17 }}>{byKind(k)}</T>
                </View>
                <T style={{ color: C.muted, fontSize: 12 }}>{KIND[k].label}</T>
              </View>
            ))}
          </View>
        </View>
        <Ring size={118} stroke={11} progress={progress}>
          <Text style={{ fontSize: 26 }}>{me.emoji}</Text>
          <T style={{ fontSize: 12, color: C.muted, fontWeight: "700" }}>{Math.round(progress * 100)}%</T>
        </Ring>
      </Card>

      {/* Kin brief */}
      <Press onPress={() => onAsk()} style={s.brief}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={s.kinDot}>
              <Text style={{ fontSize: 13 }}>🧠</Text>
            </View>
            <T style={{ color: C.white, fontWeight: "800" }}>Kin</T>
            <T style={{ color: "#9A9AA3", fontSize: 12 }}>your brief</T>
          </View>
          <Press onPress={loadBrief} style={s.refresh}>
            {loadingBrief ? <ActivityIndicator color="#fff" size="small" /> : <T style={{ color: C.white, fontSize: 15 }}>↻</T>}
          </Press>
        </View>
        <T style={{ color: C.white, fontSize: 17, lineHeight: 24, marginTop: 12, fontWeight: "600" }}>
          {brief ??
            (loadingBrief
              ? "Catching up on everything at home…"
              : mine.length
                ? `You have ${mine.length} thing${mine.length > 1 ? "s" : ""} today. Tell me what's going on and I'll sort out who does what.`
                : "You're all clear. Tell me anything happening at home and I'll handle the who-does-what.")}
        </T>
        <View style={s.askRow}>
          <T style={{ color: "#B5B5BD", flex: 1 }}>Tell Kin anything…</T>
          <T style={{ color: C.white, fontWeight: "800" }}>→</T>
        </View>
      </Press>

      {/* Connected home */}
      <HomeDevices householdId={householdId} />

      {/* For you */}
      <View style={s.sectionHead}>
        <T style={s.section}>For you</T>
        <T style={{ color: C.muted, fontWeight: "600" }}>{mine.length} open</T>
      </View>
      <Card style={{ paddingVertical: 4 }}>
        {mine.length === 0 ? (
          <Empty emoji="🎉" title="Nothing on your plate" sub="Kin will nudge you when the family needs you." />
        ) : (
          mine.slice(0, 6).map((i, idx) => (
            <View key={i._id} style={idx ? { borderTopWidth: 1, borderTopColor: C.line } : null}>
              <ItemRow item={i} members={members} meId={me._id} />
            </View>
          ))
        )}
      </Card>

      {/* Family */}
      <View style={s.sectionHead}>
        <T style={s.section}>Family today</T>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8 }}>
        {members.map((m) => {
          const left = open.filter((i) => i.assigneeId === m._id).length;
          const did = doneToday.filter((i) => i.doneById === m._id).length;
          const p = left + did === 0 ? 1 : did / (left + did);
          return (
            <Card key={m._id} style={{ width: 128, alignItems: "center", paddingVertical: 16 }}>
              <Ring size={64} stroke={6} progress={p} color={m.color}>
                <Text style={{ fontSize: 26 }}>{m.emoji}</Text>
              </Ring>
              <T style={{ fontWeight: "800", marginTop: 8 }}>{m._id === me._id ? "You" : m.name}</T>
              <T style={{ color: C.muted, fontSize: 12.5 }}>
                {left} left · {did} done
              </T>
            </Card>
          );
        })}
      </ScrollView>

      {/* Recently done */}
      {recent.length ? (
        <>
          <View style={s.sectionHead}>
            <T style={s.section}>Recently handled</T>
          </View>
          <Card style={{ paddingVertical: 6 }}>
            {recent.map((i, idx) => {
              const who = members.find((m) => m._id === i.doneById);
              return (
                <View key={i._id} style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }, idx ? { borderTopWidth: 1, borderTopColor: C.line } : null]}>
                  <Avatar m={who} size={32} />
                  <T style={{ flex: 1 }} numberOfLines={1}>
                    <T style={{ fontWeight: "800" }}>{who?._id === me._id ? "You" : who?.name ?? "Someone"}</T> finished {i.title}
                  </T>
                  <T style={{ color: C.muted, fontSize: 12 }}>{timeAgo(i.doneAt!)}</T>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const s_ = () => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -0.8 },
  streak: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, borderWidth: 1, borderColor: C.line },
  stack: { flexDirection: "row", paddingLeft: 4 },
  big: { fontSize: 56, fontWeight: "900", letterSpacing: -2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  brief: { backgroundColor: C.black, borderRadius: R.lg, padding: 18, marginTop: 14 },
  kinDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#26262C", alignItems: "center", justifyContent: "center" },
  refresh: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#26262C", alignItems: "center", justifyContent: "center" },
  askRow: { flexDirection: "row", alignItems: "center", marginTop: 16, backgroundColor: "#1C1C22", borderRadius: R.pill, paddingHorizontal: 16, height: 46 },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 24, marginBottom: 10, paddingHorizontal: 2 },
  section: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
});
let s = s_();
onTheme(() => {
  s = s_();
});
