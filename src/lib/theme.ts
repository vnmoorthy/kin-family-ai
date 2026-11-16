// Kin design tokens — clean, monochrome, big type, soft cards, tiny pops of color.
export const C: Record<string, string> & typeof CLASSIC = {} as any;
const CLASSIC = {
  bg: "#F5F5F7",
  card: "#FFFFFF",
  ink: "#0B0B0F",
  ink2: "#3A3A42",
  muted: "#8E8E96",
  faint: "#C7C7CE",
  line: "#ECECF0",
  chip: "#F1F1F4",
  black: "#0B0B0F",
  white: "#FFFFFF",
  flame: "#FF6B2C",
  grocery: "#22C55E",
  task: "#3B82F6",
  event: "#A855F7",
  reminder: "#F59E0B",
  danger: "#EF4444",
  privacy: "#6366F1",
};

Object.assign(C, CLASSIC);

/** Themes: monochrome Classic plus colorful, aesthetic palettes. "black" is the primary accent. */
export const THEMES = {
  classic: { label: "Classic", ...CLASSIC },
  ember: {
    label: "Ember",
    ...CLASSIC,
    bg: "#0A0A0C",
    card: "#16161A",
    ink: "#F5F5F7",
    ink2: "#C9C9D0",
    muted: "#8E8E96",
    faint: "#4A4A52",
    line: "#26262C",
    chip: "#1F1F24",
    black: "#FF6A1A",
    flame: "#FF6A1A",
  },
  sunset: {
    label: "Sunset",
    ...CLASSIC,
    bg: "#FFF1EC",
    ink: "#2A1033",
    ink2: "#4A2E52",
    muted: "#9B8399",
    faint: "#DCC7D8",
    line: "#F6E1E8",
    chip: "#FCE9EF",
    black: "#8B3DFF",
    flame: "#FF5E62",
  },
  ocean: {
    label: "Ocean",
    ...CLASSIC,
    bg: "#ECF5FF",
    ink: "#0B2545",
    ink2: "#24406A",
    muted: "#7A8CA8",
    faint: "#C3D0E3",
    line: "#DAE7F7",
    chip: "#E3EEFB",
    black: "#0A72F0",
  },
  matcha: {
    label: "Matcha",
    ...CLASSIC,
    bg: "#F1F6EC",
    ink: "#1C2B16",
    ink2: "#3B4A33",
    muted: "#84927A",
    faint: "#CBD6C1",
    line: "#E0EAD6",
    chip: "#E7F0DE",
    black: "#3E8E4E",
  },
} as const;
export type ThemeName = keyof typeof THEMES;

const listeners: (() => void)[] = [];
/** Screens register their StyleSheet factories here so a theme switch rebuilds them. */
export function onTheme(fn: () => void) {
  listeners.push(fn);
}
export const isDark = () => C.bg.toLowerCase() === "#0a0a0c";
export function applyTheme(name: ThemeName) {
  const { label, ...palette } = THEMES[name] ?? THEMES.classic;
  Object.assign(C, palette);
  listeners.forEach((f) => f());
}

export const R = { sm: 12, md: 18, lg: 24, xl: 32, pill: 999 };

export const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

export const KIND = {
  task: { label: "Tasks", one: "Task", color: C.task, emoji: "✅" },
  grocery: { label: "Groceries", one: "Grocery", color: C.grocery, emoji: "🛒" },
  event: { label: "Events", one: "Event", color: C.event, emoji: "📅" },
  reminder: { label: "Reminders", one: "Reminder", color: C.reminder, emoji: "⏰" },
} as const;

export type Kind = keyof typeof KIND;
