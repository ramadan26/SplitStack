import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { CreateGroupForm } from "@/components/groups/create-group-form";

export const metadata: Metadata = {
  title: "New group",
};

export default async function NewGroupPage() {
  const [t, tCommon] = await Promise.all([
    getTranslations("groupNew"),
    getTranslations("common"),
  ]);

  return (
    <div className="max-w-md space-y-6 py-2">
      <div className="flex items-center gap-2">
        <BackLink href="/home" label={tCommon("back")} />
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>
      <CreateGroupForm />
    </div>
  );
}
