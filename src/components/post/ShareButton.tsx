'use client';

import { useState } from 'react';
import { Share2, Copy, Check, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { getLineShareUrl, getFacebookShareUrl } from '@/lib/utils';

interface ShareButtonProps {
  postId: string;
  title: string;
}

export default function ShareButton({ postId, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const getPostUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/post/${postId}`;
    }
    return '';
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getPostUrl());
      setCopied(true);
      toast.success('คัดลอกลิงก์แล้ว');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('ไม่สามารถคัดลอกลิงก์ได้');
    }
  };

  const handleShareLine = () => {
    window.open(getLineShareUrl(getPostUrl()), '_blank', 'width=600,height=500');
  };

  const handleShareFacebook = () => {
    window.open(
      getFacebookShareUrl(getPostUrl()),
      '_blank',
      'width=600,height=500'
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95">
          <Share2 className="h-4 w-4" />
          แชร์
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          {copied ? (
            <Check className="mr-2 h-4 w-4 text-[var(--color-yru-green)]" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          คัดลอกลิงก์
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareLine} className="cursor-pointer">
          <span className="mr-2 text-lg leading-none">💚</span>
          แชร์ไป LINE
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleShareFacebook}
          className="cursor-pointer"
        >
          <span className="mr-2 text-lg leading-none">📘</span>
          แชร์ไป Facebook
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
