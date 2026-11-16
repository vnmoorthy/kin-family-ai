import * as Haptics from "expo-haptics";
import { useMutation } from "convex/react";
import { useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { C, KIND, R, shadow } from "@/lib/theme";

export const tap = (style: "light" | "medium" | "success" = "light") => {
  if (Platform.OS === "web") return;
  if (style === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(style === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/** Pressable that gently scales down — every tap feels physical. */
export function Press({
  onPress,
  onLongPress,
  style,
  children,
  disabled,
  haptic = true,
}: {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
  disabled?: boolean;
  haptic?: boolean;
}) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: Platform.OS !== "web", speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => to(0.96)}
      onPressOut={() => to(1)}
      onPress={() => {
        if (haptic) tap();
        onPress?.();
      }}
      onLongPress={onLongPress ? () => (tap("medium"), onLongPress()) : undefined}
    >
      <Animated.View style={[{ transform: [{ scale: s }], opacity: disabled ? 0.5 : 1 }, style as any]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Card({ style, children }: { style?: ViewStyle | ViewStyle[]; children: React.ReactNode }) {
  return <View style={[styles.card, style as any]}>{children}</View>;
}

export function T({ style, children, numberOfLines }: { style?: TextStyle | TextStyle[]; children: React.ReactNode; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ color: C.ink, fontSize: 15 }, style as any]}>
      {children}
    </Text>
  );
}

export function Avatar({ m, size = 36, ring }: { m?: Pick<Doc<"members">, "emoji" | "color"> | null; size?: number; ring?: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: m ? m.color + "22" : C.chip,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: ring ? 2 : 0,
        borderColor: m?.color ?? C.line,
      }}
    >
      <Text style={{ fontSize: size * 0.55 }}>{m?.emoji ?? "＋"}</Text>
    </View>
  );
}

export function Ring({
  size = 120,
  stroke = 12,
  progress,
  color = C.ink,
  track = C.line,
  children,
}: {
  size?: number;
  stroke?: number;
  progress: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - p)}
          strokeLinecap="round"
        />
      </Svg>
      {children}
    </View>
  );
}

export function Pill({ label, active, onPress, color }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Press onPress={onPress} style={[styles.pill, active ? { backgroundColor: color ?? C.black } : null] as any}>
      <T style={{ fontWeight: "700", fontSize: 14, color: active ? C.white : C.ink2 }}>{label}</T>
    </Press>
  );
}

export function Button({
  label,
  onPress,
  dark = true,
  disabled,
  style,
  icon,
}: {
  label: string;
  onPress?: () => void;
  dark?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: string;
}) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, { backgroundColor: dark ? C.black : C.card, borderWidth: dark ? 0 : 1, borderColor: C.line }, style as any]}
    >
      <T style={{ color: dark ? C.white : C.ink, fontWeight: "700", fontSize: 17 }}>
        {icon ? `${icon}  ` : ""}
        {label}
      </T>
    </Press>
  );
}

/** One row in any list: check circle, emoji, title, who, when. Long-press for more. */
export function ItemRow({
  item,
  members,
  meId,
  compact,
}: {
  item: Doc<"items">;
  members: Doc<"members">[];
  meId: Id<"members">;
  compact?: boolean;
}) {
  const toggle = useMutation(api.items.toggleDone);
  const [sheet, setSheet] = useState(false);
  const who = members.find((m) => m._id === item.assigneeId);
  const done = item.status === "done";
  const k = KIND[item.kind];
  return (
    <>
      <Press onPress={() => setSheet(true)} haptic={false} style={[styles.row, compact ? { paddingVertical: 10 } : null] as any}>
        <Press
          onPress={() => {
            tap(done ? "light" : "success");
            toggle({ itemId: item._id, memberId: meId });
          }}
          haptic={false}
          style={[styles.check, done ? { backgroundColor: C.black, borderColor: C.black } : null] as any}
        >
          {done ? <T style={{ color: C.white, fontSize: 13, fontWeight: "900" }}>✓</T> : null}
        </Press>
        <View style={[styles.emoji, { backgroundColor: k.color + "18" }]}>
          <Text style={{ fontSize: 18 }}>{item.emoji ?? k.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <T numberOfLines={2} style={[{ fontWeight: "650" as any, fontSize: 15.5 }, done ? { color: C.muted, textDecorationLine: "line-through" } : null] as any}>
            {item.title}
          </T>
          <T style={{ color: C.muted, fontSize: 12.5, marginTop: 2 }}>
            {[who ? `${who.name}${item.status === "claimed" ? " · got it" : ""}` : "Anyone", item.dueLabel].filter(Boolean).join(" · ")}
          </T>
        </View>
        {who ? <Avatar m={who} size={30} /> : null}
      </Press>
      <ItemSheet visible={sheet} onClose={() => setSheet(false)} item={item} members={members} meId={meId} />
    </>
  );
}

export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        {children}
      </View>
    </Modal>
  );
}

