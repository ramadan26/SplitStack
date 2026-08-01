import { decimalToCents, type Cents, type MoneyLike } from "@/lib/money";

/**
 * Balance engine — pure functions over plain data, fully unit-testable.
 *
 * Sign convention for net balances (in cents):
 *   positive → the user is OWED money by the group
 *   negative → the user OWES money to the group
 */

export interface ExpenseLike {
  paidById: string;
  amount: MoneyLike;
  splits: { userId: string; amount: MoneyLike }[];
}

export interface SettlementLike {
  fromUserId: string;
  toUserId: string;
  amount: MoneyLike;
}

/**
 * Net balance per member from all expense splits and settlements.
 * - paying an expense credits you its full amount
 * - each split debits the share owed
 * - a settlement moves money from `fromUser` (debtor) to `toUser` (creditor)
 */
export function computeNetBalances(
  memberIds: string[],
  expenses: ExpenseLike[],
  settlements: SettlementLike[],
): Map<string, Cents> {
  const balances = new Map<string, Cents>(memberIds.map((id) => [id, 0]));

  const add = (userId: string, delta: Cents) => {
    const current = balances.get(userId);
    if (current !== undefined) balances.set(userId, current + delta);
  };

  for (const expense of expenses) {
    add(expense.paidById, decimalToCents(expense.amount));
    for (const split of expense.splits) {
      add(split.userId, -decimalToCents(split.amount));
    }
  }

  for (const settlement of settlements) {
    add(settlement.fromUserId, decimalToCents(settlement.amount));
    add(settlement.toUserId, -decimalToCents(settlement.amount));
  }

  return balances;
}

export interface Transfer {
  from: string;
  to: string;
  amount: Cents;
}

/**
 * Debt simplification: greedy matching of the largest debtor with the
 * largest creditor. Produces at most (number of non-zero balances − 1)
 * transfers, which settles every account.
 */
export function simplifyDebts(balances: Map<string, Cents>): Transfer[] {
  const debtors = [...balances.entries()]
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, amount: -v as Cents }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = [...balances.entries()]
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, amount: v as Cents }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const payment = Math.min(debtors[i].amount, creditors[j].amount);
    if (payment > 0) {
      transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: payment });
    }
    debtors[i].amount -= payment;
    creditors[j].amount -= payment;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return transfers;
}

/**
 * Deterministic equal split in integer cents: floor-divide, then hand out
 * the remainder cents one at a time starting with the payer, then the rest
 * in the given member order. Shares always sum to the total.
 */
export function computeEqualSplits(
  totalCents: Cents,
  memberIds: string[],
  payerId: string,
): Map<string, Cents> {
  if (memberIds.length === 0) return new Map();
  const base = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents - base * memberIds.length;
  const order = [payerId, ...memberIds.filter((id) => id !== payerId)];
  const result = new Map<string, Cents>();
  order.forEach((id, index) => {
    result.set(id, base + (index < remainder ? 1 : 0));
  });
  return result;
}

/**
 * Percentage split in integer cents: each member gets round(total × pct),
 * except the last member (in iteration order), who takes the remaining
 * cents so shares always sum exactly to the total.
 */
export function computePercentageSplits(
  totalCents: Cents,
  percentages: Map<string, number>,
): Map<string, Cents> {
  const result = new Map<string, Cents>();
  let assigned = 0;
  const entries = [...percentages.entries()];
  entries.forEach(([userId, pct], index) => {
    if (index === entries.length - 1) {
      result.set(userId, totalCents - assigned);
    } else {
      const share = Math.round((totalCents * pct) / 100);
      result.set(userId, share);
      assigned += share;
    }
  });
  return result;
}
