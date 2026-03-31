import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import type { SuggestionOptions } from '@tiptap/suggestion';
import MentionList from '@/components/post/MentionList';
import { createClient } from '@/lib/supabase/client';

const DOMAIN = typeof window !== 'undefined' ? window.location.origin : '';

export default {
  items: async ({ query }: { query: string }) => {
    if (query.length === 0) return [];

    // Fetch users from profiles matching query
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .ilike('display_name', `%${query}%`)
      .limit(5);

    return (data || []).map((p: { id: string; display_name: string; avatar_url: string }) => ({
      id: p.id,
      label: p.display_name,
      avatar: p.avatar_url
    }));
  },

  render: () => {
    let component: ReactRenderer;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) return;

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: any) {
        component?.updateProps(props);
        if (!props.clientRect) return;
        popup?.[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup?.[0].hide();
          return true;
        }
        return (component?.ref as any)?.onKeyDown(props) || false;
      },

      onExit() {
        popup?.[0].destroy();
        component?.destroy();
      },
    };
  },
  // เปลี่ยนแค่บรรทัดล่างสุดนี้บรรทัดเดียวครับ
} as Omit<SuggestionOptions, 'editor'>;