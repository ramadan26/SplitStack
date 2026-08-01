"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";

export type MemberOption = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

/**
 * Design-system member picker: looks like an input, opens a bottom sheet
 * (mobile) / centered dialog (desktop) with avatar rows instead of the
 * native <select> popup.
 */
export function MemberSelect({
  id,
  label,
  value,
  onChange,
  members,
  displayName,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (id: string) => void;
  members: MemberOption[];
  displayName: (id: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const selected = members.find((m) => m.id === value);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex h-12 w-full items-center gap-2.5 rounded-xl border border-zinc-300 bg-white px-3 text-base outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {selected ? (
          <Avatar
            name={selected.name}
            email={selected.email}
            image={selected.image}
            size="sm"
            className="h-7 w-7"
          />
        ) : null}
        <span className="min-w-0 flex-1 truncate text-start">
          {selected ? displayName(selected.id) : "—"}
        </span>
        <span aria-hidden className="text-zinc-400">
          ▾
        </span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={label}>
        <div className="space-y-1">
          {members.map((m) => {
            const isSelected = m.id === value;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                aria-pressed={isSelected}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-xl p-2.5 text-start transition-colors",
                  isSelected
                    ? "bg-brand-50 font-medium dark:bg-brand-950/50"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                )}
              >
                <Avatar name={m.name} email={m.email} image={m.image} size="sm" />
                <span className="min-w-0 flex-1 truncate">
                  {displayName(m.id)}
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
      </BottomSheet>
    </div>
  );
}
