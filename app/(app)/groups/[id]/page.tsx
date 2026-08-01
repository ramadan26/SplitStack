import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getGroupForUser } from "@/lib/data/groups";
import { computeNetBalances, simplifyDebts } from "@/lib/balance";
import { decimalToCents, formatCents } from "@/lib/money";
import { CATEGORY_META } from "@/lib/categories";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupTabs } from "@/components/groups/group-tabs";
import { GroupHeader } from "@/components/groups/group-header";
import { SwipeableExpenseRow } from "@/components/expenses/swipeable-expense-row";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Group",
};

const dateLocales = { en: enUS, ar } as const;

export default async function GroupDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [t, tCommon, tExpense, tSettle, locale] = await Promise.all([
    getTranslations("group"),
    getTranslations("common"),
    getTranslations("expense"),
    getTranslations("settle"),
    getLocale(),
  ]);
  const money = (cents: number) => formatCents(cents, "USD", locale);
  const dateLocale = dateLocales[locale as keyof typeof dateLocales] ?? enUS;

  const result = await getGroupForUser(params.id, userId);
  if (!result) notFound();
  const { group } = result;

  const activeMembers = group.members.filter((m) => m.status === "ACTIVE");
  const memberIds = activeMembers.map((m) => m.userId);
  const memberById = new Map(activeMembers.map((m) => [m.userId, m.user]));
  const nameOf = (id: string) => {
    const u = memberById.get(id);
    return u?.name ?? u?.email ?? "?";
  };

  const balances = computeNetBalances(memberIds, group.expenses, group.settlements);
  const transfers = simplifyDebts(balances);
  const myBalance = balances.get(userId) ?? 0;
  const myTransfers = transfers.filter(
    (tr) => tr.from === userId || tr.to === userId,
  );

  const totalSpent = group.expenses.reduce(
    (sum, e) => sum + decimalToCents(e.amount),
    0,
  );
  const recentExpenses = group.expenses.slice(0, 10);

  return (
    <div className="space-y-6">
      <GroupHeader
        group={group}
        memberCount={activeMembers.length}
        totalSpentCents={totalSpent}
        myBalanceCents={myBalance}
      />

      <GroupTabs groupId={group.id} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Balances involving me */}
        <section className="lg:order-2">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t("yourBalances")}
          </h2>
          {myTransfers.length === 0 ? (
            <Card className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
              {t("allSettled")}
            </Card>
          ) : (
            <>
              <ul className="space-y-2">
                {myTransfers.map((tr) => {
                  const iAmCreditor = tr.to === userId;
                  const otherId = iAmCreditor ? tr.from : tr.to;
                  const other = memberById.get(otherId);
                  return (
                    <li key={`${tr.from}-${tr.to}`}>
                      <Card className="flex items-center gap-3 p-4">
                        <Avatar
                          name={other?.name}
                          email={other?.email}
                          image={other?.image}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {iAmCreditor
                            ? t("owesYou", { name: nameOf(otherId) })
                            : t("youOweName", { name: nameOf(otherId) })}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-semibold",
                            iAmCreditor
                              ? "text-brand-600 dark:text-brand-400"
                              : "text-red-600 dark:text-red-400",
                          )}
                        >
                          {money(tr.amount)}
                        </span>
                      </Card>
                    </li>
                  );
                })}
              </ul>
              <Link
                href={`/groups/${group.id}/settle`}
                className={buttonClasses({ size: "lg", className: "mt-3 w-full rounded-full" })}
              >
                {tSettle("title")}
              </Link>
            </>
          )}
        </section>

        {/* Recent expenses */}
        <section className="lg:order-1">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t("recentExpenses")}
          </h2>
          {recentExpenses.length === 0 ? (
            <EmptyState
              emoji="🧾"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            >
              <Link
                href={`/groups/${group.id}/expenses/new`}
                className={buttonClasses({ size: "lg", className: "rounded-full" })}
              >
                {tExpense("add")}
              </Link>
            </EmptyState>
          ) : (
            <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentExpenses.map((expense) => {
                const amount = decimalToCents(expense.amount);
                const mySplit = expense.splits.find((s) => s.userId === userId);
                const iPaid = expense.paidById === userId;
                const meta = CATEGORY_META[expense.category];

                return (
                  <SwipeableExpenseRow
                    key={expense.id}
                    expenseId={expense.id}
                    editHref={`/groups/${group.id}/expenses/${expense.id}`}
                    deleteConfirmLabel={tExpense("deleteConfirm")}
                  >
                  <Link
                    href={`/groups/${group.id}/expenses/${expense.id}`}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-100 leading-none dark:bg-zinc-800">
                      <span className="text-sm font-bold">
                        {format(expense.date, "d", { locale: dateLocale })}
                      </span>
                      <span className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400">
                        {format(expense.date, "MMM", { locale: dateLocale })}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        <span aria-hidden className="me-1">
                          {meta.emoji}
                        </span>
                        {expense.description}
                      </span>
                      <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                        {t("paidLine", {
                          name: iPaid ? tCommon("you") : nameOf(expense.paidById),
                          amount: money(amount),
                        })}
                      </span>
                    </span>
                    {iPaid ? (
                      <span className="shrink-0 text-end text-xs font-medium text-brand-600 dark:text-brand-400">
                        {t("youPaid")}
                        <span className="block text-sm font-semibold">
                          {money(amount)}
                        </span>
                      </span>
                    ) : mySplit ? (
                      <span className="shrink-0 text-end text-xs font-medium text-red-600 dark:text-red-400">
                        {t("youBorrowed")}
                        <span className="block text-sm font-semibold">
                          {money(decimalToCents(mySplit.amount))}
                        </span>
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-zinc-400">
                        {t("notInvolved")}
                      </span>
                    )}
                  </Link>
                  </SwipeableExpenseRow>
                );
              })}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
