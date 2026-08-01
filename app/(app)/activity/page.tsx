import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getActivityForUser, getUserNamesByIds } from "@/lib/data/activity";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { RefreshButton } from "@/components/ui/refresh-button";

export const metadata: Metadata = {
  title: "Activity",
};

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const t = await getTranslations("activity");
  const activities = await getActivityForUser(userId);
  const userNames = await getUserNamesByIds(activities);

  return (
    <div className="space-y-5 py-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <RefreshButton />
      </div>
      <ActivityFeed
        activities={activities}
        currentUserId={userId}
        userNames={userNames}
        showGroup
      />
    </div>
  );
}
