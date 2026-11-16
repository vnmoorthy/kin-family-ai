import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import NudgeBanner from "@/components/NudgeBanner";
import { Press, Sheet, T, tap } from "@/components/ui";
import { useSession } from "@/lib/session";
import { C, onTheme } from "@/lib/theme";
import Brain from "@/screens/Brain";
import Family from "@/screens/Family";
import Home from "@/screens/Home";
import Kin from "@/screens/Kin";
import Lists from "@/screens/Lists";
import Onboarding from "@/screens/Onboarding";

type Tab = "home" | "kin" | "lists" | "brain";

/** If anything throws (e.g. a network blip mid-demo), show a calm retry instead of a red screen. */
export function ErrorBoundary({ retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, padding: 30 }}>
      <Text style={{ fontSize: 44 }}>🧠</Text>
      <T style={{ fontSize: 20, fontWeight: "800", marginTop: 10 }}>Kin lost its train of thought</T>
      <T style={{ color: C.muted, marginTop: 6, textAlign: "center" }}>Usually a network blip. Your family's data is safe.</T>
      <Press onPress={() => retry()} style={{ marginTop: 20, backgroundColor: C.black, borderRadius: 999, paddingHorizontal: 26, paddingVertical: 14 }}>
        <T style={{ color: C.white, fontWeight: "800" }}>Try again</T>
      </Press>
    </View>
  );
}

export default function Index() {
  const { session, ready, signOut } = useSession();
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (!session) return <Onboarding />;
  return <Main householdId={session.householdId} memberId={session.memberId} onInvalid={signOut} />;
}

function Main({ householdId, memberId, onInvalid }: { householdId: any; memberId: any; onInvalid: () => void }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("home");
  const [family, setFamily] = useState(false);
  const [plus, setPlus] = useState(false);
  const [seed, setSeed] = useState<string | undefined>();
  const [snap, setSnap] = useState<"camera" | "library" | null>(null);
  const members = useQuery(api.households.members, { householdId });
  const items = useQuery(api.items.list, { householdId, memberId });
  const touch = useMutation(api.households.touch);
  const me = members?.find((m) => m._id === memberId);

  useEffect(() => {
    touch({ memberId }).catch(() => {});
  }, [memberId, touch]);

  useEffect(() => {
    if (members && !me) onInvalid();
  }, [members, me, onInvalid]);

  const clearSeed = useCallback(() => setSeed(undefined), []);
  const clearSnap = useCallback(() => setSnap(null), []);

  if (!members || !items || !me) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <ActivityIndicator />
      </View>
    );
  }

  const common = { householdId, me, members };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {tab === "home" ? (
        <Home
          {...common}
          items={items}
          onOpenFamily={() => setFamily(true)}
          onAsk={(t) => {
            if (t) setSeed(t);
            setTab("kin");
          }}
        />
      ) : null}
      {tab === "kin" ? <Kin {...common} seed={seed} onSeedUsed={clearSeed} snapRequest={snap} onSnapHandled={clearSnap} /> : null}
      {tab === "lists" ? <Lists {...common} items={items} /> : null}
      {tab === "brain" ? <Brain {...common} /> : null}

      {/* Tab bar */}
      <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TabBtn label="Home" icon="⌂" on={tab === "home"} onPress={() => setTab("home")} />
        <TabBtn label="Kin" icon="◉" on={tab === "kin"} onPress={() => setTab("kin")} />
        <Press onPress={() => (tap("medium"), setPlus(true))} style={s.fab} haptic={false}>
          <Text style={{ color: C.white, fontSize: 30, fontWeight: "300", marginTop: -2 }}>＋</Text>
        </Press>
        <TabBtn label="Lists" icon="☰" on={tab === "lists"} onPress={() => setTab("lists")} badge={items.filter((i) => i.status !== "done" && i.kind === "grocery").length} />
        <TabBtn label="Brain" icon="✦" on={tab === "brain"} onPress={() => setTab("brain")} />
      </View>

      <NudgeBanner memberId={memberId} members={members} onOpen={() => setTab("home")} />

      <Family visible={family} onClose={() => setFamily(false)} {...common} />

      <Sheet visible={plus} onClose={() => setPlus(false)}>
        <T style={{ fontSize: 22, fontWeight: "900", marginBottom: 4 }}>Tell Kin</T>
        <T style={{ color: C.muted, marginBottom: 16 }}>Kin figures out who should handle it.</T>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <QuickTile emoji="📷" label="Snap" sub="fridge, flyer, homework" onPress={() => (setPlus(false), setTab("kin"), setSnap("camera"))} />
          <QuickTile emoji="🖼️" label="Photo" sub="from your library" onPress={() => (setPlus(false), setTab("kin"), setSnap("library"))} />
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <QuickTile emoji="🥚" label="We're out of…" sub="add groceries" onPress={() => (setPlus(false), setSeed("We're out of "), setTab("kin"))} />
          <QuickTile emoji="📅" label="Coming up…" sub="events & to-dos" onPress={() => (setPlus(false), setSeed("Heads up: "), setTab("kin"))} />
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <QuickTile emoji="🧠" label="Remember…" sub="teach the family brain" onPress={() => (setPlus(false), setSeed("Remember that "), setTab("kin"))} />
          <QuickTile emoji="🛒" label="Add to list" sub="quick manual add" onPress={() => (setPlus(false), setTab("lists"))} />
        </View>
      </Sheet>
    </View>
  );
}

function TabBtn({ label, icon, on, onPress, badge }: { label: string; icon: string; on: boolean; onPress: () => void; badge?: number }) {
  return (
    <Press onPress={onPress} style={s.tab}>
      <View>
        <Text style={{ fontSize: 22, color: on ? C.ink : C.faint, fontWeight: "800" }}>{icon}</Text>
        {badge ? (
          <View style={s.badge}>
            <Text style={{ color: C.white, fontSize: 10, fontWeight: "800" }}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontSize: 11, fontWeight: "700", color: on ? C.ink : C.faint, marginTop: 2 }}>{label}</Text>
    </Press>
  );
}

function QuickTile({ emoji, label, sub, onPress }: { emoji: string; label: string; sub: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={s.tile}>
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
      <T style={{ fontWeight: "800", marginTop: 8 }}>{label}</T>
      <T style={{ color: C.muted, fontSize: 12.5, marginTop: 2 }}>{sub}</T>
    </Press>
  );
}

const s_ = () => StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  tab: { alignItems: "center", width: 64, paddingVertical: 4 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.black,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -26,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  badge: { position: "absolute", top: -4, right: -10, backgroundColor: C.grocery, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  tile: { flex: 1, backgroundColor: C.chip, borderRadius: 20, padding: 14 },
});
let s = s_();
onTheme(() => {
  s = s_();
});
