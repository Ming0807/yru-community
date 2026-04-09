import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import EditPostForm from '@/components/post/EditPostForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'แก้ไขกระทู้',
};

interface EditPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch post data
  const { data: post } = await supabase
    .from('posts')
    .select('id, title, content, content_text, is_anonymous, tags, author_id, category:categories(slug)')
    .eq('id', id)
    .single();

  if (!post) {
    notFound();
  }

  // Check authorization (only author can edit)
  if (post.author_id !== user.id) {
    redirect(`/post/${id}`);
  }

  return <EditPostForm post={post as any} />;
}
