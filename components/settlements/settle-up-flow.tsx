"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { recordSettlement } from "@/lib/actions/settlements";
import { formatCents, parseAmountToCents } from "@/lib/money";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MemberSelect } from "@/components/ui/member-select";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export type SettleMember = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type SettleSuggestion = {
  from: string;
  to: string;
  amount: number; // cents
};

const dollars = (cents: number) => (cents / 100).toFixed(2);

export function SettleUpFlow({
  groupId,
  currentUserId,
  members,
  suggestions,
}: {
  groupId: string;
  currentUserId: string;
  members: SettleMember[];
  suggestions: SettleSuggestion[];
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("settle");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const money = (cents: number) => formatCents(cents, "USD", locale);

  const initial =
    suggestions.find((s) => s.from === currentUserId) ??
    suggestions.find((s) => s.to === currentUserId) ??
    suggestions[0] ??
    null;

  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const [from, setFrom] = useState(initial?.from ?? currentUserId);
  const [to, setTo] = useState(
    initial?.to ?? members.find((m) => m.id !== currentUserId)?.id ?? "",
  );
  const [amount, setAmount] = useState(initial ? dollars(initial.amount) : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const memberById = new Map(members.map((m) => [m.id, m]));
  const nameOf = (id: string) => {
    if (id === currentUserId) return t("you");
    const m = memberById.get(id);
    return m?.name ?? m?.email ?? "?";
  };

  const amountCents = parseAmountToCents(amount) ?? 0;
  const canReview = amountCents > 0 && from !== to && from && to;

  function applySuggestion(s: SettleSuggestion) {
    setFrom(s.from);
    setTo(s.to);
    setAmount(dollars(s.amount));
    setError(null);
  }

  function onReview(e: React.FormEvent) {
    e.preventDefault();
    if (amountCents === 0) {
      setError(tErrors("invalidAmount"));
      return;
    }
    if (from === to) {
      setError(tErrors("samePerson"));
      return;
    }
    setError(null);
    setStep("confirm");
  }

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await recordSettlement({ groupId, fromUserId: from, toUserId: to, amount });
      if (result.ok) {
        router.push(`/groups/${result.groupId}`);
        router.refresh();
      } else {
        setStep("edit");
        setError(result.error);
      }
    });
  }

  if (suggestions.length === 0) {
    return <EmptyState emoji="🎉" title={t("noDebts")} description="" />;
  }

  if (step === "confirm") {
    const fromMember = memberById.get(from);
    const toMember = memberById.get(to);
    return (
      <div className="space-y-4">
        <Card className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <Avatar name={fromMember?.name} email={fromMember?.email} image={fromMember?.image} size="lg" />
              <span className="max-w-24 truncate text-sm font-medium">{nameOf(from)}</span>
            </div>
            <span aria-hidden className="text-2xl text-zinc-400 rtl:-scale-x-100">
              →
            </span>
            <div className="flex flex-col items-center gap-1">
              <Avatar name={toMember?.name} email={toMember?.email} image={toMember?.image} size="lg" />
              <span className="max-w-24 truncate text-sm font-medium">{nameOf(to)}</span>
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight">{money(amountCents)}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("summary", { from: nameOf(from), to: nameOf(to) })}
          </p>
        </Card>

        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3 pb-safe">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setStep("edit")}
            disabled={isPending}
            className="flex-1"
          >
            {tCommon("back")}
          </Button>
          <Button size="lg" onClick={onConfirm} disabled={isPending} className="flex-1">
            {isPending ? <Spinner /> : null}
            {isPending ? t("confirming") : t("confirm")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onReview} className="space-y-6">
      {/* Suggested transfers */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {t("plan")}
        </h2>
        <div className="space-y-2">
          {suggestions.map((s) => {
            const active = s.from === from && s.to === to;
            const fromMember = memberById.get(s.from);
            const toMember = memberById.get(s.to);
            return (
              <button
                key={`${s.from}-${s.to}`}
                type="button"
                onClick={() => applySuggestion(s)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition-colors",
                  active
                    ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/40"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700",
                )}
              >
                <span className="flex items-center -space-x-2 rtl:space-x-reverse">
                  <Avatar name={fromMember?.name} email={fromMember?.email} image={fromMember?.image} size="sm" className="ring-2 ring-white dark:ring-zinc-900" />
                  <Avatar name={toMember?.name} email={toMember?.email} image={toMember?.image} size="sm" className="ring-2 ring-white dark:ring-zinc-900" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {s.from === currentUserId
                    ? t("youOwe", { to: nameOf(s.to) })
                    : t("owes", { from: nameOf(s.from), to: nameOf(s.to) })}
                </span>
                <span className="shrink-0 text-sm font-semibold">
                  {money(s.amount)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom transfer */}
      <div className="grid grid-cols-2 gap-3">
        <MemberSelect
          id="settle-from"
          label={t("from")}
          value={from}
          onChange={setFrom}
          members={members}
          displayName={nameOf}
        />
        <MemberSelect
          id="settle-to"
          label={t("to")}
          value={to}
          onChange={setTo}
          members={members}
          displayName={nameOf}
        />
      </div>

      <div>
        <label htmlFor="settle-amount" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("amount")}
        </label>
        <div className="relative">
          <span className="absolute start-4 top-1/2 -translate-y-1/2 text-zinc-400">
            $
          </span>
          <Input
            id="settle-amount"
            type="text"
            inputMode="decimal"
            dir="ltr"
            autoComplete="off"
            placeholder="0.00"
            className="ps-8"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {t("partialNote")}
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={!canReview} className="w-full pb-safe">
        {t("review")}
      </Button>
    </form>
  );
}
