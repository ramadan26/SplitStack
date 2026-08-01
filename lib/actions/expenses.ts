"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeEqualSplits, computePercentageSplits } from "@/lib/balance";
import {
  centsToDecimal,
  parseAmountToCents,
  type Cents,
} from "@/lib/money";

export type ExpenseActionResult =
  | { ok: true; groupId: string }
  | { ok: false; error: string };

const CATEGORIES = [
  "FOOD",
  "TRANSPORT",
  "HOUSING",
  "UTILITIES",
  "ENTERTAINMENT",
  "SHOPPING",
  "OTHER",
] as const;

type Translator = Awaited<ReturnType<typeof getTranslations>>;

function buildSchema(t: Translator) {
  return z.object({
    groupId: z.string().min(1),
    description: z
      .string()
      .trim()
      .min(1, t("descriptionRequired"))
      .max(120, t("descriptionTooLong")),
    amount: z.string().trim().min(1, t("invalidAmount")),
    date: z.string().min(1, t("invalidDate")),
    category: z.enum(CATEGORIES),
    paidById: z.string().min(1),
    splitType: z.enum(["EQUAL", "EXACT", "PERCENTAGE"]),
    memberIds: z.array(z.string()).min(1, t("selectMembers")),
    exactAmounts: z.record(z.string(), z.string()).optional(),
    percentages: z.record(z.string(), z.coerce.number()).optional(),
  });
}

type ExpenseInput = z.infer<ReturnType<typeof buildSchema>>;

type BuildSuccess = {
  data: ExpenseInput;
  date: Date;
  totalCents: Cents;
  splits: Map<string, Cents>;
};

/**
 * Shared validation for create/update. Verifies the requester's membership,
 * that the payer and all participants are ACTIVE members of the group, and
 * builds the split map in integer cents according to the split mode.
 */
async function validateAndBuildSplits(
  input: unknown,
  userId: string,
  t: Translator,
): Promise<{ error: string } | BuildSuccess> {
  const parsed = buildSchema(t).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const totalCents = parseAmountToCents(data.amount);
  if (totalCents === null) return { error: t("invalidAmount") };

  const date = new Date(data.date);
  if (Number.isNaN(date.getTime())) return { error: t("invalidDate") };

  const membership = await db.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: data.groupId } },
  });
  if (!membership || membership.status !== "ACTIVE") {
    return { error: t("notMember") };
  }

  const activeMembers = await db.groupMember.findMany({
    where: { groupId: data.groupId, status: "ACTIVE" },
    select: { userId: true },
  });
  const activeIds = new Set(activeMembers.map((m) => m.userId));

  if (!activeIds.has(data.paidById)) return { error: t("notMember") };
  if (data.memberIds.some((id) => !activeIds.has(id))) {
    return { error: t("notMember") };
  }

  let splits: Map<string, Cents>;
  switch (data.splitType) {
    case "EQUAL": {
      splits = computeEqualSplits(totalCents, data.memberIds, data.paidById);
      break;
    }
    case "EXACT": {
      splits = new Map<string, Cents>();
      let sum = 0;
      for (const memberId of data.memberIds) {
        const raw = data.exactAmounts?.[memberId];
        const share =
          raw !== undefined ? parseAmountToCents(raw, { allowZero: true }) : null;
        if (share === null) return { error: t("invalidAmount") };
        splits.set(memberId, share);
        sum += share;
      }
      if (sum !== totalCents) {
        return { error: t("exactSumMismatch") };
      }
      break;
    }
    case "PERCENTAGE": {
      const pcts = new Map<string, number>();
      let sum = 0;
      for (const memberId of data.memberIds) {
        const pct = data.percentages?.[memberId];
        if (pct === undefined || !Number.isFinite(pct) || pct < 0 || pct > 100) {
          return { error: t("percentSumMismatch") };
        }
        pcts.set(memberId, pct);
        sum += pct;
      }
      if (Math.abs(sum - 100) > 0.01) {
        return { error: t("percentSumMismatch") };
      }
      splits = computePercentageSplits(totalCents, pcts);
      break;
    }
  }

  return { data, date, totalCents, splits };
}

