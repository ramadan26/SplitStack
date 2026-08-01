import type { Category } from "@prisma/client";

export const CATEGORY_META: Record<Category, { emoji: string; label: string }> = {
  FOOD: { emoji: "🍔", label: "Food & drink" },
  TRANSPORT: { emoji: "🚕", label: "Transport" },
  HOUSING: { emoji: "🏠", label: "Housing" },
  UTILITIES: { emoji: "💡", label: "Utilities" },
  ENTERTAINMENT: { emoji: "🎬", label: "Entertainment" },
  SHOPPING: { emoji: "🛍️", label: "Shopping" },
  OTHER: { emoji: "📦", label: "Other" },
};

export const GROUP_EMOJIS = [
  "✈️",
  "🏠",
  "🍻",
  "🎉",
  "🏖️",
  "⛺",
  "🍕",
  "💑",
  "👨‍👩‍👧‍👦",
  "💼",
  "🎓",
  "⚽",
] as const;
