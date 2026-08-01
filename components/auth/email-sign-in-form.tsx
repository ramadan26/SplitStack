"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { signInWithEmail } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function EmailSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signInWithEmail(formData);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label htmlFor="email" className="sr-only">
        {t("emailPlaceholder")}
      </label>
      <Input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        placeholder={t("emailPlaceholder")}
        required
      />
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? <Spinner /> : null}
        {isPending ? t("emailSending") : t("emailButton")}
      </Button>
    </form>
  );
}
