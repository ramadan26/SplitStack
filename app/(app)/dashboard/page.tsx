import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatCents } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RefreshButton } from "@/components/ui/refresh-button";
import { CategoryDonut, MonthlyBars } from "@/components/dashboard/charts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [t, locale] = await Promise.all([
    getTranslations("dashboard"),
    getLocale(),
  ]);
  const money = (cents: number) => formatCents(cents, "USD", locale);

  const data = await getDashboardData(userId);

  const stats = [
    { label: t("totalSpent"), value: money(data.totalSpent), emoji: "💸", tone: "text-zinc-900 dark:text-zinc-50" },
    { label: t("youAreOwed"), value: money(data.owedToMe), emoji: "📈", tone: "text-brand-600 dark:text-brand-400" },
    { label: t("youOwe"), value: money(data.iOwe), emoji: "📉", tone: "text-red-600 dark:text-red-400" },
    { label: t("groups"), value: String(data.groupCount), emoji: "👥", tone: "text-zinc-900 dark:text-zinc-50" },
  ];

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("allGroups")}
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span aria-hidden>{stat.emoji}</span>
              {stat.label}
            </p>
            <p className={cn("mt-1 truncate text-xl font-bold", stat.tone)}>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      {data.totalSpent === 0 ? (
        <EmptyState
          emoji="📊"
          title={t("noDataTitle")}
          description={t("noDataDescription")}
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("byCategory")}
            </h2>
            <CategoryDonut data={data.byCategory} />
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("byMonth")}
            </h2>
            <MonthlyBars data={data.byMonth} />
          </Card>
        </div>
      )}
    </div>
  );
}
