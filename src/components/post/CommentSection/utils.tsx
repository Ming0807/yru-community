import type { Comment } from '@/types';

import React from 'react';

export function buildCommentTree(flat: Comment[]): Comment[] {
  const topLevel: Comment[] = [];
  const replyMap = new Map<string, Comment[]>();

  for (const c of flat) {
    if (!c.parent_id) {
      topLevel.push({ ...c, replies: [] });
    } else {
      const arr = replyMap.get(c.parent_id) || [];
      arr.push(c);
      replyMap.set(c.parent_id, arr);
    }
  }

  function attachReplies(replies: Comment[]): Comment[] {
    return replies.map(r => ({
      ...r,
      replies: attachReplies(replyMap.get(r.id) || []),
    }));
  }

  for (const parent of topLevel) {
    parent.replies = attachReplies(replyMap.get(parent.id) || []);
    parent.replies.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  return topLevel;
}

export function renderContent(content: string): React.ReactNode[] {
  const parts = content.split(/(@\S+)/g);
  return parts.map((part, i): React.ReactNode => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="text-[var(--color-yru-pink)] font-semibold">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
