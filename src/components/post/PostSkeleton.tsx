// src/components/post/PostSkeleton.tsx
export default function PostSkeleton() {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 card-shadow">
      {/* Top row - Avatar + Category + Time */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-6 h-6 rounded-full bg-muted animate-shimmer" />
        <div className="h-4 w-20 bg-muted rounded-md animate-shimmer" style={{ animationDelay: '100ms' }} />
        <div className="h-4 w-16 bg-muted rounded-full animate-shimmer" style={{ animationDelay: '200ms' }} />
        <div className="ml-auto h-3.5 w-14 bg-muted rounded-md animate-shimmer" style={{ animationDelay: '300ms' }} />
      </div>

      {/* Title */}
      <div className="space-y-2 mb-3">
        <div className="h-5 bg-muted rounded-lg w-[85%] animate-shimmer" style={{ animationDelay: '150ms' }} />
        <div className="h-5 bg-muted rounded-lg w-[60%] animate-shimmer" style={{ animationDelay: '250ms' }} />
      </div>

      {/* Tags */}
      <div className="flex gap-2 mb-4">
        <div className="h-5 w-14 bg-muted rounded-md animate-shimmer" style={{ animationDelay: '300ms' }} />
        <div className="h-5 w-18 bg-muted rounded-md animate-shimmer" style={{ animationDelay: '400ms' }} />
        <div className="h-5 w-12 bg-muted rounded-md animate-shimmer" style={{ animationDelay: '500ms' }} />
      </div>

      {/* Bottom stats */}
      <div className="flex items-center gap-5 pt-3 border-t border-border/20">
        <div className="h-4 w-10 bg-muted rounded-md animate-shimmer" style={{ animationDelay: '400ms' }} />
        <div className="h-4 w-10 bg-muted rounded-md animate-shimmer" style={{ animationDelay: '500ms' }} />
        <div className="h-4 w-10 bg-muted rounded-md ml-auto animate-shimmer" style={{ animationDelay: '600ms' }} />
      </div>
    </div>
  );
}
