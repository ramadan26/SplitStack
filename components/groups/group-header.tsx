import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Sticky group summary header shared by all group tabs
 * (expenses, activity, …) so they stay visually consistent.
 */
export async function GroupHeader({
  group,
  memberCount,
  totalSpentCents,
  myBalanceCents,
}: {
  group: { id: string; name: string; imageUrl: string | null };
  memberCount: number;
  totalSpentCents: number;
  myBalanceCents: number;
}) {
  const [t, tCommon, tExpense, locale] = await Promise.all([
    getTranslations("group"),
    getTranslations("common"),
    getTranslations("expense"),
    getLocale(),
  ]);
  const money = (cents: number) => formatCents(cents, "USD", locale);

  return (
    <div className="sticky top-14 z-10 -mx-4 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 md:top-0 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-2xl dark:bg-brand-950">
          {group.imageUrl ?? "👥"}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight tracking-tight">
            {group.name}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {tCommon("members", { count: memberCount })}
            {" · "}
            {t("spent", { amount: money(totalSpentCents) })}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
            myBalanceCents > 0 &&
              "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
            myBalanceCents < 0 &&
              "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
            myBalanceCents === 0 &&
              "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
          )}
        >
          {myBalanceCents > 0
            ? t("owedYou", { amount: money(myBalanceCents) })
            : myBalanceCents < 0
              ? t("youOweShort", { amount: money(-myBalanceCents) })
              : tCommon("settledUp")}
        </span>
        <Link
          href={`/groups/${group.id}/expenses/new`}
          aria-label={tExpense("addTitle")}
          title={tExpense("addTitle")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white shadow-sm shadow-brand-500/30 transition-colors hover:bg-brand-600 active:bg-brand-700"
        >
          +
        </Link>
        <Link
          href={`/groups/${group.id}/settings`}
          aria-label={t("settings")}
          title={t("settings")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ⚙️
        </Link>
      </div>
    </div>
  );
}
