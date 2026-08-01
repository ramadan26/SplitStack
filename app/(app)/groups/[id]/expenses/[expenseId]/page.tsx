import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BackLink } from "@/components/ui/back-link";
import { ExpenseForm } from "@/components/expenses/expense-form";

export const metadata: Metadata = {
  title: "Edit expense",
};

export default async function EditExpensePage({
  params,
}: {
  params: { id: string; expenseId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [t, tCommon] = await Promise.all([
    getTranslations("expense"),
    getTranslations("common"),
  ]);

  const membership = await db.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: params.id } },
  });
  if (!membership || membership.status !== "ACTIVE") notFound();

  const expense = await db.expense.findUnique({
    where: { id: params.expenseId },
    include: { splits: { select: { userId: true, amount: true } } },
  });
  if (!expense || expense.groupId !== params.id) notFound();

  const members = await db.groupMember.findMany({
    where: { groupId: params.id, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center gap-2">
        <BackLink href={`/groups/${params.id}`} label={tCommon("back")} />
        <h1 className="text-2xl font-bold tracking-tight">{t("editTitle")}</h1>
      </div>
      <ExpenseForm
        groupId={params.id}
        members={members.map((m) => m.user)}
        currentUserId={userId}
        initialExpense={{
          id: expense.id,
          description: expense.description,
          amount: expense.amount.toFixed(2),
          date: format(expense.date, "yyyy-MM-dd"),
          category: expense.category,
          splitType: expense.splitType,
          paidById: expense.paidById,
          splits: expense.splits.map((s) => ({
            userId: s.userId,
            amount: s.amount.toFixed(2),
          })),
        }}
      />
    </div>
  );
}
