import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MentionItem {
  id: string;
  label: string;
  avatar: string | null;
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: any) => void;
}

const MentionList = forwardRef((props: MentionListProps, ref: any) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.label, label: item.label }); // Insert string, usually the username
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  if (!props.items.length) {
    return null;
  }

  return (
    <div className="bg-card w-64 border rounded-xl shadow-lg overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95">
      {props.items.map((item, index) => (
        <button
          className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors ${
            index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
          }`}
          key={index}
          onClick={() => selectItem(index)}
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={item.avatar || ''} />
            <AvatarFallback className="text-[10px] bg-(--color-yru-pink)/10 text-(--color-yru-pink)">
              {item.label?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = 'MentionList';

export default MentionList;
