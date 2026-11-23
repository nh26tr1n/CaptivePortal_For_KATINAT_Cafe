import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2"><Skeleton className="h-8 w-44" /><Skeleton className="h-4 w-72" /></div>
        <Skeleton className="h-10 w-52" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 8 }, (_, index) => (
          <Card key={index}>
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-64 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
