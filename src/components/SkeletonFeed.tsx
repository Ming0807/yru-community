import { Skeleton } from '@/components/ui/skeleton';

export default function SkeletonFeed() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/60 bg-card p-4 space-y-3"
        >
          {/* Category + Time */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
          {/* Title */}
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-3/5" />
          {/* Tags */}
          <div className="flex gap-1.5">
            <Skeleton className="h-4 w-12 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          {/* Stats */}
          <div className="flex items-center gap-4 pt-3 border-t border-border/40">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}
