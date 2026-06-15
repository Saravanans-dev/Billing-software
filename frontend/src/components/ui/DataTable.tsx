import React from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Column {
  key: string;
  header: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  searchable?: boolean;
  searchValue?: string;
  onSearch?: (value: string) => void;
  page?: number;
  total?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
}

export function DataTable({
  columns,
  data,
  loading,
  searchable,
  searchValue,
  onSearch,
  page = 1,
  total = 0,
  limit = 50,
  onPageChange,
  emptyMessage = 'No Records Found',
}: DataTableProps) {
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchValue || ''}
            onChange={(e) => onSearch?.(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              {columns.map((col) => (
                <th key={col.key} className={cn('px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Search className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">{emptyMessage}</p>
                    <p className="text-gray-400 text-xs">Add records to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-gray-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3 border-b border-gray-100', col.className)}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium px-3 py-1 bg-gray-100 rounded">{page}</span>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
