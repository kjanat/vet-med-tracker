import { Skeleton } from "@/components/ui/skeleton";

export default function AnimalReportLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
        </div>

        {/* Animal Info Card */}
        <div className="mb-8 space-y-4 rounded-lg border p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {["stat-1", "stat-2", "stat-3", "stat-4"].map((key) => (
            <Skeleton className="h-32" key={key} />
          ))}
        </div>

        {/* Compliance Chart */}
        <div className="mb-8">
          <Skeleton className="mb-4 h-6 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>

        {/* Recent Administrations */}
        <div>
          <Skeleton className="mb-4 h-6 w-48" />
          <div className="space-y-2">
            {["admin-1", "admin-2", "admin-3", "admin-4", "admin-5"].map(
              (key) => (
                <Skeleton className="h-16 w-full" key={key} />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
