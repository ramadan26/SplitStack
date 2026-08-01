import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Check your email",
};

export default async function CheckEmailPage() {
  const t = await getTranslations("auth");

  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl dark:bg-brand-900">
        ✉️
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        {t("checkEmailTitle")}
      </h1>
      <p className="mt-2 text-balance text-sm text-zinc-600 dark:text-zinc-400">
        {t("checkEmailDescription")}
      </p>
    </div>
  );
}
