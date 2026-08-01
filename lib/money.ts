import { Prisma } from "@prisma/client";

/**
 * Money utilities. All money inside the app is handled as integer cents;
 * Prisma.Decimal is only the storage/transport format, and formatting
 * happens exclusively at display time. Never use floats for money math.
 */
export type Cents = number;

export type MoneyLike = Prisma.Decimal | string | number;

/** Decimal (or decimal-like) → integer cents. */
export function decimalToCents(value: MoneyLike): Cents {
  const decimal =
    value instanceof Prisma.Decimal
      ? value
      : new Prisma.Decimal(String(value));
  // amounts are stored with 2 decimal places, so ×100 is an exact integer
  return decimal.mul(100).toNumber();
}

/** Integer cents → Prisma.Decimal with 2 decimal places, ready to store. */
export function centsToDecimal(cents: Cents): Prisma.Decimal {
  return new Prisma.Decimal(cents).div(100).toDecimalPlaces(2);
}

/** Format integer cents for display. USD by default. */
export function formatCents(
  cents: Cents,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * Parse a user-entered amount ("45", "45.2", "45.20") into integer cents.
 * Returns null for anything invalid; rejects zero/negative by default.
 */
export function parseAmountToCents(
  input: string,
  { allowZero = false }: { allowZero?: boolean } = {},
): Cents | null {
  const trimmed = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const cents = Math.round(parseFloat(trimmed) * 100);
  if (!Number.isSafeInteger(cents)) return null;
  if (cents < 0 || (cents === 0 && !allowZero)) return null;
  return cents;
}
