import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGroupForUser } from "@/lib/data/groups";
import { getActivityForGroup, getUserNamesByIds } from "@/lib/data/activity";
import { computeNetBalances } from "@/lib/balance";
import { decimalToCents } from "@/lib/money";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { GroupTabs } from "@/components/groups/group-tabs";
import { GroupHeader } from "@/components/groups/group-header";

export const metadata: Metadata = {
  title: "Group activity",
};

export default async function GroupActivityPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const result = await getGroupForUser(params.id, userId);
  if (!result) notFound();
  const { group } = result;

  const activities = await getActivityForGroup(params.id, userId);
  if (!activities) notFound();

  const activeMembers = group.members.filter((m) => m.status === "ACTIVE");
  const balances = computeNetBalances(
    activeMembers.map((m) => m.userId),
    group.expenses,
    group.settlements,
  );
  const totalSpent = group.expenses.reduce(
    (sum, e) => sum + decimalToCents(e.amount),
    0,
  );

  const userNames = await getUserNamesByIds(activities);

  return (
    <div className="space-y-5">
      <GroupHeader
        group={group}
        memberCount={activeMembers.length}
        totalSpentCents={totalSpent}
        myBalanceCents={balances.get(userId) ?? 0}
      />
      <GroupTabs groupId={params.id} />
      <ActivityFeed
        activities={activities}
        currentUserId={userId}
        userNames={userNames}
        showGroup={false}
      />
    </div>
  );
}
