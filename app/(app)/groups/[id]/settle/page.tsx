import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getGroupForUser } from "@/lib/data/groups";
import { computeNetBalances, simplifyDebts } from "@/lib/balance";
import { BackLink } from "@/components/ui/back-link";
import { SettleUpFlow } from "@/components/settlements/settle-up-flow";

export const metadata: Metadata = {
  title: "Settle up",
};

export default async function SettleUpPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [t, tCommon] = await Promise.all([
    getTranslations("settle"),
    getTranslations("common"),
  ]);

  const result = await getGroupForUser(params.id, userId);
  if (!result) notFound();
  const { group } = result;

  const activeMembers = group.members.filter((m) => m.status === "ACTIVE");
  const balances = computeNetBalances(
    activeMembers.map((m) => m.userId),
    group.expenses,
    group.settlements,
  );
  const suggestions = simplifyDebts(balances);

  return (
    <div className="mx-auto max-w-lg space-y-6 py-2">
      <div className="flex items-center gap-2">
        <BackLink href={`/groups/${group.id}`} label={tCommon("back")} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {group.name}
          </p>
        </div>
      </div>

      <SettleUpFlow
        groupId={group.id}
        currentUserId={userId}
        members={activeMembers.map((m) => m.user)}
        suggestions={suggestions}
      />
    </div>
  );
}
