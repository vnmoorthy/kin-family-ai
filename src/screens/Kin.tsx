import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Avatar, Press, T, tap } from "@/components/ui";
import { pickAndUpload } from "@/lib/snap";
import { C, R } from "@/lib/theme";

const SUGGESTIONS = [
  "We're out of eggs 🥚",
  "Arjun's science fair is Friday",
  "What's left for today?",
  "Remind Paati about her 8pm medicine",
  "Who's picking up Arjun Thursday?",
];

function Thinking() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1100, useNativeDriver: Platform.OS !== "web" }));
    loop.start();
    return () => loop.stop();
  }, [a]);
  return (
    <View style={{ flexDirection: "row", gap: 5, paddingVertical: 6 }}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            s.dot,
            {
              opacity: a.interpolate({
                inputRange: [0, 0.33 * i, 0.33 * i + 0.2, 1],
                outputRange: [0.25, 0.25, 1, 0.25],
                extrapolate: "clamp",
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function Kin({
  householdId,
  me,
  members,
  seed,
  onSeedUsed,
  snapRequest,
  onSnapHandled,
}: {
  householdId: Id<"households">;
  me: Doc<"members">;
  members: Doc<"members">[];
  seed?: string;
  onSeedUsed: () => void;
  snapRequest?: "camera" | "library" | null;
  onSnapHandled: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"family" | "private">("family");
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const messages = useQuery(api.messages.list, { householdId, memberId: me._id, mode });
  const send = useMutation(api.messages.send);
  const genUrl = useMutation(api.messages.generateUploadUrl);
  const scroll = useRef<any>(null);

  useEffect(() => {
    if (seed) {
      setText(seed);
      onSeedUsed();
    }
  }, [seed, onSeedUsed]);

  const doSend = async (body: string, imageId?: string) => {
    const t = body.trim();
    if (!t && !imageId) return;
    setText("");
    tap("medium");
    await send({ householdId, memberId: me._id, text: t, visibility: mode, imageId: imageId as any });
  };

  const snap = async (src: "camera" | "library") => {
    try {
      setUploading(true);
      const r = await pickAndUpload(src, () => genUrl());
      if (r) await doSend(text || "", r.storageId);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (snapRequest) {
      onSnapHandled();
      snap(snapRequest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapRequest]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={0}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={s.kinAvatar}>
            <Text style={{ fontSize: 20 }}>🧠</Text>
          </View>
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 22, fontWeight: "900", letterSpacing: -0.5 }}>Kin</T>
            <T style={{ color: C.muted, fontSize: 12.5 }}>
              {mode === "family" ? `Family thread · ${members.length} people see this` : "Private · only you see this"}
            </T>
          </View>
        </View>
        <View style={s.segment}>
          {(["family", "private"] as const).map((m) => (
            <Press key={m} onPress={() => setMode(m)} style={[s.segBtn, mode === m ? s.segOn : null] as any}>
              <T style={{ fontWeight: "800", fontSize: 14, color: mode === m ? C.ink : C.muted }}>
                {m === "family" ? "🏡 Family" : "🔒 Just me"}
              </T>
            </Press>
          ))}
        </View>
      </View>

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 20, gap: 12 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages === undefined ? <ActivityIndicator style={{ marginTop: 40 }} /> : null}
        {messages?.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40, paddingHorizontal: 24 }}>
            <Text style={{ fontSize: 40 }}>{mode === "private" ? "🔒" : "👋"}</Text>
            <T style={{ fontWeight: "800", fontSize: 18, marginTop: 8, textAlign: "center" }}>
              {mode === "private" ? "Your private corner" : "Talk to your family brain"}
            </T>
            <T style={{ color: C.muted, textAlign: "center", marginTop: 6 }}>
              {mode === "private"
                ? "Only you and Kin see this. Plan surprises, vent, keep notes — Kin keeps them in your private memory."
                : "Say what's going on. Kin remembers it and nudges the right person."}
            </T>
          </View>
        ) : null}
        {messages?.map((m) => {
          const author = members.find((x) => x._id === m.authorId);
          const mine = m.authorId === me._id;
          if (m.role === "kin") {
            return (
              <View key={m._id} style={{ flexDirection: "row", gap: 8, alignItems: "flex-end", maxWidth: "88%" }}>
                <View style={s.kinSmall}>
                  <Text style={{ fontSize: 13 }}>🧠</Text>
                </View>
                <View style={{ flexShrink: 1 }}>
                  <View style={s.kinBubble}>{m.pending ? <Thinking /> : <T style={{ fontSize: 15.5, lineHeight: 22 }}>{m.text}</T>}</View>
                  {m.actions?.length ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      {m.actions.map((a, i) => (
                        <View key={i} style={s.chip}>
                          <Text style={{ fontSize: 12 }}>{a.icon}</Text>
                          <T style={{ fontSize: 12.5, fontWeight: "700", color: C.ink2 }} numberOfLines={1}>
                            {a.label}
                          </T>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }
          return (
            <View key={m._id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
              {!mine ? <Avatar m={author ?? (m.deviceEmoji ? { emoji: m.deviceEmoji, color: "#22C55E" } : null)} size={28} /> : null}
              <View>
                {!mine ? (
                  <T style={{ fontSize: 12, color: C.muted, marginBottom: 3, marginLeft: 4 }}>
                    {author?.name ?? (m.deviceLabel ? `${m.deviceLabel} · smart home` : "")}
                  </T>
                ) : null}
                {m.imageUrl ? <Image source={{ uri: m.imageUrl }} style={s.photo} contentFit="cover" /> : null}
                {m.text ? (
                  <View style={[s.userBubble, mine ? { backgroundColor: C.black } : { backgroundColor: C.card }]}>
                    <T style={{ fontSize: 15.5, lineHeight: 22, color: mine ? C.white : C.ink }}>{m.text}</T>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {!text ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          {SUGGESTIONS.map((sug) => (
            <Press key={sug} onPress={() => doSend(sug)} style={s.sug}>
              <T style={{ fontWeight: "700", fontSize: 13.5, color: C.ink2 }}>{sug}</T>
            </Press>
          ))}
        </ScrollView>
      ) : null}

      <View style={[s.inputBar, { marginBottom: Math.max(insets.bottom, 10) + 70 }]}>
        <Press onPress={() => snap("camera")} style={s.iconBtn}>
          {uploading ? <ActivityIndicator size="small" /> : <Text style={{ fontSize: 20 }}>📷</Text>}
        </Press>
        <Press onPress={() => snap("library")} style={s.iconBtn}>
          <Text style={{ fontSize: 19 }}>🖼️</Text>
        </Press>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={mode === "family" ? "Tell the family brain…" : "Tell Kin privately…"}
          placeholderTextColor={C.faint}
          style={s.input}
          multiline
          onSubmitEditing={() => doSend(text)}
          blurOnSubmit
          returnKeyType="send"
        />
        <Press onPress={() => doSend(text)} disabled={!text.trim()} style={[s.send, !text.trim() ? { backgroundColor: C.faint } : null] as any}>
          <T style={{ color: C.white, fontWeight: "900", fontSize: 18 }}>↑</T>
        </Press>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 10, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.line, gap: 12 },
  kinAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.black, alignItems: "center", justifyContent: "center" },
  kinSmall: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.black, alignItems: "center", justifyContent: "center" },
  segment: { flexDirection: "row", backgroundColor: C.chip, borderRadius: R.pill, padding: 4 },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: R.pill },
  segOn: { backgroundColor: C.card, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  kinBubble: { backgroundColor: C.card, borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.line },
  userBubble: { borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.line, maxWidth: 260 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.ink2 },
  photo: { width: 220, height: 220, borderRadius: 18, marginBottom: 6, backgroundColor: C.chip },
  sug: { backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: C.line },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginHorizontal: 12, backgroundColor: C.card, borderRadius: 28, padding: 6, borderWidth: 1, borderColor: C.line },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.chip, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: 42, maxHeight: 110, fontSize: 16, color: C.ink, paddingHorizontal: 6, paddingTop: 11, paddingBottom: 10 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.black, alignItems: "center", justifyContent: "center" },
});
