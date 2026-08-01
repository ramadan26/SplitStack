"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { createGroup } from "@/lib/actions/groups";
import { GROUP_EMOJIS } from "@/lib/categories";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function CreateGroupForm() {
  const router = useRouter();
  const t = useTranslations("groupNew");
  const tErrors = useTranslations("errors");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, tErrors("groupNameRequired"))
      .max(60, tErrors("nameTooLong")),
    description: z.string().trim().max(200).optional(),
    emoji: z.string().optional(),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", emoji: GROUP_EMOJIS[0] },
  });

  const selectedEmoji = watch("emoji");

  const onSubmit = handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await createGroup(values);
      if (result.ok && result.groupId) {
        router.push(`/groups/${result.groupId}`);
      } else if (!result.ok) {
        setError(result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("icon")}
        </span>
        <div className="flex flex-wrap gap-2">
          {GROUP_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setValue("emoji", emoji)}
              aria-pressed={selectedEmoji === emoji}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl border text-xl transition-colors",
                selectedEmoji === emoji
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-950"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {t("name")}
        </label>
        <Input
          id="name"
          type="text"
          autoComplete="off"
          autoFocus
          placeholder={t("namePlaceholder")}
          {...register("name")}
        />
        {errors.name ? (
          <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="description"
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {t("description")}{" "}
          <span className="text-zinc-400">{t("optional")}</span>
        </label>
        <Input
          id="description"
          type="text"
          autoComplete="off"
          placeholder={t("descriptionPlaceholder")}
          {...register("description")}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? <Spinner /> : null}
        {isPending ? t("creating") : t("create")}
      </Button>
    </form>
  );
}
