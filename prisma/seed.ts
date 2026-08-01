/**
 * SplitStack demo seed — idempotent (safe to re-run).
 *
 * Creates 3 users, 2 groups, and realistic expenses covering all three
 * split modes (EQUAL incl. a rounding remainder, EXACT, PERCENTAGE),
 * plus one settlement and matching activity rows.
 *
 * All money is handled in integer cents and stored as Prisma.Decimal.
 */
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** cents → Prisma.Decimal without ever touching a float code path */
function dec(cents: number): Prisma.Decimal {
  return new Prisma.Decimal((cents / 100).toFixed(2));
}

/**
 * Deterministic equal split: floor-divide the cents, then hand out the
 * remainder cents one at a time starting with the payer, then the rest in
 * the given member order.
 */
function equalSplit(
  totalCents: number,
  memberIds: string[],
  payerId: string,
): Map<string, number> {
  const base = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents - base * memberIds.length;
  const order = [payerId, ...memberIds.filter((id) => id !== payerId)];
  const result = new Map<string, number>();
  order.forEach((id, i) => {
    result.set(id, base + (i < remainder ? 1 : 0));
  });
  return result;
}

function percentageSplit(
  totalCents: number,
  percentages: Record<string, number>,
): Map<string, number> {
  const result = new Map<string, number>();
  let assigned = 0;
  const entries = Object.entries(percentages);
  entries.forEach(([userId, pct], i) => {
    if (i === entries.length - 1) {
      // last member takes the remainder so shares always sum to the total
      result.set(userId, totalCents - assigned);
    } else {
      const share = Math.round((totalCents * pct) / 100);
      result.set(userId, share);
      assigned += share;
    }
  });
  return result;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function main() {
  // --- Users ---------------------------------------------------------------
  const alex = await prisma.user.upsert({
    where: { email: "alex@demo.com" },
    update: { name: "Alex Carter" },
    create: {
      email: "alex@demo.com",
      name: "Alex Carter",
      image: "https://i.pravatar.cc/150?u=alex@demo.com",
    },
  });
  const sarah = await prisma.user.upsert({
    where: { email: "sarah@demo.com" },
    update: { name: "Sarah Chen" },
    create: {
      email: "sarah@demo.com",
      name: "Sarah Chen",
      image: "https://i.pravatar.cc/150?u=sarah@demo.com",
    },
  });
  const mike = await prisma.user.upsert({
    where: { email: "mike@demo.com" },
    update: { name: "Mike Torres" },
    create: {
      email: "mike@demo.com",
      name: "Mike Torres",
      image: "https://i.pravatar.cc/150?u=mike@demo.com",
    },
  });

  // --- Groups ---------------------------------------------------------------
  const dubai = await prisma.group.upsert({
    where: { id: "seed-group-dubai" },
    update: { name: "Trip to Dubai" },
    create: {
      id: "seed-group-dubai",
      name: "Trip to Dubai",
      description: "Flights, hotel, food and fun — November 2026",
      imageUrl: "🏙️",
      createdById: alex.id,
    },
  });
  const apartment = await prisma.group.upsert({
    where: { id: "seed-group-apartment" },
    update: { name: "Apartment 4B" },
    create: {
      id: "seed-group-apartment",
      name: "Apartment 4B",
      description: "Rent, utilities and shared groceries",
      imageUrl: "🏠",
      createdById: sarah.id,
    },
  });

  // --- Memberships ----------------------------------------------------------
  const memberships = [
    { userId: alex.id, groupId: dubai.id, role: "ADMIN" as const },
    { userId: sarah.id, groupId: dubai.id, role: "MEMBER" as const },
    { userId: mike.id, groupId: dubai.id, role: "MEMBER" as const },
    { userId: alex.id, groupId: apartment.id, role: "MEMBER" as const },
    { userId: sarah.id, groupId: apartment.id, role: "ADMIN" as const },
  ];
  for (const m of memberships) {
    await prisma.groupMember.upsert({
      where: { userId_groupId: { userId: m.userId, groupId: m.groupId } },
      update: { role: m.role, status: "ACTIVE" },
      create: { ...m, status: "ACTIVE" },
    });
  }

  // --- Expenses -------------------------------------------------------------
  const dubaiMembers = [alex.id, sarah.id, mike.id];
  const apartmentMembers = [alex.id, sarah.id];

  type SeedExpense = {
    id: string;
    groupId: string;
    paidById: string;
    amountCents: number;
    description: string;
    category: "FOOD" | "TRANSPORT" | "HOUSING" | "UTILITIES" | "ENTERTAINMENT" | "SHOPPING" | "OTHER";
    splitType: "EQUAL" | "EXACT" | "PERCENTAGE";
    date: Date;
    splits: Map<string, number>;
  };

  const expenses: SeedExpense[] = [
    {
      id: "seed-exp-dinner",
      groupId: dubai.id,
      paidById: alex.id,
      amountCents: 18750,
      description: "Dinner at Pierchic",
      category: "FOOD",
      splitType: "EQUAL",
      date: daysAgo(9),
      splits: equalSplit(18750, dubaiMembers, alex.id),
    },
    {
      id: "seed-exp-safari",
      groupId: dubai.id,
      paidById: sarah.id,
      amountCents: 24000,
      description: "Desert safari",
      category: "ENTERTAINMENT",
      splitType: "EXACT",
      date: daysAgo(7),
      // exact shares must sum to the total: 80 + 90 + 70 = 240
      splits: new Map([
        [alex.id, 8000],
        [sarah.id, 9000],
        [mike.id, 7000],
      ]),
    },
    {
      id: "seed-exp-hotel",
      groupId: dubai.id,
      paidById: mike.id,
      amountCents: 60000,
      description: "Hotel — 3 nights",
      category: "HOUSING",
      splitType: "PERCENTAGE",
      date: daysAgo(8),
      splits: percentageSplit(60000, {
        [alex.id]: 50,
        [sarah.id]: 30,
        [mike.id]: 20,
      }),
    },
    {
      id: "seed-exp-taxi",
      groupId: dubai.id,
      paidById: alex.id,
      amountCents: 4520,
      description: "Taxi to the airport",
      category: "TRANSPORT",
      splitType: "EQUAL",
      date: daysAgo(1),
      // 4520 / 3 leaves a 2-cent remainder → payer first, then member order
      splits: equalSplit(4520, dubaiMembers, alex.id),
    },
    {
      id: "seed-exp-brunch",
      groupId: dubai.id,
      paidById: sarah.id,
      amountCents: 9865,
      description: "Friday brunch",
      category: "FOOD",
      splitType: "EQUAL",
      date: daysAgo(3),
      splits: equalSplit(9865, dubaiMembers, sarah.id),
    },
    {
      id: "seed-exp-rent",
      groupId: apartment.id,
      paidById: sarah.id,
      amountCents: 180000,
      description: "Rent — November",
      category: "HOUSING",
      splitType: "EQUAL",
      date: daysAgo(5),
      splits: equalSplit(180000, apartmentMembers, sarah.id),
    },
    {
      id: "seed-exp-internet",
      groupId: apartment.id,
      paidById: alex.id,
      amountCents: 5999,
      description: "Internet bill",
      category: "UTILITIES",
      splitType: "EQUAL",
      date: daysAgo(2),
      splits: equalSplit(5999, apartmentMembers, alex.id),
    },
    {
      id: "seed-exp-groceries",
      groupId: apartment.id,
      paidById: sarah.id,
      amountCents: 8430,
      description: "Groceries at Trader Joe's",
      category: "SHOPPING",
      splitType: "EXACT",
      date: daysAgo(1),
      splits: new Map([
        [alex.id, 4530],
        [sarah.id, 3900],
      ]),
    },
  ];

  for (const e of expenses) {
    await prisma.expense.upsert({
      where: { id: e.id },
      update: {
        description: e.description,
        amount: dec(e.amountCents),
        category: e.category,
        splitType: e.splitType,
        date: e.date,
        paidById: e.paidById,
        groupId: e.groupId,
      },
      create: {
        id: e.id,
        description: e.description,
        amount: dec(e.amountCents),
        category: e.category,
        splitType: e.splitType,
        date: e.date,
        paidById: e.paidById,
        groupId: e.groupId,
      },
    });
    // recreate splits so re-seeding always reflects the definitions above
    await prisma.expenseSplit.deleteMany({ where: { expenseId: e.id } });
    await prisma.expenseSplit.createMany({
      data: [...e.splits.entries()].map(([userId, cents]) => ({
        expenseId: e.id,
        userId,
        amount: dec(cents),
      })),
    });
  }

  // --- Settlement -----------------------------------------------------------
  const settlement = await prisma.settlement.upsert({
    where: { id: "seed-settlement-sarah-alex" },
    update: {
      amount: dec(5000),
      date: daysAgo(2),
    },
    create: {
      id: "seed-settlement-sarah-alex",
      groupId: dubai.id,
      fromUserId: sarah.id,
      toUserId: alex.id,
      amount: dec(5000),
      date: daysAgo(2),
    },
  });

  // --- Activity -------------------------------------------------------------
  await prisma.activity.deleteMany({ where: { id: { startsWith: "seed-act-" } } });
  await prisma.activity.createMany({
    data: [
      {
        id: "seed-act-group-dubai",
        groupId: dubai.id,
        userId: alex.id,
        type: "GROUP_CREATED",
        metadata: { groupName: dubai.name },
        createdAt: daysAgo(10),
      },
      {
        id: "seed-act-group-apartment",
        groupId: apartment.id,
        userId: sarah.id,
        type: "GROUP_CREATED",
        metadata: { groupName: apartment.name },
        createdAt: daysAgo(6),
      },
      ...expenses.map((e, i) => ({
        id: `seed-act-expense-${i}`,
        groupId: e.groupId,
        userId: e.paidById,
        type: "EXPENSE_ADDED" as const,
        expenseId: e.id,
        metadata: {
          description: e.description,
          amountCents: e.amountCents,
        },
        createdAt: e.date,
      })),
      {
        id: "seed-act-settlement",
        groupId: dubai.id,
        userId: sarah.id,
        type: "SETTLEMENT_RECORDED",
        settlementId: settlement.id,
        metadata: { amountCents: 5000, toUserId: alex.id },
        createdAt: daysAgo(2),
      },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    groups: await prisma.group.count(),
    expenses: await prisma.expense.count(),
    splits: await prisma.expenseSplit.count(),
    settlements: await prisma.settlement.count(),
    activities: await prisma.activity.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
