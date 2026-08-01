import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";

export const metadata = {
  title: "Offline",
};

export default async function OfflinePage() {
  const t = await getTranslations("offline");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pb-safe pt-safe text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-3xl dark:bg-zinc-800">
        <span role="img" aria-label="offline">
          📡
        </span>
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-3 max-w-sm text-balance text-zinc-600 dark:text-zinc-400">
        {t("description")}
      </p>
      <Link href="/" className={buttonClasses({ size: "lg", className: "mt-8 min-w-44 rounded-full" })}>
        {t("tryAgain")}
      </Link>
    </main>
  );
}
