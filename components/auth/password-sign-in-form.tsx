"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { signInWithPassword } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function PasswordSignInForm({
  callbackUrl,
  demoPassword,
}: {
  callbackUrl: string;
  demoPassword: string;
}) {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signInWithPassword(formData);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label htmlFor="demo-email" className="sr-only">
        {t("demoEmailPlaceholder")}
      </label>
      <Input
        id="demo-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        placeholder={t("demoEmailPlaceholder")}
        required
      />
      <label htmlFor="demo-password" className="sr-only">
        {t("demoPasswordPlaceholder")}
      </label>
      <Input
        id="demo-password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder={t("demoPasswordPlaceholder")}
        required
      />
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? <Spinner /> : null}
        {isPending ? t("demoSigningIn") : t("demoButton")}
      </Button>
      <p className="text-xs text-zinc-400">
        {t.rich("demoHint", {
          password: demoPassword,
          code: (chunks) => (
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              {chunks}
            </code>
          ),
        })}
      </p>
    </form>
  );
}
