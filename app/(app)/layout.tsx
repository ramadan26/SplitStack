import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Fab } from "@/components/layout/fab";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Lightweight group list for the FAB's add-expense picker
  const memberships = await db.groupMember.findMany({
    where: { userId: session.user.id, status: "ACTIVE" },
    select: { group: { select: { id: true, name: true, imageUrl: true } } },
    orderBy: { group: { updatedAt: "desc" } },
  });
  const groups = memberships.map((m) => m.group);

  return (
    <div className="min-h-dvh">
      {/* Mobile top bar (replaced by the sidebar on md and up) */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 pt-safe backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link
            href="/home"
            className="flex items-center gap-2 font-bold tracking-tight"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white shadow-sm shadow-brand-500/30">
              S
            </span>
            SplitStack
          </Link>
          <div className="flex items-center">
            <ThemeToggle />
            <LocaleSwitcher />
            <Link
              href="/profile"
              aria-label="Your profile"
              className="flex h-11 w-11 items-center justify-center"
            >
              <Avatar
                name={session.user.name}
                email={session.user.email}
                image={session.user.image}
                size="sm"
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <AppSidebar user={session.user} />

      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4 md:ms-64 md:w-auto md:max-w-none md:px-6 md:pb-safe lg:ms-72 lg:px-8">
        {children}
      </main>

      {/* Mobile bottom navigation + add-expense FAB */}
      <BottomNav />
      <Fab groups={groups} />
    </div>
  );
}
