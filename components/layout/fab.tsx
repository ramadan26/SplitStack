"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BottomSheet } from "@/components/ui/bottom-sheet";

const fabClass =
  "fixed bottom-20 end-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-3xl font-light leading-none text-white shadow-lg shadow-brand-500/40 transition-transform hover:scale-105 active:scale-95 md:hidden";

// Pages where the FAB would cover form submit buttons
const HIDDEN_PATTERN = /\/expenses\/|\/groups\/new|\/settle/;

export function Fab({
  groups,
}: {
  groups: { id: string; name: string; imageUrl: string | null }[];
}) {
  const pathname = usePathname();
  const t = useTranslations("expense");
  const [pickerOpen, setPickerOpen] = useState(false);

  if (HIDDEN_PATTERN.test(pathname)) return null;

  // Inside a group: jump straight to that group's add-expense form
  const groupMatch = pathname.match(/^\/groups\/([^/]+)/);
  if (groupMatch) {
    return (
      <Link
        href={`/groups/${groupMatch[1]}/expenses/new`}
        aria-label={t("addTitle")}
        className={fabClass}
      >
        +
      </Link>
    );
  }

  // Elsewhere: pick a group first
  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        aria-label={t("addTitle")}
        className={fabClass}
      >
        +
      </button>
      <BottomSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t("chooseGroup")}
      >
        <div className="space-y-1">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}/expenses/new`}
              onClick={() => setPickerOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-xl p-3 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-xl dark:bg-brand-950">
                {group.imageUrl ?? "👥"}
              </span>
              <span className="truncate font-medium">{group.name}</span>
            </Link>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
