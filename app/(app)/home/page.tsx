import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getGroupsForUser } from "@/lib/data/groups";
import { computeNetBalances } from "@/lib/balance";
import { decimalToCents, formatCents } from "@/lib/money";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { RefreshButton } from "@/components/ui/refresh-button";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your groups",
};

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [t, tCommon, locale] = await Promise.all([
    getTranslations("home"),
    getTranslations("common"),
    getLocale(),
  ]);
  const money = (cents: number) => formatCents(cents, "USD", locale);

  const groups = await getGroupsForUser(userId);

  return (
    <div className="space-y-5 py-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-1">
          <RefreshButton />
          <Link
            href="/groups/new"
            className={buttonClasses({ size: "md", className: "rounded-full" })}
          >
            + {t("newGroup")}
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          emoji="👥"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        >
          <Link href="/groups/new" className={buttonClasses({ size: "lg", className: "rounded-full" })}>
            {t("emptyCta")}
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const balances = computeNetBalances(
              group.members
                .filter((m) => m.status === "ACTIVE")
                .map((m) => m.userId),
              group.expenses,
              group.settlements,
            );
            const myBalance = balances.get(userId) ?? 0;
            const totalSpent = group.expenses.reduce(
              (sum, e) => sum + decimalToCents(e.amount),
              0,
            );
            const previewMembers = group.members.slice(0, 3);
            const extraMembers = group.members.length - previewMembers.length;

            return (
              <li key={group.id}>
                <Link
                  href={`/groups/${group.id}`}
                  className="block rounded-2xl border border-zinc-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md hover:shadow-brand-500/5 active:translate-y-0 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-2xl dark:bg-brand-950">
                      {group.imageUrl ?? "👥"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {group.name}
                      </span>
                      <span className="block text-sm text-zinc-500 dark:text-zinc-400">
                        {tCommon("members", { count: group.members.length })} ·{" "}
                        {t("total", { amount: money(totalSpent) })}
                      </span>
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="flex items-center -space-x-2 rtl:space-x-reverse">
                      {previewMembers.map((m) => (
                        <Avatar
                          key={m.userId}
                          name={m.user.name}
                          email={m.user.email}
                          image={m.user.image}
                          size="sm"
                          className="ring-2 ring-white dark:ring-zinc-900"
                        />
                      ))}
                      {extraMembers > 0 ? (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 ring-2 ring-white dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-900">
                          +{extraMembers}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        myBalance > 0 &&
                          "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
                        myBalance < 0 &&
                          "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
                        myBalance === 0 &&
                          "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                      )}
                    >
                      {myBalance > 0
                        ? `${tCommon("youAreOwed")} ${money(myBalance)}`
                        : myBalance < 0
                          ? `${tCommon("youOwe")} ${money(-myBalance)}`
                          : tCommon("settledUp")}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
