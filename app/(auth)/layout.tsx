export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pb-safe pt-safe">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
