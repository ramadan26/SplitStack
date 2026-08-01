"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Minimal pull-to-refresh affordance for server-rendered lists. */
export function RefreshButton() {
  const router = useRouter();
  const t = useTranslations("common");
  const [spinning, setSpinning] = useState(false);

  function onRefresh() {
    setSpinning(true);
    router.refresh();
    // router.refresh() has no completion signal; stop the spin shortly after
    setTimeout(() => setSpinning(false), 800);
  }

  return (
    <button
      type="button"
      onClick={onRefresh}
      aria-label={t("refresh")}
      title={t("refresh")}
      className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
    >
      <span
        aria-hidden
        className={cn(
          "text-lg transition-transform duration-700",
          spinning && "rotate-[360deg]",
        )}
      >
        ↻
      </span>
    </button>
  );
}
