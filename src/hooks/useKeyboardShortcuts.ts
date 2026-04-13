'use client';

import { useEffect, useCallback } from 'react';

interface UseKeyboardShortcutsOptions {
  onNext?: () => void;
  onPrev?: () => void;
  onSelect?: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onNext,
  onPrev,
  onSelect,
  onDelete,
  onEscape,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement;
      const isInputOrTextarea = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isInputOrTextarea) return;

      switch (e.key.toLowerCase()) {
        case 'j':
        case 'arrowdown':
          e.preventDefault();
          onNext?.();
          break;
        case 'k':
        case 'arrowup':
          e.preventDefault();
          onPrev?.();
          break;
        case 'x':
        case ' ':
          e.preventDefault();
          onSelect?.();
          break;
        case 'd':
        case 'delete':
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onDelete?.();
          }
          break;
        case 'escape':
          e.preventDefault();
          onEscape?.();
          break;
      }
    },
    [enabled, onNext, onPrev, onSelect, onDelete, onEscape]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

interface UseDataTableKeyboardOptions {
  totalRows: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onRowSelect?: (index: number) => void;
  onRowDelete?: (index: number) => void;
  enabled?: boolean;
}

export function useDataTableKeyboard({
  totalRows,
  pageSize,
  currentPage,
  onPageChange,
  onRowSelect,
  onRowDelete,
  enabled = true,
}: UseDataTableKeyboardOptions) {
  const currentIndex = -1;

  const handleNext = useCallback(() => {
    const newIndex = Math.min(currentIndex + 1, totalRows - 1);
    onRowSelect?.(newIndex);
  }, [currentIndex, totalRows, onRowSelect]);

  const handlePrev = useCallback(() => {
    const newIndex = Math.max(currentIndex - 1, 0);
    onRowSelect?.(newIndex);
  }, [currentIndex, onRowSelect]);

  const handleSelect = useCallback(() => {
    if (currentIndex >= 0) {
      onRowSelect?.(currentIndex);
    }
  }, [currentIndex, onRowSelect]);

  const handleDelete = useCallback(() => {
    if (currentIndex >= 0) {
      onRowDelete?.(currentIndex);
    }
  }, [currentIndex, onRowDelete]);

  const handleEscape = useCallback(() => {
    onRowSelect?.(-1);
  }, [onRowSelect]);

  return useKeyboardShortcuts({
    onNext: totalRows > 0 ? handleNext : undefined,
    onPrev: totalRows > 0 ? handlePrev : undefined,
    onSelect: handleSelect,
    onDelete: handleDelete,
    onEscape: handleEscape,
    enabled,
  });
}