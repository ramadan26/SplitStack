import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { signInWithGoogle } from "@/lib/actions/auth";
import { DEMO_PASSWORD } from "@/lib/auth";
import { EmailSignInForm } from "@/components/auth/email-sign-in-form";
import { PasswordSignInForm } from "@/components/auth/password-sign-in-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign in",
};

const googleConfigured = !!(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const t = await getTranslations("auth");

  const callbackUrl =
    typeof searchParams.callbackUrl === "string" &&
    searchParams.callbackUrl.startsWith("/")
      ? searchParams.callbackUrl
      : "/home";

  return (
    <div className="relative text-center">
      <div className="absolute -top-8 end-0 flex items-center gap-1 sm:-end-12">
        <ThemeToggle />
        <LocaleSwitcher />
      </div>

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-bold text-white shadow-lg shadow-brand-500/30">
        S
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{t("welcome")}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {t("subtitle")}
      </p>

      <div className="mt-8 space-y-4">
        <PasswordSignInForm
          callbackUrl={callbackUrl}
          demoPassword={DEMO_PASSWORD}
        />

        {googleConfigured ? (
          <>
            <Divider label={t("or")} />
            <form action={signInWithGoogle}>
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <button
                type="submit"
                className={buttonClasses({ variant: "outline", size: "lg", className: "w-full bg-white dark:bg-zinc-900" })}
              >
                <GoogleLogo />
                {t("continueGoogle")}
              </button>
            </form>
          </>
        ) : null}

        <Divider label={t("or")} />
        <EmailSignInForm callbackUrl={callbackUrl} />
      </div>

      <p className="mt-6 text-xs text-zinc-400">{t("magicLinkNote")}</p>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-zinc-400">
      <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      {label}
      <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
