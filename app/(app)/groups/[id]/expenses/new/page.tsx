import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BackLink } from "@/components/ui/back-link";
import { ExpenseForm } from "@/components/expenses/expense-form";

export const metadata: Metadata = {
  title: "Add expense",
};

export default async function NewExpensePage({
  params,
}: {
  params: { id: string };
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

  const members = await db.groupMember.findMany({
    where: { groupId: params.id, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center gap-2">
        <BackLink href={`/groups/${params.id}`} label={tCommon("back")} />
        <h1 className="text-2xl font-bold tracking-tight">{t("addTitle")}</h1>
      </div>
      <ExpenseForm
        groupId={params.id}
        members={members.map((m) => m.user)}
        currentUserId={userId}
      />
    </div>
  );
}
