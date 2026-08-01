import { db } from "@/lib/db";

const activityInclude = {
  user: { select: { id: true, name: true, email: true, image: true } },
  group: { select: { id: true, name: true, imageUrl: true } },
} as const;

/** Latest activity across every group the user is an ACTIVE member of. */
export async function getActivityForUser(userId: string, take = 50) {
  return db.activity.findMany({
    where: { group: { members: { some: { userId, status: "ACTIVE" } } } },
    include: activityInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

/** Latest activity in one group — null when the user isn't a member. */
export async function getActivityForGroup(
  groupId: string,
  userId: string,
  take = 50,
) {
  const membership = await db.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership || membership.status !== "ACTIVE") return null;

  return db.activity.findMany({
    where: { groupId },
    include: activityInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

/**
 * Settlement activities reference the two parties by id in metadata.
 * Resolve their display names in one query.
 */
export async function getUserNamesByIds(
  activities: { metadata: unknown }[],
): Promise<Map<string, string>> {
  const ids = new Set<string>();
  for (const a of activities) {
    const meta = a.metadata as { fromUserId?: string; toUserId?: string } | null;
    if (meta?.fromUserId) ids.add(meta.fromUserId);
    if (meta?.toUserId) ids.add(meta.toUserId);
  }
  if (ids.size === 0) return new Map();

  const users = await db.user.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, name: true, email: true },
  });
  return new Map(users.map((u) => [u.id, u.name ?? u.email ?? "?"]));
}
