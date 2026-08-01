"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppSidebar({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
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
    <aside className="fixed inset-y-0 start-0 z-20 hidden w-64 flex-col border-e border-zinc-200 bg-white pt-safe dark:border-zinc-800 dark:bg-zinc-950 md:flex lg:w-72">
      <Link
        href="/home"
        className="flex h-16 items-center gap-2.5 px-5 text-lg font-bold tracking-tight"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-base font-bold text-white shadow-sm shadow-brand-500/30">
          S
        </span>
        SplitStack
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
              )}
            >
              <span aria-hidden className="text-base">
                {link.emoji}
              </span>
              {link.label}
            </Link>
          );
        })}

        <Link
          href="/groups/new"
          className={buttonClasses({ className: "mt-4 w-full" })}
        >
          + {tHome("newGroup")}
        </Link>
      </nav>

      <div className="flex items-center gap-1 px-3 pb-2">
        <ThemeToggle />
        <LocaleSwitcher />
      </div>

      <Link
        href="/profile"
        className="m-3 mt-0 flex items-center gap-3 rounded-xl border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
      >
        <Avatar name={user.name} email={user.email} image={user.image} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {user.name ?? user.email}
          </span>
          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
            {user.email}
          </span>
        </span>
      </Link>
    </aside>
  );
}
