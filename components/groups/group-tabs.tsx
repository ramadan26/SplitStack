"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const t = useTranslations("group");

  const tabs = [
    { href: `/groups/${groupId}`, label: t("tabExpenses"), exact: true },
    { href: `/groups/${groupId}/activity`, label: t("tabActivity"), exact: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              active
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
