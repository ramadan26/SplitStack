"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { deleteExpense } from "@/lib/actions/expenses";
import { isRtl, type Locale } from "@/i18n/config";
import { Spinner } from "@/components/ui/spinner";

const ACTION_WIDTH = 72;
const REVEAL = ACTION_WIDTH * 2;

/**
 * Swipe-to-reveal wrapper: drag the row toward the start edge to reveal
 * Edit / Delete actions pinned to the end edge. RTL-aware. Falls back to
 * plain row behavior (the row itself links to edit) when not dragged.
 */
export function SwipeableExpenseRow({
  expenseId,
  editHref,
  deleteConfirmLabel,
  children,
}: {
  expenseId: string;
  editHref: string;
  deleteConfirmLabel: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const locale = useLocale() as Locale;
  const rtl = isRtl(locale);
  const t = useTranslations("common");
  const tExpense = useTranslations("expense");
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    if (!window.confirm(deleteConfirmLabel)) return;
    startTransition(async () => {
      const result = await deleteExpense(expenseId);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="relative overflow-hidden">
      {/* Actions pinned to the end edge, revealed by the drag */}
      <div className="absolute inset-y-0 end-0 flex">
        <Link
          href={editHref}
          className="flex items-center justify-center bg-zinc-200 text-sm font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
          style={{ width: ACTION_WIDTH }}
        >
          {t("edit")}
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="flex items-center justify-center bg-red-500 text-sm font-medium text-white"
          style={{ width: ACTION_WIDTH }}
        >
          {isPending ? <Spinner /> : tExpense("delete")}
        </button>
      </div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={
          rtl ? { left: 0, right: REVEAL } : { left: -REVEAL, right: 0 }
        }
        dragElastic={0.05}
        className="relative bg-white dark:bg-zinc-900"
      >
        {children}
      </motion.div>
    </div>
  );
}
