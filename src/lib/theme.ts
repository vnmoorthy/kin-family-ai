// Kin design tokens — clean, monochrome, big type, soft cards, tiny pops of color.
export const C = {
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
