"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { updateDisplayName } from "@/lib/actions/profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ProfileForm({ defaultName }: { defaultName: string }) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, tErrors("nameEmpty"))
      .max(50, tErrors("nameTooLong")),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: defaultName },
  });

  const onSubmit = handleSubmit((values) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateDisplayName(values);
      setFeedback(
        result.ok
          ? { kind: "success", message: t("updated") }
          : { kind: "error", message: result.error },
      );
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label
        htmlFor="name"
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {t("displayName")}
      </label>
      <Input id="name" type="text" autoComplete="name" {...register("name")} />
      {errors.name ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errors.name.message}
        </p>
      ) : null}
      {feedback ? (
        <p
          role="status"
          className={
            feedback.kind === "success"
              ? "text-sm text-brand-600 dark:text-brand-400"
              : "text-sm text-red-600 dark:text-red-400"
          }
        >
          {feedback.message}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? <Spinner /> : null}
        {isPending ? tCommon("saving") : tCommon("save")}
      </Button>
    </form>
  );
}
