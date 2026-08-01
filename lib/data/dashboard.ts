import { startOfMonth, subMonths } from "date-fns";
import { db } from "@/lib/db";
import { computeNetBalances } from "@/lib/balance";
import { decimalToCents } from "@/lib/money";
import type { Category } from "@prisma/client";

export type CategoryTotal = { key: Category; total: number };
export type MonthTotal = { monthKey: string; total: number }; // monthKey: "yyyy-MM"

export type DashboardData = {
  groupCount: number;
  totalSpent: number;
  owedToMe: number;
  iOwe: number;
  byCategory: CategoryTotal[];
  byMonth: MonthTotal[];
};

/**
 * Spending analytics across every group the user is an ACTIVE member of.
 * Returns plain serializable data (integer cents) for client charts.
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const memberships = await db.groupMember.findMany({
    where: { userId, status: "ACTIVE" },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);

  const empty: DashboardData = {
    groupCount: groupIds.length,
    totalSpent: 0,
    owedToMe: 0,
    iOwe: 0,
    byCategory: [],
    byMonth: [],
  };
  if (groupIds.length === 0) return empty;

  const [expenses, settlements, members] = await Promise.all([
    db.expense.findMany({
      where: { groupId: { in: groupIds } },
      select: {
        groupId: true,
        paidById: true,
        amount: true,
        category: true,
        date: true,
        splits: { select: { userId: true, amount: true } },
      },
    }),
    db.settlement.findMany({
      where: { groupId: { in: groupIds } },
      select: { groupId: true, fromUserId: true, toUserId: true, amount: true },
    }),
    db.groupMember.findMany({
      where: { groupId: { in: groupIds }, status: "ACTIVE" },
      select: { groupId: true, userId: true },
    }),
  ]);

  // My net position, summed across groups (per-group balance engine run)
  let owedToMe = 0;
  let iOwe = 0;
  for (const groupId of groupIds) {
    const memberIds = members
      .filter((m) => m.groupId === groupId)
      .map((m) => m.userId);
    const balances = computeNetBalances(
      memberIds,
      expenses.filter((e) => e.groupId === groupId),
      settlements.filter((s) => s.groupId === groupId),
    );
    const balance = balances.get(userId) ?? 0;
    if (balance > 0) owedToMe += balance;
    else iOwe += -balance;
  }

  // Totals and category aggregation
  let totalSpent = 0;
  const categoryTotals = new Map<Category, number>();
  for (const e of expenses) {
    const cents = decimalToCents(e.amount);
    totalSpent += cents;
    categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + cents);
  }

  // Last 6 calendar months, oldest first
  const now = new Date();
  const months: MonthTotal[] = [];
  const monthIndex = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(startOfMonth(now), i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthIndex.set(key, months.length);
    months.push({ monthKey: key, total: 0 });
  }
  for (const e of expenses) {
    const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, "0")}`;
    const idx = monthIndex.get(key);
    if (idx !== undefined) {
      months[idx].total += decimalToCents(e.amount);
    }
  }

  return {
    groupCount: groupIds.length,
    totalSpent,
    owedToMe,
    iOwe,
    byCategory: [...categoryTotals.entries()]
      .map(([key, total]) => ({ key, total }))
      .sort((a, b) => b.total - a.total),
    byMonth: months,
  };
}
