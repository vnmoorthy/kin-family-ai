import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";

type Session = { householdId: Id<"households">; memberId: Id<"members"> } | null;

const Ctx = createContext<{
  session: Session;
  ready: boolean;
  signIn: (s: NonNullable<Session>) => Promise<void>;
  signOut: () => Promise<void>;
}>({ session: null, ready: false, signIn: async () => {}, signOut: async () => {} });

// On web, ?profile=<name> keeps separate sessions per frame, so two "phones" can run side by side in one browser.
const PROFILE =
  typeof window !== "undefined" && (window as any).location?.search
    ? new URLSearchParams((window as any).location.search).get("profile")
    : null;
const KEY = PROFILE ? `kin.session.v1.${PROFILE}` : "kin.session.v1";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setSession(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const signIn = useCallback(async (s: NonNullable<Session>) => {
    setSession(s);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
  }, []);

  const signOut = useCallback(async () => {
    setSession(null);
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {}
  }, []);

  return <Ctx.Provider value={{ session, ready, signIn, signOut }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
