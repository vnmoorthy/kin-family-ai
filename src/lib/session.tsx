import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, Fragment, useCallback, useContext, useEffect, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { applyTheme, ThemeName, THEMES } from "@/lib/theme";

type Session = { householdId: Id<"households">; memberId: Id<"members"> } | null;

const Ctx = createContext<{
  session: Session;
  ready: boolean;
  signIn: (s: NonNullable<Session>) => Promise<void>;
  signOut: () => Promise<void>;
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}>({ session: null, ready: false, signIn: async () => {}, signOut: async () => {}, theme: "classic", setTheme: () => {} });
const THEME_KEY = "kin.theme.v1";

// On web, ?profile=<name> keeps separate sessions per frame, so two "phones" can run side by side in one browser.
const PROFILE =
  typeof window !== "undefined" && (window as any).location?.search
    ? new URLSearchParams((window as any).location.search).get("profile")
    : null;
const KEY = PROFILE ? `kin.session.v1.${PROFILE}` : "kin.session.v1";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState<ThemeName>("classic");

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(KEY).catch(() => null), AsyncStorage.getItem(THEME_KEY).catch(() => null)])
      .then(([raw, t]) => {
        if (t && t in THEMES) {
          applyTheme(t as ThemeName);
          setThemeState(t as ThemeName);
        }
        if (raw) setSession(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setTheme = useCallback((t: ThemeName) => {
    applyTheme(t);
    setThemeState(t);
    AsyncStorage.setItem(THEME_KEY, t).catch(() => {});
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

  return (
    <Ctx.Provider value={{ session, ready, signIn, signOut, theme, setTheme }}>
      {/* key: a theme switch remounts the tree so every screen picks up the new palette */}
      <Fragment key={theme}>{children}</Fragment>
    </Ctx.Provider>
  );
}

export const useSession = () => useContext(Ctx);
