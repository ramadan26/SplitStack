import { Skeleton } from "@/components/ui/skeleton";

export default function GroupLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading group">
      {/* group header */}
      <div className="flex items-center gap-3 py-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* balances */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* expenses */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
