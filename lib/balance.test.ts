import { describe, expect, it } from "vitest";
import {
  computeEqualSplits,
  computeNetBalances,
  computePercentageSplits,
  simplifyDebts,
  type ExpenseLike,
  type SettlementLike,
} from "@/lib/balance";

const A = "user-a";
const B = "user-b";
const C = "user-c";
const MEMBERS = [A, B, C];

function expense(
  paidById: string,
  amount: string,
  splits: [string, string][],
): ExpenseLike {
  return {
    paidById,
    amount,
    splits: splits.map(([userId, amt]) => ({ userId, amount: amt })),
  };
}

function settlement(from: string, to: string, amount: string): SettlementLike {
  return { fromUserId: from, toUserId: to, amount };
}

describe("computeEqualSplits", () => {
  it("divides evenly when there is no remainder", () => {
    const splits = computeEqualSplits(9000, MEMBERS, A);
    expect(splits.get(A)).toBe(3000);
    expect(splits.get(B)).toBe(3000);
    expect(splits.get(C)).toBe(3000);
  });

  it("gives remainder cents to the payer first, deterministically", () => {
    // 4520 / 3 = 1506 remainder 2 → payer +1, next member +1
    const splits = computeEqualSplits(4520, MEMBERS, A);
    expect(splits.get(A)).toBe(1507);
    expect(splits.get(B)).toBe(1507);
    expect(splits.get(C)).toBe(1506);
  });

  it("gives the remainder to the payer even when they are not first in the list", () => {
    const splits = computeEqualSplits(101, [A, B], B); // 1-cent remainder
    expect(splits.get(B)).toBe(51);
    expect(splits.get(A)).toBe(50);
  });

  it("always sums exactly to the total", () => {
    for (const total of [1, 2, 3, 99, 100, 101, 9865, 123457]) {
      const splits = computeEqualSplits(total, MEMBERS, A);
      const sum = [...splits.values()].reduce((a, b) => a + b, 0);
      expect(sum).toBe(total);
    }
  });

  it("handles a single participant", () => {
    const splits = computeEqualSplits(4520, [A], A);
    expect(splits.get(A)).toBe(4520);
  });

  it("handles an empty member list", () => {
    expect(computeEqualSplits(1000, [], A).size).toBe(0);
  });
});

