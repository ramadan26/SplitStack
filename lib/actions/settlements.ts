"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDecimal, parseAmountToCents } from "@/lib/money";

export type SettlementActionResult =
  | { ok: true; groupId: string }
  | { ok: false; error: string };

export async function recordSettlement(
  input: unknown,
): Promise<SettlementActionResult> {
  const t = await getTranslations("errors");
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: t("notSignedIn") };

  const schema = z.object({
    groupId: z.string().min(1),
    fromUserId: z.string().min(1),
    toUserId: z.string().min(1),
    amount: z.string().trim().min(1, t("invalidAmount")),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { groupId, fromUserId, toUserId, amount } = parsed.data;

  if (fromUserId === toUserId) {
    return { ok: false, error: t("samePerson") };
  }

  const amountCents = parseAmountToCents(amount);
  if (amountCents === null) {
    return { ok: false, error: t("invalidAmount") };
  }

  // Authorization: the requester and both parties must be ACTIVE members.
  const memberships = await db.groupMember.findMany({
    where: {
      groupId,
      status: "ACTIVE",
      userId: { in: [userId, fromUserId, toUserId] },
    },
    select: { userId: true },
  });
  const activeIds = new Set(memberships.map((m) => m.userId));
  if (!activeIds.has(userId)) {
    return { ok: false, error: t("notMember") };
  }
  if (!activeIds.has(fromUserId) || !activeIds.has(toUserId)) {
    return { ok: false, error: t("notMember") };
  }

  await db.$transaction([
    db.settlement.create({
      data: {
        groupId,
        fromUserId,
        toUserId,
        amount: centsToDecimal(amountCents),
      },
    }),
    db.activity.create({
      data: {
        groupId,
        userId,
        type: "SETTLEMENT_RECORDED",
        metadata: { amountCents, fromUserId, toUserId },
      },
    }),
  ]);

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/settle`);
  revalidatePath("/home");
  return { ok: true, groupId };
}
