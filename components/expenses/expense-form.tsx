"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import type { Category, SplitType } from "@prisma/client";
import {
  createExpense,
  deleteExpense,
  updateExpense,
} from "@/lib/actions/expenses";
import { computeEqualSplits } from "@/lib/balance";
import { formatCents, parseAmountToCents } from "@/lib/money";
import { CATEGORY_META } from "@/lib/categories";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";

export type ExpenseMember = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type InitialExpense = {
  id: string;
  description: string;
  amount: string; // dollars, e.g. "45.00"
  date: string; // yyyy-mm-dd
  category: Category;
  splitType: SplitType;
  paidById: string;
  splits: { userId: string; amount: string }[];
};

const CATEGORY_KEYS = Object.keys(CATEGORY_META) as Category[];
const SPLIT_MODES: SplitType[] = ["EQUAL", "EXACT", "PERCENTAGE"];

const dollars = (cents: number) => (cents / 100).toFixed(2);

function equalPercentages(ids: string[]): Record<string, string> {
  const n = ids.length;
  if (n === 0) return {};
  const base = Math.floor(10000 / n) / 100;
  const result: Record<string, string> = {};
  ids.forEach((id, i) => {
    result[id] = (i === 0 ? 100 - base * (n - 1) : base).toString();
  });
  return result;
}

