import { cn } from "@/lib/utils";

const tones = {
  neutral:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  brand: "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200",
  amber:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
} as const;

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
