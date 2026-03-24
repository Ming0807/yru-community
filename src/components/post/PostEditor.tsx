'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TipTapLink from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Youtube from '@tiptap/extension-youtube';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Youtube as YoutubeIcon,
  Quote,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useState,useMemo } from 'react';

const COMMON_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff',
  '#E88B9C', '#7EC8A4', '#FFB74D', '#A569BD', '#5DADE2',
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef'
];

interface PostEditorProps {
  content: string;
  onChange: (json: Record<string, unknown>, text: string) => void;
}

// Extract extensions outside the component to prevent re-instantiation and the "Duplicate extension" warning
const extensions = [
  StarterKit.configure({
    bulletList: { keepMarks: true },
    orderedList: { keepMarks: true },
    heading: {
      levels: [1, 2, 3],
    },
  }),
  Placeholder.configure({
    placeholder: 'เขียนเนื้อหากระทู้ของคุณที่นี่...',
  }),
  TipTapLink.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-(--color-yru-pink) underline cursor-pointer',
    },
  }),
  Underline,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  TextStyle,
  Color,
  Youtube.configure({
    HTMLAttributes: {
      class: 'w-full aspect-video rounded-lg mt-4 mb-4',
    },
  }),
];

export default function PostEditor({ content, onChange }: PostEditorProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: content || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[300px] px-5 py-4',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as Record<string, unknown>, editor.getText());
    },
  });

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
        isActive
          ? 'bg-(--color-yru-pink)/15 text-(--color-yru-pink-dark)'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL ลิงก์', previousUrl || '');

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addYoutubeVideo = () => {
    if (youtubeUrl) {
      editor.commands.setYoutubeVideo({
        src: youtubeUrl,
        width: 640,
        height: 480,
      });
      setYoutubeUrl('');
    }
  };

  return (
    <div className="tiptap-editor rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-shadow focus-within:ring-1 focus-within:ring-(--color-yru-pink)/30 focus-within:border-(--color-yru-pink)/50">
      {/* Premium Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 px-3 py-2 bg-muted/20">
        
        {/* History */}
        <div className="flex items-center gap-0.5 mr-1">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="เลิกทำ (Undo)">
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="ทำซ้ำ (Redo)">
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Headings */}
        <div className="flex items-center gap-0.5 mr-1">
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="หัวข้อใหญ่ (H1)">
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="หัวข้อกลาง (H2)">
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="หัวข้อย่อย (H3)">
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Text Formats */}
        <div className="flex items-center gap-0.5 mr-1">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="ตัวหนา">
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="ตัวเอียง">
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="ขีดเส้นใต้">
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="ขีดทับ">
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          
          {/* Color Picker Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
                title="สีข้อความ"
              >
                <Palette className="h-4 w-4" style={{ color: editor.isActive('textStyle') ? editor.getAttributes('textStyle').color : undefined }} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 z-50" align="start">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">เลือกสีข้อความ</div>
              <div className="flex flex-wrap gap-1">
                {COMMON_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded-full border border-border/50 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-(--color-yru-pink)"
                    style={{ backgroundColor: color }}
                    onClick={() => editor.chain().focus().setColor(color).run()}
                    title={color}
                  />
                ))}
                <button
                  type="button"
                  className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-xs hover:bg-muted"
                  onClick={() => editor.chain().focus().unsetColor().run()}
                  title="รีเซ็ตสี"
                >
                  ✕
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Alignment */}
        <div className="flex items-center gap-0.5 mr-1">
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="จัดชิดซ้าย">
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="จัดกึ่งกลาง">
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="จัดชิดขวา">
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="จัดชิดขอบ">
            <AlignJustify className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Lists & Blocks */}
        <div className="flex items-center gap-0.5 mr-1">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="รายการสัญลักษณ์">
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="รายการลำดับ">
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="บล็อกคำพูด">
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="กล่องโค้ด">
            <Code className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Media */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="แทรกลิงก์">
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>

          {/* YouTube Embed Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-(--color-yru-pink)"
                title="แทรกวิดีโอ YouTube"
              >
                <YoutubeIcon className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 z-50" align="end">
              <div className="flex flex-col gap-3">
                <div className="text-sm font-semibold">แทรกวิดีโอ YouTube</div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="วางลิงก์ YouTube ที่นี่..." 
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addYoutubeVideo()}
                  />
                  <Button onClick={addYoutubeVideo} size="sm" className="bg-(--color-yru-pink) hover:bg-(--color-yru-pink-dark) text-white border-0">
                    แทรก
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

      </div>

      {/* Editor Content Area */}
      <div className="bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
