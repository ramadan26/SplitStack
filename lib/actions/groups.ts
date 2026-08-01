"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeNetBalances } from "@/lib/balance";
import { sendEmail } from "@/lib/email";

export type GroupActionResult =
  | { ok: true; groupId?: string }
  | { ok: false; error: string };

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Membership lookup used as the authorization check in every mutation. */
async function getMembership(userId: string, groupId: string) {
  return db.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
}

// --- Create group -----------------------------------------------------------

export async function createGroup(input: unknown): Promise<GroupActionResult> {
  const t = await getTranslations("errors");
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: t("notSignedIn") };

  const schema = z.object({
    name: z.string().trim().min(1, t("groupNameRequired")).max(60, t("nameTooLong")),
    description: z.string().trim().max(200).optional(),
    emoji: z.string().trim().max(8).optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { name, description, emoji } = parsed.data;

  const group = await db.group.create({
    data: {
      name,
      description: description || null,
      imageUrl: emoji || null,
      createdById: userId,
      members: {
        create: { userId, role: "ADMIN", status: "ACTIVE" },
      },
      activities: {
        create: {
          userId,
          type: "GROUP_CREATED",
          metadata: { groupName: name },
        },
      },
    },
  });

  revalidatePath("/home");
  return { ok: true, groupId: group.id };
}

// --- Invite member ----------------------------------------------------------

export async function inviteMember(input: unknown): Promise<GroupActionResult> {
  const t = await getTranslations("errors");
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: t("notSignedIn") };

  const schema = z.object({
    groupId: z.string().min(1),
    email: z.string().trim().toLowerCase().email(t("invalidEmail")),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { groupId, email } = parsed.data;

  const membership = await getMembership(userId, groupId);
  if (!membership || membership.status !== "ACTIVE") {
    return { ok: false, error: t("notMember") };
  }

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { name: true },
  });
  if (!group) return { ok: false, error: t("groupNotFound") };

  // Find or create the invited user. Unknown emails get a placeholder row;
  // Auth.js links it to their real account on first sign-in, and the
  // signIn event flips the membership from PENDING to ACTIVE.
  const invited = await db.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  if (invited.id === userId) {
    return { ok: false, error: t("alreadyInGroup") };
  }

  const existing = await getMembership(invited.id, groupId);
  if (existing) {
    return {
      ok: false,
      error: t(existing.status === "PENDING" ? "alreadyPending" : "alreadyMember"),
    };
  }

  const hasAccount = invited.name !== null || invited.emailVerified !== null;

  await db.$transaction([
    db.groupMember.create({
      data: {
        userId: invited.id,
        groupId,
        role: "MEMBER",
        status: hasAccount ? "ACTIVE" : "PENDING",
      },
    }),
    db.activity.create({
      data: {
        groupId,
        userId,
        type: "MEMBER_ADDED",
        metadata: { invitedEmail: email },
      },
    }),
  ]);

  // Best-effort invitation email — the invite itself already succeeded, so
  // a mail failure must not fail the action.
  try {
    const inviter = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const inviterName = inviter?.name ?? inviter?.email ?? "Someone";
    const origin =
      headers().get("origin") ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    await sendEmail({
      to: email,
      subject: `${inviterName} invited you to "${group.name}" on SplitStack`,
      text: [
        "Hi,",
        "",
        `${inviterName} invited you to join the group "${group.name}" on SplitStack.`,
        "",
        "Sign in with this email address and you'll join the group automatically:",
        `${origin}/login`,
        "",
        "— SplitStack",
      ].join("\n"),
    });
  } catch (error) {
    console.error("Failed to send invitation email:", error);
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/settings`);
  return { ok: true };
}

// --- Rename group -----------------------------------------------------------

export async function renameGroup(input: unknown): Promise<GroupActionResult> {
  const t = await getTranslations("errors");
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: t("notSignedIn") };

  const schema = z.object({
    groupId: z.string().min(1),
    name: z.string().trim().min(1, t("groupNameRequired")).max(60, t("nameTooLong")),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { groupId, name } = parsed.data;

  const membership = await getMembership(userId, groupId);
  if (!membership || membership.status !== "ACTIVE") {
    return { ok: false, error: t("notMember") };
  }

  await db.group.update({ where: { id: groupId }, data: { name } });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/settings`);
  revalidatePath("/home");
  return { ok: true };
}

// --- Leave group ------------------------------------------------------------

export async function leaveGroup(groupId: string): Promise<GroupActionResult> {
  const t = await getTranslations("errors");
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: t("notSignedIn") };

  const membership = await getMembership(userId, groupId);
  if (!membership) return { ok: false, error: t("notMember") };

  // You can only leave when your net balance is settled.
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: { select: { userId: true, role: true } },
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
  });
  if (!group) return { ok: false, error: t("groupNotFound") };

  const balances = computeNetBalances(
    group.members.map((m) => m.userId),
    group.expenses,
    group.settlements,
  );
  if ((balances.get(userId) ?? 0) !== 0) {
    return { ok: false, error: t("settleFirst") };
  }

  // Don't let the last admin strand the group.
  const otherAdmins = group.members.filter(
    (m) => m.userId !== userId && m.role === "ADMIN",
  );
  if (membership.role === "ADMIN" && group.members.length > 1 && otherAdmins.length === 0) {
    return { ok: false, error: t("lastAdmin") };
  }

  await db.groupMember.delete({
    where: { userId_groupId: { userId, groupId } },
  });

  revalidatePath("/home");
  return { ok: true };
}

// --- Delete group (admin only) ----------------------------------------------

export async function deleteGroup(groupId: string): Promise<GroupActionResult> {
  const t = await getTranslations("errors");
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: t("notSignedIn") };

  const membership = await getMembership(userId, groupId);
  if (!membership || membership.role !== "ADMIN") {
    return { ok: false, error: t("adminOnly") };
  }

  // Expenses, splits, settlements, memberships and activities cascade.
  await db.group.delete({ where: { id: groupId } });

  revalidatePath("/home");
  return { ok: true };
}
