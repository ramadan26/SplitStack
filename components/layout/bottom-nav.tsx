"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const tHome = useTranslations("home");
  const tProfile = useTranslations("profile");
  const tActivity = useTranslations("activity");
  const tDashboard = useTranslations("dashboard");

  const links = [
    { href: "/home", label: tHome("title"), emoji: "🏠" },
    { href: "/dashboard", label: tDashboard("title"), emoji: "📊" },
    { href: "/activity", label: tActivity("title"), emoji: "🔔" },
    { href: "/profile", label: tProfile("title"), emoji: "👤" },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/90 pb-safe backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 md:hidden"
    >
      <div className="grid grid-cols-4">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                active
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400",
              )}
            >
              <span aria-hidden className="text-xl leading-none">
                {link.emoji}
              </span>
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
