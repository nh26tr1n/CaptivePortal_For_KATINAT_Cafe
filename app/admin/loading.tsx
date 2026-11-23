import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div aria-live="polite" className="space-y-6">
      <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <Skeleton className="h-28" key={index} />)}
      </div>
    </div>
  );
}
