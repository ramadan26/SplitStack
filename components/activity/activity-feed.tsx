import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import type { ActivityType } from "@prisma/client";
import { formatCents } from "@/lib/money";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const TYPE_ICONS: Record<ActivityType, string> = {
  GROUP_CREATED: "👥",
  MEMBER_ADDED: "➕",
  MEMBER_JOINED: "👋",
  EXPENSE_ADDED: "🧾",
  EXPENSE_UPDATED: "✏️",
  EXPENSE_DELETED: "🗑️",
  SETTLEMENT_RECORDED: "💸",
};

type ActivityItem = {
  id: string;
  type: ActivityType;
  createdAt: Date;
  expenseId: string | null;
  user: { id: string; name: string | null; email: string | null; image: string | null };
  group: { id: string; name: string; imageUrl: string | null };
  metadata: unknown;
};

type ActivityMetadata = {
  description?: string;
  amountCents?: number;
  invitedEmail?: string;
  fromUserId?: string;
  toUserId?: string;
};

const dateLocales = { en: enUS, ar } as const;

export function ActivityFeed({
  activities,
  currentUserId,
  userNames,
  showGroup,
}: {
  activities: ActivityItem[];
  currentUserId: string;
  userNames: Map<string, string>;
  showGroup: boolean;
}) {
  const t = useTranslations("activity");
  const locale = useLocale();
  const money = (cents: number) => formatCents(cents, "USD", locale);
  const dateLocale = dateLocales[locale as keyof typeof dateLocales] ?? enUS;

  if (activities.length === 0) {
    return (
      <EmptyState
        emoji="🔔"
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {activities.map((activity) => {
        const meta = (activity.metadata ?? {}) as ActivityMetadata;
        const actor =
          activity.user.id === currentUserId
            ? t("you")
            : (activity.user.name ?? activity.user.email ?? "?");

        let sentence: string;
        switch (activity.type) {
          case "GROUP_CREATED":
            sentence = t("groupCreated", { actor });
            break;
          case "MEMBER_ADDED":
            sentence = t("memberAdded", {
              actor,
              email: meta.invitedEmail ?? "?",
            });
            break;
          case "MEMBER_JOINED":
            sentence = t("memberJoined", { actor });
            break;
          case "EXPENSE_ADDED":
            sentence = t("expenseAdded", {
              actor,
              description: meta.description ?? "?",
            });
            break;
          case "EXPENSE_UPDATED":
            sentence = t("expenseUpdated", {
              actor,
              description: meta.description ?? "?",
            });
            break;
          case "EXPENSE_DELETED":
            sentence = t("expenseDeleted", {
              actor,
              description: meta.description ?? "?",
            });
            break;
          case "SETTLEMENT_RECORDED": {
            const from =
              meta.fromUserId === currentUserId
                ? t("you")
                : userNames.get(meta.fromUserId ?? "") ?? "?";
            const to =
              meta.toUserId === currentUserId
                ? t("you")
                : userNames.get(meta.toUserId ?? "") ?? "?";
            sentence = t("settlement", { from, to });
            break;
          }
        }

        const linkable =
          activity.expenseId !== null && activity.type !== "EXPENSE_DELETED";
        const href = linkable
          ? `/groups/${activity.group.id}/expenses/${activity.expenseId}`
          : undefined;

        const row = (
          <div className="flex items-center gap-3 p-4">
            <span className="relative shrink-0">
              <Avatar
                name={activity.user.name}
                email={activity.user.email}
                image={activity.user.image}
                size="md"
              />
              <span
                aria-hidden
                className="absolute -bottom-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[10px] ring-2 ring-white dark:bg-zinc-800 dark:ring-zinc-900"
              >
                {TYPE_ICONS[activity.type]}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{sentence}</span>
              <span className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="shrink-0">
                  {formatDistanceToNow(activity.createdAt, {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </span>
                {showGroup ? (
                  <span className="truncate rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                    {activity.group.imageUrl} {activity.group.name}
                  </span>
                ) : null}
              </span>
            </span>
            {meta.amountCents !== undefined ? (
              <span className="shrink-0 text-sm font-semibold">
                {money(meta.amountCents)}
              </span>
            ) : null}
          </div>
        );

        return href ? (
          <Link
            key={activity.id}
            href={href}
            className="block transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          >
            {row}
          </Link>
        ) : (
          <div key={activity.id}>{row}</div>
        );
      })}
    </Card>
  );
}