function ItemSheet({
  visible,
  onClose,
  item,
  members,
  meId,
}: {
  visible: boolean;
  onClose: () => void;
  item: Doc<"items">;
  members: Doc<"members">[];
  meId: Id<"members">;
}) {
  const claim = useMutation(api.items.claim);
  const toggle = useMutation(api.items.toggleDone);
  const reassign = useMutation(api.items.reassign);
  const remove = useMutation(api.items.remove);
  const creator = members.find((m) => m._id === item.createdById);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <Text style={{ fontSize: 34 }}>{item.emoji ?? KIND[item.kind].emoji}</Text>
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 20, fontWeight: "800" }}>{item.title}</T>
          <T style={{ color: C.muted, marginTop: 2 }}>
            {KIND[item.kind].one}
            {item.dueLabel ? ` · ${item.dueLabel}` : ""}
            {creator ? ` · from ${creator.name}` : ""}
            {item.source === "kin" ? " · via Kin" : ""}
          </T>
        </View>
      </View>
      <T style={{ color: C.muted, fontWeight: "700", fontSize: 12, marginTop: 14, marginBottom: 8, letterSpacing: 0.6 }}>WHO'S ON IT</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {members.map((m) => (
          <Press
            key={m._id}
            onPress={() => reassign({ itemId: item._id, assigneeId: m._id, byId: meId })}
            style={[styles.who, item.assigneeId === m._id ? { backgroundColor: C.black } : null] as any}
          >
            <Text style={{ fontSize: 16 }}>{m.emoji}</Text>
            <T style={{ fontWeight: "700", color: item.assigneeId === m._id ? C.white : C.ink }}>{m.name}</T>
          </Press>
        ))}
      </View>
      <View style={{ gap: 10, marginTop: 20 }}>
        {item.status !== "done" ? (
          <Button
            label="I've got it"
            icon="🙋"
            onPress={() => {
              claim({ itemId: item._id, memberId: meId });
              tap("success");
              onClose();
            }}
          />
        ) : null}
        <Button
          dark={false}
          label={item.status === "done" ? "Mark not done" : "Mark done"}
          onPress={() => {
            toggle({ itemId: item._id, memberId: meId });
            onClose();
          }}
        />
        <Press
          onPress={() => {
            remove({ itemId: item._id });
            onClose();
          }}
          style={{ alignItems: "center", padding: 10 }}
        >
          <T style={{ color: C.danger, fontWeight: "700" }}>Delete</T>
        </Press>
      </View>
    </Sheet>
  );
}

export function Empty({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 20 }}>
      <Text style={{ fontSize: 44 }}>{emoji}</Text>
      <T style={{ fontWeight: "800", fontSize: 18, marginTop: 10 }}>{title}</T>
      <T style={{ color: C.muted, textAlign: "center", marginTop: 6 }}>{sub}</T>
    </View>
  );
}

export function timeAgo(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 18, ...shadow },
  pill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  btn: { height: 56, borderRadius: R.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.faint, alignItems: "center", justifyContent: "center" },
  emoji: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 40 },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 16 },
  who: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.chip },
});
