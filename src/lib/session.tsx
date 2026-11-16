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

const KEY = "kin.session.v1";

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
