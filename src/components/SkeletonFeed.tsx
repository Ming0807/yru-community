import PostSkeleton from '@/components/post/PostSkeleton';

export default function SkeletonFeed() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ animationDelay: `${i * 80}ms` }} className="animate-fade-in">
          <PostSkeleton />
        </div>
      ))}
    </div>
  );
}
