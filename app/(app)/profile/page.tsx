import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { signOutAction } from "@/lib/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile/profile-form";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("profile");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true, createdAt: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="max-w-md space-y-6 py-2">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      <Card className="flex items-center gap-4 p-4">
        <Avatar name={user.name} email={user.email} image={user.image} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{user.name ?? "—"}</p>
          <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
            {user.email}
          </p>
        </div>
      </Card>

      <Card className="p-4">
        <ProfileForm defaultName={user.name ?? ""} />
      </Card>

      <form action={signOutAction}>
        <button type="submit" className={buttonClasses({ variant: "danger", size: "lg", className: "w-full" })}>
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}