// --- Create -----------------------------------------------------------------

export async function createExpense(
  input: unknown,
): Promise<ExpenseActionResult> {
  const t = await getTranslations("errors");
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: t("notSignedIn") };

  const result = await validateAndBuildSplits(input, userId, t);
  if ("error" in result) return { ok: false, error: result.error };
  const { data, date, totalCents, splits } = result;

  const expense = await db.expense.create({
    data: {
      groupId: data.groupId,
      paidById: data.paidById,
      amount: centsToDecimal(totalCents),
      description: data.description,
      category: data.category,
      splitType: data.splitType,
      date,
      splits: {
        create: [...splits.entries()].map(([splitUserId, cents]) => ({
          userId: splitUserId,
          amount: centsToDecimal(cents),
        })),
      },
    },
  });

  await db.activity.create({
    data: {
      groupId: data.groupId,
      userId,
      type: "EXPENSE_ADDED",
      expenseId: expense.id,
      metadata: { description: data.description, amountCents: totalCents },
    },
  });

  revalidatePath(`/groups/${data.groupId}`);
  revalidatePath("/home");
  return { ok: true, groupId: data.groupId };
}

// --- Update -----------------------------------------------------------------

export async function updateExpense(
  expenseId: string,
  input: unknown,
): Promise<ExpenseActionResult> {
  const t = await getTranslations("errors");
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: t("notSignedIn") };

  const result = await validateAndBuildSplits(input, userId, t);
  if ("error" in result) return { ok: false, error: result.error };
  const { data, date, totalCents, splits } = result;

  const existing = await db.expense.findUnique({ where: { id: expenseId } });
  if (!existing || existing.groupId !== data.groupId) {
    return { ok: false, error: t("expenseNotFound") };
  }

  await db.$transaction([
    db.expenseSplit.deleteMany({ where: { expenseId } }),
    db.expense.update({
      where: { id: expenseId },
      data: {
        paidById: data.paidById,
        amount: centsToDecimal(totalCents),
        description: data.description,
        category: data.category,
        splitType: data.splitType,
        date,
        splits: {
          create: [...splits.entries()].map(([splitUserId, cents]) => ({
            userId: splitUserId,
            amount: centsToDecimal(cents),
          })),
        },
      },
    }),
    db.activity.create({
      data: {
        groupId: data.groupId,
        userId,
        type: "EXPENSE_UPDATED",
        expenseId,
        metadata: { description: data.description, amountCents: totalCents },
      },
    }),
  ]);

  revalidatePath(`/groups/${data.groupId}`);
  revalidatePath("/home");
  return { ok: true, groupId: data.groupId };
}

// --- Delete -----------------------------------------------------------------

export async function deleteExpense(
  expenseId: string,
): Promise<ExpenseActionResult> {
  const t = await getTranslations("errors");
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: t("notSignedIn") };

  const expense = await db.expense.findUnique({
    where: { id: expenseId },
    select: { id: true, groupId: true, description: true, amount: true },
  });
  if (!expense) return { ok: false, error: t("expenseNotFound") };

  const membership = await db.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: expense.groupId } },
  });
  if (!membership || membership.status !== "ACTIVE") {
    return { ok: false, error: t("notMember") };
  }

  await db.$transaction([
    db.activity.create({
      data: {
        groupId: expense.groupId,
        userId,
        type: "EXPENSE_DELETED",
        metadata: {
          description: expense.description,
          amountCents: expense.amount.mul(100).toNumber(),
        },
      },
    }),
    // splits cascade
    db.expense.delete({ where: { id: expenseId } }),
  ]);

  revalidatePath(`/groups/${expense.groupId}`);
  revalidatePath("/home");
  return { ok: true, groupId: expense.groupId };
}
