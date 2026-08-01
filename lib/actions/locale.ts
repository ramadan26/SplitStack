"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, locales, type Locale } from "@/i18n/config";

export async function setLocale(locale: Locale): Promise<void> {
  if (!locales.includes(locale)) return;
  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
