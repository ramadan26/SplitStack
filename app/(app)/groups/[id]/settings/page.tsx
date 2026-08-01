import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getGroupForUser } from "@/lib/data/groups";
import { computeNetBalances } from "@/lib/balance";
import { Avatar } from "@/components/ui/avatar";
import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DeleteGroupButton,
  InviteForm,
  LeaveGroupButton,
  RenameForm,
} from "@/components/groups/settings-forms";

export const metadata: Metadata = {
  title: "Group settings",
};

export default async function GroupSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [t, tCommon] = await Promise.all([
    getTranslations("settings"),
    getTranslations("common"),
  ]);

  const result = await getGroupForUser(params.id, userId);
  if (!result) notFound();
  const { group, membership } = result;

  // Leave is only allowed with a settled balance — mirror the server rule
  // so the UI can hint at it before the button is pressed.
  const balances = computeNetBalances(
    group.members.filter((m) => m.status === "ACTIVE").map((m) => m.userId),
    group.expenses,
    group.settlements,
  );
  const canLeave = (balances.get(userId) ?? 0) === 0;

  const isAdmin = membership.role === "ADMIN";

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center gap-2">
        <BackLink href={`/groups/${group.id}`} label={tCommon("back")} />
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <RenameForm groupId={group.id} defaultName={group.name} />
        </Card>

        <Card className="space-y-4 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t("members")}
          </h2>
          <ul className="space-y-3">
            {group.members.map((member) => (
              <li key={member.userId} className="flex items-center gap-3">
                <Avatar
                  name={member.user.name}
                  email={member.user.email}
                  image={member.user.image}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {member.user.name ?? member.user.email}
                    {member.userId === userId ? ` ${t("youSuffix")}` : ""}
                  </span>
                  {member.user.name && member.user.email ? (
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {member.user.email}
                    </span>
                  ) : null}
                </span>
                {member.status === "PENDING" ? (
                  <Badge tone="amber">{t("pending")}</Badge>
                ) : null}
                {member.role === "ADMIN" ? (
                  <Badge tone="brand">{t("admin")}</Badge>
                ) : null}
              </li>
            ))}
          </ul>
          <InviteForm groupId={group.id} />
        </Card>

        <Card className="divide-y divide-red-100 border-red-200 dark:divide-red-900/30 dark:border-red-900/50 lg:col-span-2">
          <div className="p-4 pb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
              <span aria-hidden>⚠️</span>
              {t("dangerZone")}
            </h2>
          </div>

          <div className="flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t("leaveGroup")}</p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {canLeave ? t("leaveDescription") : t("leaveHint")}
              </p>
            </div>
            <LeaveGroupButton groupId={group.id} />
          </div>

          <div className="flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t("deleteGroup")}</p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {isAdmin ? t("deleteDescription") : t("adminOnlyNote")}
              </p>
            </div>
            {isAdmin ? (
              <DeleteGroupButton groupId={group.id} groupName={group.name} />
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
