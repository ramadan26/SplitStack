import { db } from "@/lib/db";

const userSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

/**
 * All groups the user is an ACTIVE member of, with everything needed to
 * render the groups list (members, expense splits, settlements).
 * Pending memberships the user was invited to are hidden until claimed.
 */
export async function getGroupsForUser(userId: string) {
  const memberships = await db.groupMember.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      group: {
        include: {
          members: {
            include: { user: { select: userSelect } },
            orderBy: { joinedAt: "asc" },
          },
          expenses: {
            select: {
              amount: true,
              paidById: true,
              splits: { select: { userId: true, amount: true } },
            },
          },
          settlements: {
            select: { fromUserId: true, toUserId: true, amount: true },
          },
        },
      },
    },
    orderBy: { group: { updatedAt: "desc" } },
  });
  return memberships.map((m) => m.group);
}

/**
 * Full group detail for the dashboard — returns null when the user is not
 * a member (authorization at the data layer, not just the UI).
 */
export async function getGroupForUser(groupId: string, userId: string) {
  const membership = await db.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership) return null;

  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: userSelect } },
        orderBy: { joinedAt: "asc" },
      },
      expenses: {
        include: {
          paidBy: { select: userSelect },
          splits: { select: { userId: true, amount: true } },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
      settlements: {
        select: { fromUserId: true, toUserId: true, amount: true },
      },
    },
  });
  if (!group) return null;

  return { group, membership };
}
