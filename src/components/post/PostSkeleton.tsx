// src/components/post/PostSkeleton.tsx
export default function PostSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm animate-pulse">
      {/* Top row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-16 bg-muted rounded-full" />
        <div className="h-4 w-24 bg-muted rounded-md" />
        <div className="ml-auto h-3 w-12 bg-muted rounded-md" />
      </div>

      {/* Title */}
      <div className="space-y-2 mb-3">
        <div className="h-5 bg-muted rounded-md w-3/4" />
        <div className="h-5 bg-muted rounded-md w-1/2" />
      </div>

      {/* Tags */}
      <div className="flex gap-2 mb-4">
        <div className="h-4 w-12 bg-muted rounded-md" />
        <div className="h-4 w-16 bg-muted rounded-md" />
      </div>

      {/* Bottom stats */}
      <div className="flex items-center gap-4 pt-3 border-t border-border/40">
        <div className="h-4 w-8 bg-muted rounded-md" />
        <div className="h-4 w-8 bg-muted rounded-md" />
        <div className="h-4 w-8 bg-muted rounded-md ml-auto" />
      </div>
    </div>
  );
}
