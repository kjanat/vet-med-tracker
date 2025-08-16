import { Skeleton } from "@/components/ui/skeleton";

export default function EmergencyCardLoading() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <Skeleton className="mx-auto mb-2 h-10 w-64" />
          <Skeleton className="mx-auto h-6 w-48" />
        </div>

        {/* Emergency Contact */}
        <div className="mb-6 rounded-lg border-2 border-destructive p-4">
          <Skeleton className="mb-2 h-6 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>

        {/* Animal Info */}
        <div className="mb-6 space-y-4 rounded-lg bg-card p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Skeleton className="mb-1 h-4 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div>
              <Skeleton className="mb-1 h-4 w-16" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </div>

        {/* Medical Info */}
        <div className="space-y-4">
          <div className="rounded-lg bg-card p-4">
            <Skeleton className="mb-2 h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-3/4" />
          </div>

          <div className="rounded-lg bg-card p-4">
            <Skeleton className="mb-2 h-6 w-48" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}
