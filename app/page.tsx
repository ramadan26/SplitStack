import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { buttonClasses } from "@/components/ui/button";

export default async function LandingPage() {
  const t = await getTranslations("landing");

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 pb-safe pt-safe text-center">
      <div className="absolute end-4 top-4 flex items-center gap-1">
        <ThemeToggle />
        <LocaleSwitcher />
      </div>

      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-3xl font-bold text-white shadow-lg shadow-brand-500/30">
        S
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
        SplitStack
      </h1>
      <p className="mt-3 max-w-sm text-balance text-zinc-600 dark:text-zinc-400">
        {t("pitch")}
      </p>
      <Link
        href="/login"
        className={buttonClasses({ size: "lg", className: "mt-8 min-w-44 rounded-full" })}
      >
        {t("getStarted")}
      </Link>
      <p className="mt-4 text-xs text-zinc-400">{t("tagline")}</p>
    </main>
  );
}
