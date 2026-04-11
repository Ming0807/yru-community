'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AdminDataTableProps<T = any> {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  searchQuery?: string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function AdminDataTable<T>({
  data,
  columns,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = 'ค้นหา...',
  onSearchChange,
  searchQuery = '',
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  onRowClick,
  emptyMessage = 'ไม่พบข้อมูล',
  className,
}: AdminDataTableProps<T>) {
  const [mounted, setMounted] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState(searchQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setGlobalFilter(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = useCallback((value: string) => {
    setGlobalFilter(value);
    onSearchChange?.(value);
  }, [onSearchChange]);

  const handleSelectionChange = useCallback((ids: Set<string>) => {
    onSelectionChange?.(ids);
  }, [onSelectionChange]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      globalFilter,
    },
    enableRowSelection: selectable,
    onRowSelectionChange: (updater) => {
      const newValue = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(newValue);
      const selectedKeys = Object.keys(newValue).filter(key => newValue[key]);
      const selectedSet = new Set(selectedKeys);
      handleSelectionChange(selectedSet);
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRowId: (row: any, index: number) => {
      const id = row?.id;
      return id || String(index);
    },
  });

  const totalRows = table.getFilteredRowModel().rows.length;
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = Math.ceil(totalRows / pageSize);

  if (!mounted) {
    return (
      <div className={cn('space-y-3', className)}>
        {searchable && <div className="h-10 rounded-xl bg-muted/20 animate-pulse" />}
        <div className="rounded-2xl border border-border/60 bg-background p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted/30 rounded w-3/4" />
            <div className="h-4 bg-muted/30 rounded w-1/2" />
            <div className="h-4 bg-muted/30 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-yru-pink)] focus:border-transparent"
          />
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-3 font-medium',
                        header.column.getCanSort() && 'cursor-pointer select-none hover:bg-muted/80 transition-colors'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-2">
                        {header.isPlaceholder ? null : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <span className="flex-shrink-0">
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-border/50 hover:bg-muted/20 transition-colors',
                      row.getIsSelected() && 'bg-[var(--color-yru-pink)]/5',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      const isClickable = target.closest('a, button, input[type="checkbox"], input[type="radio"]');
                      if (!isClickable && onRowClick) {
                        onRowClick(row.original as T);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60">
            <div className="text-xs text-muted-foreground">
              หน้า {currentPage} จาก {totalPages}
              <span className="hidden sm:inline"> ({totalRows} รายการ)</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { createColumnHelper };
export type { ColumnDef } from '@tanstack/react-table';