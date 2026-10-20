import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from './primitives';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  /** Cell renderer. Return text or nodes. */
  render: (row: T) => React.ReactNode;
  /** Value used for sorting and CSV export; falls back to the rendered node when omitted. */
  sortValue?: (row: T) => string | number | null;
  numeric?: boolean;
  width?: string;
  /** Short header used on narrow screens (the table also scrolls horizontally). */
  compactHeader?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  caption?: string;
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  emptyAction?: React.ReactNode;
  initialSort?: { columnId: string; direction: 'asc' | 'desc' };
  pageSize?: number;
  /** Rows per page selector is hidden for short tables. */
  minRowsForPaging?: number;
}

/**
 * Single table implementation for the platform: sortable headers, optional pagination,
 * horizontal scrolling on narrow screens (no clipped columns) and an empty state.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  emptyTitle = 'Nothing to show yet',
  emptyDescription,
  emptyAction,
  initialSort,
  pageSize = 10,
  minRowsForPaging = 12,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ columnId: string; direction: 'asc' | 'desc' } | null>(initialSort || null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.id === sort.columnId);
    if (!column) return rows;
    const read = (row: T): string | number | null => {
      if (column.sortValue) return column.sortValue(row);
      const rendered = column.render(row);
      if (typeof rendered === 'string' || typeof rendered === 'number') return rendered;
      return null;
    };
    return [...rows].sort((a, b) => {
      const left = read(a);
      const right = read(b);
      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      if (typeof left === 'number' && typeof right === 'number') {
        return sort.direction === 'asc' ? left - right : right - left;
      }
      const comparison = String(left).localeCompare(String(right), 'en-IN');
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [columns, rows, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  // Clamp the page when the data shrinks (filter, sort or fewer rows) so the
  // table never renders an empty body while the pager claims more pages exist.
  const activePage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    if (sorted.length < minRowsForPaging) return sorted;
    const start = (activePage - 1) * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, activePage, rowsPerPage, minRowsForPaging]);

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  const toggleSort = (columnId: string) => {
    setPage(1);
    setSort((current) => {
      if (!current || current.columnId !== columnId) return { columnId, direction: 'asc' };
      if (current.direction === 'asc') return { columnId, direction: 'desc' };
      return null;
    });
  };

  return (
    <div className="ap-stack ap-stack--tight">
      <div className="ap-table-wrap">
        <table className="ap-table">
          {caption && <caption>{caption}</caption>}
          <thead>
            <tr>
              {columns.map((column) => {
                const isSorted = sort?.columnId === column.id;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    className={column.numeric ? 'is-numeric' : undefined}
                    style={column.width ? { width: column.width } : undefined}
                    aria-sort={isSorted ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.id)}
                      className="inline-flex items-center gap-1.5 font-extrabold uppercase hover:text-forest-700"
                      style={{ letterSpacing: 'inherit', fontSize: 'inherit' }}
                      title={`Sort by ${column.header}`}
                    >
                      <span className="hidden sm:inline">{column.header}</span>
                      <span className="sm:hidden">{column.compactHeader || column.header}</span>
                      {isSorted && (sort?.direction === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr key={getRowId(row)}>
                {columns.map((column) => (
                  <td key={column.id} className={column.numeric ? 'is-numeric' : undefined}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length >= minRowsForPaging && (
        <div className="ap-row ap-row--between ap-no-print" style={{ fontSize: 11 }}>
          <label className="ap-row" style={{ gap: 6 }}>
            <span className="ap-help">Rows per page</span>
            <select
              className="ap-select"
              style={{ width: 74, minHeight: 32 }}
              value={rowsPerPage}
              onChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <div className="ap-row" style={{ gap: 8 }}>
            <span className="ap-help">
              Page {activePage} of {totalPages} · {sorted.length} records
            </span>
            <button
              type="button"
              className="ap-btn ap-btn--secondary ap-btn--sm"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={activePage === 1}
            >
              <ChevronLeft size={13} /> Previous
            </button>
            <button
              type="button"
              className="ap-btn ap-btn--secondary ap-btn--sm"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={activePage >= totalPages}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
