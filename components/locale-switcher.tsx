"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/lib/actions/locale";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("locale");
  const [isPending, startTransition] = useTransition();

  const next = locale === "ar" ? "en" : "ar";

  function onSwitch() {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onSwitch}
      disabled={isPending}
      aria-label={t("switchTo", { locale: t(next) })}
      title={t("switchTo", { locale: t(next) })}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:text-zinc-400 dark:hover:bg-zinc-800",
        className,
      )}
    >
      {isPending ? <Spinner /> : t(next === "ar" ? "shortAr" : "shortEn")}
    </button>
  );
}
