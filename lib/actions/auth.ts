"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { signIn, signOut } from "@/lib/auth";

export type AuthActionResult = { ok: true } | { ok: false; error: string };

function sanitizeCallbackUrl(url: FormDataEntryValue | null): string {
  // only allow same-origin paths to prevent open redirects
  return typeof url === "string" && url.startsWith("/") ? url : "/home";
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  await signIn("google", {
    redirectTo: sanitizeCallbackUrl(formData.get("callbackUrl")),
  });
}

export async function signInWithEmail(
  formData: FormData,
): Promise<AuthActionResult> {
  const t = await getTranslations("errors");
  const parsed = z
    .string()
    .trim()
    .email(t("invalidEmail"))
    .safeParse(formData.get("email"));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  try {
    // Email providers redirect to the "check your email" page; the
    // redirectTo is used after the magic link is clicked.
    await signIn("nodemailer", {
      email: parsed.data,
      redirectTo: sanitizeCallbackUrl(formData.get("callbackUrl")),
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: t("sendFailed") };
    }
    // NEXT_REDIRECT is thrown on success — rethrow so Next can handle it
    throw error;
  }
}

export async function signInWithPassword(
  formData: FormData,
): Promise<AuthActionResult> {
  const t = await getTranslations("errors");
  const schema = z.object({
    email: z.string().trim().toLowerCase().email(t("invalidEmail")),
    password: z.string().min(1, t("enterPassword")),
  });
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: sanitizeCallbackUrl(formData.get("callbackUrl")),
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: t("invalidCredentials") };
    }
    // NEXT_REDIRECT is thrown on success — rethrow so Next can handle it
    throw error;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