export function ExpenseForm({
  groupId,
  members,
  currentUserId,
  initialExpense,
}: {
  groupId: string;
  members: ExpenseMember[];
  currentUserId: string;
  initialExpense?: InitialExpense;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("expense");
  const tCat = useTranslations("categories");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const money = (cents: number) => formatCents(cents, "USD", locale);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [category, setCategory] = useState<Category>(
    initialExpense?.category ?? "FOOD",
  );
  const [paidById, setPaidById] = useState(
    initialExpense?.paidById ?? currentUserId,
  );
  const [splitType, setSplitType] = useState<SplitType>(
    initialExpense?.splitType ?? "EQUAL",
  );
  const [selected, setSelected] = useState<string[]>(
    initialExpense?.splits.map((s) => s.userId) ?? members.map((m) => m.id),
  );
  const [exact, setExact] = useState<Record<string, string>>(() => {
    if (initialExpense?.splitType === "EXACT") {
      return Object.fromEntries(
        initialExpense.splits.map((s) => [s.userId, s.amount]),
      );
    }
    return {};
  });
  const [pct, setPct] = useState<Record<string, string>>(() => {
    if (initialExpense?.splitType === "PERCENTAGE") {
      const total = initialExpense.splits.reduce(
        (sum, s) => sum + parseFloat(s.amount),
        0,
      );
      const result: Record<string, string> = {};
      let assigned = 0;
      initialExpense.splits.forEach((s, i) => {
        if (i === initialExpense.splits.length - 1) {
          result[s.userId] = (100 - assigned).toFixed(2).replace(/\.?0+$/, "");
        } else {
          const share = Math.round((parseFloat(s.amount) / total) * 10000) / 100;
          result[s.userId] = share.toString();
          assigned += share;
        }
      });
      return result;
    }
    return equalPercentages(initialExpense?.splits.map((s) => s.userId) ?? members.map((m) => m.id));
  });

  const schema = z.object({
    description: z
      .string()
      .trim()
      .min(1, tErrors("descriptionRequired"))
      .max(120, tErrors("descriptionTooLong")),
    amount: z.string().trim().min(1, tErrors("invalidAmount")),
    date: z.string().min(1, tErrors("invalidDate")),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: initialExpense?.description ?? "",
      amount: initialExpense?.amount ?? "",
      date: initialExpense?.date ?? format(new Date(), "yyyy-MM-dd"),
    },
  });

  const amountValue = watch("amount");
  const totalCents = parseAmountToCents(amountValue) ?? 0;

  const exactSum = selected.reduce(
    (sum, id) => sum + (parseAmountToCents(exact[id] ?? "", { allowZero: true }) ?? 0),
    0,
  );
  const pctSum = selected.reduce((sum, id) => sum + (parseFloat(pct[id] || "0") || 0), 0);

  const nameOf = (m: ExpenseMember) => m.name ?? m.email ?? "?";

  function switchMode(mode: SplitType) {
    setSplitType(mode);
    if (mode === "EXACT" && totalCents > 0) {
      const shares = computeEqualSplits(totalCents, selected, paidById);
      setExact(Object.fromEntries([...shares.entries()].map(([id, c]) => [id, dollars(c)])));
    }
    if (mode === "PERCENTAGE") {
      setPct((prev) => {
        const hasAll = selected.every((id) => prev[id] !== undefined);
        return hasAll ? prev : equalPercentages(selected);
      });
    }
  }

  function toggleMember(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  const onSubmit = handleSubmit((values) => {
    setError(null);
    if (totalCents === 0) {
      setError(tErrors("invalidAmount"));
      return;
    }
    if (selected.length === 0) {
      setError(tErrors("selectMembers"));
      return;
    }
    if (splitType === "EXACT" && exactSum !== totalCents) {
      setError(tErrors("exactSumMismatch"));
      return;
    }
    if (splitType === "PERCENTAGE" && Math.abs(pctSum - 100) > 0.01) {
      setError(tErrors("percentSumMismatch"));
      return;
    }

    const payload = {
      groupId,
      description: values.description,
      amount: values.amount,
      date: values.date,
      category,
      paidById,
      splitType,
      memberIds: selected,
      exactAmounts: Object.fromEntries(selected.map((id) => [id, exact[id] ?? "0"])),
      percentages: Object.fromEntries(selected.map((id) => [id, pct[id] ?? "0"])),
    };

    startTransition(async () => {
      const result = initialExpense
        ? await updateExpense(initialExpense.id, payload)
        : await createExpense(payload);
      if (result.ok) {
        router.push(`/groups/${result.groupId}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  });

  const [deleteOpen, setDeleteOpen] = useState(false);

  function onConfirmDelete() {
    if (!initialExpense) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteExpense(initialExpense.id);
      if (result.ok) {
        router.push(`/groups/${result.groupId}`);
        router.refresh();
      } else {
        setDeleteOpen(false);
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-x-10 lg:gap-y-8 lg:space-y-0">
      <div className="space-y-6">
      {/* Description + amount */}
      <div className="space-y-3">
        <div>
          <label htmlFor="description" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t("description")}
          </label>
          <Input
            id="description"
            type="text"
            autoComplete="off"
            autoFocus={!initialExpense}
            placeholder={t("descriptionPlaceholder")}
            {...register("description")}
          />
          {errors.description ? (
            <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.description.message}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="amount" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t("amount")}
            </label>
            <div className="relative">
              <span className="absolute start-4 top-1/2 -translate-y-1/2 text-zinc-400">
                $
              </span>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                dir="ltr"
                placeholder="0.00"
                className="ps-8"
                {...register("amount")}
              />
            </div>
            {errors.amount ? (
              <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.amount.message}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="date" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t("date")}
            </label>
            <Input id="date" type="date" dir="ltr" {...register("date")} />
          </div>
        </div>
      </div>

      {/* Category */}
      <div>
        <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("category")}
        </span>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              aria-pressed={category === key}
              className={cn(
                "flex h-11 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
                category === key
                  ? "border-brand-500 bg-brand-50 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400",
              )}
            >
              <span aria-hidden>{CATEGORY_META[key].emoji}</span>
              {tCat(key.toLowerCase() as "food")}
            </button>
          ))}
        </div>
      </div>

      {/* Paid by */}
      <div>
        <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("paidBy")}
        </span>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPaidById(m.id)}
              aria-pressed={paidById === m.id}
              className={cn(
                "flex h-11 items-center gap-2 rounded-full border pe-3 ps-1.5 text-sm transition-colors",
                paidById === m.id
                  ? "border-brand-500 bg-brand-50 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400",
              )}
            >
              <Avatar name={m.name} email={m.email} image={m.image} size="sm" />
              {m.id === currentUserId ? t("you") : nameOf(m)}
            </button>
          ))}
        </div>
      </div>

      </div>

      <div className="space-y-6">
      {/* Participants */}
      <div>
        <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("splitBetween")}
        </span>
        <div className="space-y-1.5">
          {members.map((m) => {
            const isSelected = selected.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMember(m.id)}
                aria-pressed={isSelected}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-2.5 text-start transition-colors",
                  isSelected
                    ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/40"
                    : "border-zinc-200 opacity-60 dark:border-zinc-700",
                )}
              >
                <Avatar name={m.name} email={m.email} image={m.image} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {m.id === currentUserId ? t("you") : nameOf(m)}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                    isSelected
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-zinc-300 text-transparent dark:border-zinc-600",
                  )}
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Split mode */}
      <div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          {SPLIT_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => switchMode(mode)}
              aria-pressed={splitType === mode}
              className={cn(
                "h-10 rounded-lg text-sm font-medium transition-colors",
                splitType === mode
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400",
              )}
            >
              {mode === "EQUAL"
                ? t("modeEqual")
                : mode === "EXACT"
                  ? t("modeExact")
                  : t("modePercentage")}
            </button>
          ))}
        </div>

        {splitType === "EQUAL" ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            {t("equalNote")}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {selected.map((id) => {
              const m = members.find((mem) => mem.id === id);
              if (!m) return null;
              return (
                <div key={id} className="flex items-center gap-3">
                  <Avatar name={m.name} email={m.email} image={m.image} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {m.id === currentUserId ? t("you") : nameOf(m)}
                  </span>
                  <div className="relative w-28">
                    {splitType === "EXACT" ? (
                      <>
                        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                          $
                        </span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          placeholder="0.00"
                          className="h-10 ps-7 text-sm"
                          value={exact[id] ?? ""}
                          onChange={(e) =>
                            setExact((prev) => ({ ...prev, [id]: e.target.value }))
                          }
                        />
                      </>
                    ) : (
                      <>
                        <Input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          placeholder="0"
                          className="h-10 pe-7 text-sm"
                          value={pct[id] ?? ""}
                          onChange={(e) =>
                            setPct((prev) => ({ ...prev, [id]: e.target.value }))
                          }
                        />
                        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                          %
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <p
              role="status"
              className={cn(
                "text-sm font-medium",
                (splitType === "EXACT" && exactSum === totalCents && totalCents > 0) ||
                  (splitType === "PERCENTAGE" && Math.abs(pctSum - 100) <= 0.01)
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {splitType === "EXACT"
                ? t("sharesSum", {
                    current: money(exactSum),
                    total: money(totalCents),
                  })
                : t("percentSum", {
                    current: parseFloat(pctSum.toFixed(2)).toString(),
                  })}
            </p>
          </div>
        )}
      </div>

      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400 lg:col-span-2">
          {error}
        </p>
      ) : null}

      <div className="space-y-3 pb-safe lg:col-span-2 lg:flex lg:gap-3 lg:space-y-0">
        <Button type="submit" size="lg" disabled={isPending} className="w-full lg:w-auto lg:min-w-56 lg:px-8">
          {isPending ? <Spinner /> : null}
          {isPending
            ? initialExpense
              ? tCommon("saving")
              : t("adding")
            : initialExpense
              ? t("saveChanges")
              : t("add")}
        </Button>
        {initialExpense ? (
          <Button
            variant="danger"
            size="lg"
            onClick={() => setDeleteOpen(true)}
            disabled={isPending}
            className="w-full lg:w-auto lg:min-w-56 lg:px-8"
          >
            {isPending ? <Spinner /> : null}
            {isPending ? t("deleting") : t("delete")}
          </Button>
        ) : null}
      </div>

      <BottomSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("delete")}
      >
        <p className="mb-5 text-sm text-zinc-600 dark:text-zinc-400">
          {t("deleteConfirm")}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setDeleteOpen(false)}
            disabled={isPending}
            className="flex-1"
          >
            {tCommon("cancel")}
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={onConfirmDelete}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? <Spinner /> : null}
            {tCommon("confirm")}
          </Button>
        </div>
      </BottomSheet>
    </form>
  );
}
