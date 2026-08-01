/**
 * Shared i18n constants — safe to import from both server and client
 * components (no next/headers or other server-only imports here).
 */
export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isRtl(locale: Locale): boolean {
  return locale === "ar";
}
