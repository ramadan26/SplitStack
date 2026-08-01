import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  centsToDecimal,
  decimalToCents,
  formatCents,
  parseAmountToCents,
} from "@/lib/money";

describe("decimalToCents", () => {
  it("converts Prisma.Decimal to integer cents", () => {
    expect(decimalToCents(new Prisma.Decimal("45.20"))).toBe(4520);
    expect(decimalToCents(new Prisma.Decimal("0.01"))).toBe(1);
    expect(decimalToCents(new Prisma.Decimal("1800.00"))).toBe(180000);
  });

  it("accepts strings and numbers without float drift", () => {
    expect(decimalToCents("19.99")).toBe(1999);
    expect(decimalToCents(0.07)).toBe(7); // 0.07 * 100 is not exact in floats
  });

  it("round-trips with centsToDecimal", () => {
    for (const cents of [0, 1, 99, 100, 4520, 999999]) {
      expect(decimalToCents(centsToDecimal(cents))).toBe(cents);
    }
  });
});

describe("centsToDecimal", () => {
  it("produces a two-decimal-place Decimal", () => {
    expect(centsToDecimal(4520).toFixed(2)).toBe("45.20");
    expect(centsToDecimal(5).toFixed(2)).toBe("0.05");
    expect(centsToDecimal(0).toFixed(2)).toBe("0.00");
  });
});

describe("formatCents", () => {
  it("formats USD by default", () => {
    expect(formatCents(4520)).toBe("$45.20");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(100000)).toBe("$1,000.00");
  });

  it("honors locale and currency", () => {
    expect(formatCents(4520, "EUR", "de-DE")).toBe("45,20 €");
  });
});

describe("parseAmountToCents", () => {
  it("parses valid amounts", () => {
    expect(parseAmountToCents("45")).toBe(4500);
    expect(parseAmountToCents("45.2")).toBe(4520);
    expect(parseAmountToCents("45.20")).toBe(4520);
    expect(parseAmountToCents(" 12.34 ")).toBe(1234);
    expect(parseAmountToCents("1,234.56")).toBe(123456);
  });

  it("rejects zero and negative by default", () => {
    expect(parseAmountToCents("0")).toBeNull();
    expect(parseAmountToCents("0.00")).toBeNull();
    expect(parseAmountToCents("-5")).toBeNull();
  });

  it("allows zero when asked", () => {
    expect(parseAmountToCents("0", { allowZero: true })).toBe(0);
    expect(parseAmountToCents("0.00", { allowZero: true })).toBe(0);
  });

  it("rejects invalid input", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("45.999")).toBeNull(); // more than 2 decimals
    expect(parseAmountToCents(".5")).toBeNull();
    expect(parseAmountToCents("45.")).toBeNull();
    expect(parseAmountToCents("4 5")).toBeNull();
  });
});