describe("computePercentageSplits", () => {
  it("splits by percentage and sums exactly to the total", () => {
    const splits = computePercentageSplits(
      60000,
      new Map([
        [A, 50],
        [B, 30],
        [C, 20],
      ]),
    );
    expect(splits.get(A)).toBe(30000);
    expect(splits.get(B)).toBe(18000);
    expect(splits.get(C)).toBe(12000);
  });

  it("gives rounding leftovers to the last member", () => {
    // 10001 * 33.33% ≈ 3333.63 each for two members, last takes the rest
    const splits = computePercentageSplits(
      10001,
      new Map([
        [A, 33.33],
        [B, 33.33],
        [C, 33.34],
      ]),
    );
    const sum = [...splits.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBe(10001);
  });
});

describe("computeNetBalances", () => {
  it("credits the payer and debits split shares", () => {
    // A pays 90, split 30/30/30 → A +60, B -30, C -30
    const balances = computeNetBalances(
      MEMBERS,
      [expense(A, "90.00", [[A, "30.00"], [B, "30.00"], [C, "30.00"]])],
      [],
    );
    expect(balances.get(A)).toBe(6000);
    expect(balances.get(B)).toBe(-3000);
    expect(balances.get(C)).toBe(-3000);
  });

  it("handles the payer not being part of the split", () => {
    // A pays 60 for B and C only → A +60, B -30, C -30
    const balances = computeNetBalances(
      MEMBERS,
      [expense(A, "60.00", [[B, "30.00"], [C, "30.00"]])],
      [],
    );
    expect(balances.get(A)).toBe(6000);
    expect(balances.get(B)).toBe(-3000);
    expect(balances.get(C)).toBe(-3000);
  });

  it("accumulates across multiple expenses", () => {
    const balances = computeNetBalances(
      MEMBERS,
      [
        expense(A, "90.00", [[A, "30.00"], [B, "30.00"], [C, "30.00"]]),
        expense(B, "30.00", [[A, "15.00"], [B, "15.00"]]),
      ],
      [],
    );
    // A: +90 -30 -15 = +45; B: -30 +30 -15 = -15; C: -30
    expect(balances.get(A)).toBe(4500);
    expect(balances.get(B)).toBe(-1500);
    expect(balances.get(C)).toBe(-3000);
  });

  it("applies settlements as debt repayment", () => {
    const balances = computeNetBalances(
      MEMBERS,
      [expense(A, "90.00", [[A, "30.00"], [B, "30.00"], [C, "30.00"]])],
      [settlement(B, A, "30.00")],
    );
    // B repaid in full → B 0, A +30, C -30
    expect(balances.get(A)).toBe(3000);
    expect(balances.get(B)).toBe(0);
    expect(balances.get(C)).toBe(-3000);
  });

  it("nets to zero overall", () => {
    const balances = computeNetBalances(
      MEMBERS,
      [
        expense(A, "90.00", [[A, "30.00"], [B, "30.00"], [C, "30.00"]]),
        expense(B, "45.20", [[A, "15.08"], [B, "15.06"], [C, "15.06"]]),
      ],
      [settlement(C, A, "12.00")],
    );
    const sum = [...balances.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });

  it("ignores users who are not group members", () => {
    const balances = computeNetBalances(
      [A, B],
      [expense(A, "60.00", [[A, "30.00"], [C, "30.00"]])], // C not a member
      [],
    );
    // A is credited the full 60 but still debited their own 30 share;
    // C's share is dropped entirely
    expect(balances.get(A)).toBe(3000);
    expect(balances.get(B)).toBe(0);
    expect(balances.has(C)).toBe(false);
  });
});

describe("simplifyDebts", () => {
  it("produces a single transfer for a simple two-way debt", () => {
    const transfers = simplifyDebts(
      new Map([
        [A, 5000],
        [B, -5000],
      ]),
    );
    expect(transfers).toEqual([{ from: B, to: A, amount: 5000 }]);
  });

  it("collapses a 3-way chain into a direct transfer", () => {
    // A owes B 30, B owes C 30 → A pays C 30 directly
    const transfers = simplifyDebts(
      new Map([
        [A, -3000],
        [B, 0],
        [C, 3000],
      ]),
    );
    expect(transfers).toEqual([{ from: A, to: C, amount: 3000 }]);
  });

  it("resolves circular debts to nothing", () => {
    // A owes B, B owes C, C owes A — all net to zero
    const balances = computeNetBalances(
      MEMBERS,
      [
        expense(A, "30.00", [[B, "30.00"]]),
        expense(B, "30.00", [[C, "30.00"]]),
        expense(C, "30.00", [[A, "30.00"]]),
      ],
      [],
    );
    expect([...balances.values()].every((v) => v === 0)).toBe(true);
    expect(simplifyDebts(balances)).toEqual([]);
  });

  it("returns no transfers when everyone is settled", () => {
    expect(
      simplifyDebts(
        new Map([
          [A, 0],
          [B, 0],
          [C, 0],
        ]),
      ),
    ).toEqual([]);
  });

  it("matches the largest debtor with the largest creditor first", () => {
    // creditors: A +90, B +10; debtors: C -60, D -40 → C→A 60, D→A 30, D→B 10
    const D = "user-d";
    const transfers = simplifyDebts(
      new Map([
        [A, 9000],
        [B, 1000],
        [C, -6000],
        [D, -4000],
      ]),
    );
    expect(transfers).toEqual([
      { from: C, to: A, amount: 6000 },
      { from: D, to: A, amount: 3000 },
      { from: D, to: B, amount: 1000 },
    ]);
  });

  it("never exceeds n-1 transfers and settles every account", () => {
    const balances = new Map([
      [A, 4520],
      [B, -1508],
      [C, -1506],
      ["user-d", -1506],
    ]);
    const transfers = simplifyDebts(balances);
    expect(transfers.length).toBeLessThanOrEqual(3);

    // apply the transfers: every balance must become zero
    const result = new Map(balances);
    for (const t of transfers) {
      result.set(t.from, result.get(t.from)! + t.amount);
      result.set(t.to, result.get(t.to)! - t.amount);
    }
    expect([...result.values()].every((v) => v === 0)).toBe(true);
  });

  it("end-to-end: seeded-style group settles cleanly", () => {
    // A paid 187.50 (3-way equal), B paid 45.20 (3-way equal, remainder)
    const balances = computeNetBalances(
      MEMBERS,
      [
        expense(A, "187.50", [[A, "62.50"], [B, "62.50"], [C, "62.50"]]),
        expense(B, "45.20", [[A, "15.08"], [B, "15.06"], [C, "15.06"]]),
      ],
      [settlement(C, A, "50.00")],
    );
    const transfers = simplifyDebts(balances);
    const result = new Map(balances);
    for (const t of transfers) {
      result.set(t.from, result.get(t.from)! + t.amount);
      result.set(t.to, result.get(t.to)! - t.amount);
    }
    expect([...result.values()].every((v) => v === 0)).toBe(true);
    expect(transfers.length).toBeLessThanOrEqual(2);
  });
});
