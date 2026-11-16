import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Avatar, Press, T, tap } from "@/components/ui";
import { C } from "@/lib/theme";

/** Live, cross-device nudge: the moment Kin assigns you something, it drops in from the top. */
export default function NudgeBanner({ memberId, members, onOpen }: { memberId: Id<"members">; members: Doc<"members">[]; onOpen: () => void }) {
  const insets = useSafeAreaInsets();
  const nudges = useQuery(api.nudges.unseen, { memberId });
  const markSeen = useMutation(api.nudges.markSeen);
  const [current, setCurrent] = useState<Doc<"nudges"> | null>(null);
  const y = useRef(new Animated.Value(-200)).current;
  const timer = useRef<any>(null);

  const dismiss = (n: Doc<"nudges"> | null) => {
    Animated.timing(y, { toValue: -200, duration: 220, useNativeDriver: Platform.OS !== "web" }).start(() => setCurrent(null));
    if (n) markSeen({ nudgeId: n._id }).catch(() => {});
  };

  useEffect(() => {
    const next = nudges?.[0];
    if (!next || current?._id === next._id) return;
    setCurrent(next);
    tap("success");
    y.setValue(-200);
    Animated.spring(y, { toValue: 0, useNativeDriver: Platform.OS !== "web", speed: 14, bounciness: 8 }).start();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => dismiss(next), 7000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudges?.[0]?._id]);

  if (!current) return null;
  const from = members.find((m) => m._id === current.fromId);
  return (
    <Animated.View style={[s.wrap, { top: insets.top + 6, transform: [{ translateY: y }] }]} pointerEvents="box-none">
      <Press
        onPress={() => {
          clearTimeout(timer.current);
          dismiss(current);
          onOpen();
        }}
        style={s.card}
      >
        <View style={s.emoji}>
          <Text style={{ fontSize: 22 }}>{current.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <T style={{ color: C.white, fontWeight: "900", fontSize: 13 }}>Kin</T>
            {from ? (
              <>
                <T style={{ color: "#8E8E96", fontSize: 12 }}>for</T>
                <Avatar m={from} size={16} />
                <T style={{ color: "#8E8E96", fontSize: 12 }}>{from.name}</T>
              </>
            ) : null}
            <T style={{ color: "#8E8E96", fontSize: 12, marginLeft: "auto" }}>now</T>
          </View>
          <T style={{ color: C.white, fontSize: 15, lineHeight: 20, marginTop: 3, fontWeight: "600" }} numberOfLines={3}>
            {current.text}
          </T>
        </View>
      </Press>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", left: 10, right: 10, zIndex: 100 },
  card: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#111114",
    borderRadius: 24,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  emoji: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#26262C", alignItems: "center", justifyContent: "center" },
});
