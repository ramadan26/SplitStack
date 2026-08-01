"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type ProfileActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateDisplayName(
  input: unknown,
): Promise<ProfileActionResult> {
  const t = await getTranslations("errors");
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: t("notSignedIn") };

  const schema = z.object({
    name: z.string().trim().min(1, t("nameEmpty")).max(50, t("nameTooLong")),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });

  revalidatePath("/profile");
  revalidatePath("/home");
  return { ok: true };
}
