import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  LayoutGrid, Table as TableIcon, ChevronRight, ChevronLeft, Info, 
  Search, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, RefreshCw,
  SlidersHorizontal
} from 'lucide-react';

export interface ColumnDef<T> {
  id: string;
  header: ReactNode;
  /**
   * Accessor function or key string to extract value from row item
   */
  accessor?: keyof T | ((item: T, index: number) => ReactNode);
  className?: string;
  headerClassName?: string;
  /**
   * Enable column-based client sorting
   */
  sortable?: boolean;
  /**
   * Custom sort accessor function returning comparable string or number
   */
  sortKey?: (item: T) => string | number;
  /**
   * String search function or accessor key for filtering
   */
  searchKey?: (item: T) => string;
  /**
   * If true, this field will be used as the prominent title/header in mobile card view
   */
  isTitle?: boolean;
  /**
   * If true, renders as a badge or status chip at the top right of the mobile card
   */
  isStatus?: boolean;
  /**
   * If true, renders as action buttons at the bottom of the mobile card
   */
  isAction?: boolean;
  /**
   * Hide this specific column in mobile card view
   */
  hideOnMobile?: boolean;
}

export interface ResponsiveTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  title?: ReactNode;
  subtitle?: ReactNode;
  emptyMessage?: ReactNode;
  onRowClick?: (item: T) => void;
  mobileBreakpoint?: number; // default 768
  className?: string;
  tableClassName?: string;
  cardClassName?: string;
  actions?: ReactNode;
  showViewToggle?: boolean; // Allow user to manually toggle between Card and Table view on mobile
  
  // Interactive features
  searchable?: boolean;
  searchPlaceholder?: string;
  sortable?: boolean;
  pageSize?: number;
  showPagination?: boolean;
  
  // Async states
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;

  /**
   * Accent color class for highlights (default: cyan-400)
   */
  accentColor?: string;
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  title,
  subtitle,
  emptyMessage = "No records found matching your criteria.",
  onRowClick,
  mobileBreakpoint = 768,
  className = "",
  tableClassName = "",
  cardClassName = "",
  actions,
  showViewToggle = true,
  searchable = true,
  searchPlaceholder = "Search records...",
  sortable = true,
  pageSize = 10,
  showPagination = true,
  isLoading = false,
  error = null,
  onRetry,
  accentColor = "text-cyan-400"
}: ResponsiveTableProps<T>) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < mobileBreakpoint;
    }
    return false;
  });

  const [forceViewMode, setForceViewMode] = useState<'auto' | 'card' | 'table'>('auto');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumnId, setSortColumnId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileBreakpoint]);

  const effectiveMode = forceViewMode === 'auto' 
    ? (isMobile ? 'card' : 'table') 
    : forceViewMode;

  const getValue = (item: T, col: ColumnDef<T>, index: number): ReactNode => {
    if (col.accessor) {
      if (typeof col.accessor === 'function') {
        return col.accessor(item, index);
      }
      return (item[col.accessor] as unknown) as ReactNode;
    }
    return null;
  };

  // 1. Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();

    return data.filter(item => {
      return columns.some(col => {
        if (col.searchKey) {
          return col.searchKey(item).toLowerCase().includes(q);
        }
        if (col.accessor && typeof col.accessor !== 'function') {
          const val = item[col.accessor];
          if (val !== null && val !== undefined) {
            return String(val).toLowerCase().includes(q);
          }
        }
        return false;
      });
    });
  }, [data, searchQuery, columns]);

  // 2. Sort filtered data
  const sortedData = useMemo(() => {
    if (!sortColumnId) return filteredData;

    const col = columns.find(c => c.id === sortColumnId);
    if (!col) return filteredData;

    return [...filteredData].sort((a, b) => {
      let valA: any = null;
      let valB: any = null;

      if (col.sortKey) {
        valA = col.sortKey(a);
        valB = col.sortKey(b);
      } else if (col.accessor && typeof col.accessor !== 'function') {
        valA = a[col.accessor];
        valB = b[col.accessor];
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      return sortDirection === 'asc' 
        ? strA.localeCompare(strB) 
        : strB.localeCompare(strA);
    });
  }, [filteredData, sortColumnId, sortDirection, columns]);

  // Reset pagination on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortColumnId, sortDirection, currentPageSize]);

  // 3. Paginate sorted data
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / currentPageSize));
  
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    const startIdx = (currentPage - 1) * currentPageSize;
    return sortedData.slice(startIdx, startIdx + currentPageSize);
  }, [sortedData, currentPage, currentPageSize, showPagination]);

  const handleSort = (colId: string) => {
    if (!sortable) return;
    if (sortColumnId === colId) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumnId(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumnId(colId);
      setSortDirection('asc');
    }
  };

  const titleColumn = columns.find(c => c.isTitle) || columns[0];
  const statusColumn = columns.find(c => c.isStatus);
  const actionColumn = columns.find(c => c.isAction);
  const detailColumns = columns.filter(c => !c.isTitle && !c.isStatus && !c.isAction && !c.hideOnMobile);

  return (
    <div className={`w-full space-y-3 font-sans ${className}`} id="responsive-table-container">
      {/* Table / Card Header Controls Bar */}
      {(title || subtitle || actions || showViewToggle || searchable) && (
        <div className="flex flex-col gap-3 bg-gray-900/40 p-3.5 rounded-2xl border border-brand-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              {title && <div className="text-sm sm:text-base font-bold text-gray-100 flex items-center gap-2">{title}</div>}
              {subtitle && <div className="text-xs text-gray-400 font-mono mt-0.5">{subtitle}</div>}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              {actions}

              {showViewToggle && (
                <div className="flex items-center bg-gray-950 p-1 rounded-xl border border-brand-border text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setForceViewMode('table')}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition ${
                      effectiveMode === 'table' 
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' 
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    title="Force Table View"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForceViewMode('card')}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition ${
                      effectiveMode === 'card' 
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' 
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    title="Force Mobile Cards View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Cards</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar & Mobile Sort Selector */}
          {searchable && (
            <div className="flex flex-col xs:flex-row items-center gap-2 pt-1 border-t border-brand-border/40">
              <div className="relative w-full flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-gray-950/80 border border-brand-border text-gray-100 pl-9 pr-3 py-1.5 rounded-xl text-xs font-sans placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Mobile Sort Dropdown */}
              {isMobile && sortable && (
                <div className="flex items-center gap-2 w-full xs:w-auto">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <select
                    value={sortColumnId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setSortColumnId(null);
                      } else {
                        setSortColumnId(val);
                        setSortDirection('asc');
                      }
                    }}
                    className="w-full xs:w-auto bg-gray-950/80 border border-brand-border text-gray-300 px-3 py-1.5 rounded-xl text-xs font-mono focus:outline-none"
                  >
                    <option value="">Sort By Default</option>
                    {columns.filter(c => c.sortable !== false).map(col => (
                      <option key={col.id} value={col.id}>
                        Sort by {typeof col.header === 'string' ? col.header : col.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error ? (
        <div className="glass-panel p-6 rounded-2xl text-center border border-rose-500/30 bg-rose-950/10 space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <div className="text-sm font-semibold text-rose-200">{error}</div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-medium transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      ) : isLoading ? (
        /* Loading Skeleton State */
        <div className="space-y-3">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="glass-panel p-4 rounded-xl border border-brand-border animate-pulse space-y-3">
              <div className="h-4 bg-gray-800 rounded-md w-1/3"></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-3 bg-gray-800/60 rounded-md w-3/4"></div>
                <div className="h-3 bg-gray-800/60 rounded-md w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : paginatedData.length === 0 ? (
        /* Empty State */
        <div className="glass-panel p-8 rounded-2xl text-center border border-brand-border space-y-2">
          <Info className="w-8 h-8 text-gray-500 mx-auto opacity-60" />
          <div className="text-sm text-gray-400 font-medium">{emptyMessage}</div>
        </div>
      ) : effectiveMode === 'table' ? (
        /* Desktop Table View */
        <div className="w-full overflow-x-auto rounded-2xl border border-brand-border glass-panel">
          <table className={`w-full text-left border-collapse text-xs ${tableClassName}`}>
            <thead>
              <tr className="border-b border-brand-border bg-gray-950/60 font-mono text-[11px] text-gray-400 uppercase tracking-wider">
                {columns.map((col) => {
                  const isSorted = sortColumnId === col.id;
                  const isColSortable = sortable && col.sortable !== false;

                  return (
                    <th 
                      key={col.id} 
                      onClick={() => isColSortable && handleSort(col.id)}
                      className={`p-3.5 font-semibold ${
                        isColSortable ? 'cursor-pointer select-none hover:text-cyan-400' : ''
                      } ${col.headerClassName || col.className || ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.header}</span>
                        {isColSortable && (
                          <span className="text-gray-500">
                            {isSorted ? (
                              sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60 text-gray-200">
              {paginatedData.map((item, idx) => (
                <tr
                  key={keyExtractor(item, idx)}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`transition-colors hover:bg-cyan-950/20 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.id} className={`p-3.5 align-middle ${col.className || ''}`}>
                      {getValue(item, col, idx)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Mobile Card Stacked View */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {paginatedData.map((item, idx) => {
            const titleValue = titleColumn ? getValue(item, titleColumn, idx) : null;
            const statusValue = statusColumn ? getValue(item, statusColumn, idx) : null;
            const actionValue = actionColumn ? getValue(item, actionColumn, idx) : null;

            return (
              <div
                key={keyExtractor(item, idx)}
                onClick={() => onRowClick && onRowClick(item)}
                className={`glass-panel p-4 rounded-xl border border-brand-border/80 bg-gray-900/60 hover:border-cyan-500/40 transition-all space-y-3 relative ${
                  onRowClick ? 'cursor-pointer active:scale-[0.99]' : ''
                } ${cardClassName}`}
              >
                {/* Mobile Card Header */}
                <div className="flex items-start justify-between gap-3 border-b border-brand-border/40 pb-2.5">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">
                      {titleColumn?.header}
                    </span>
                    <div className="text-sm font-bold text-gray-100 truncate">
                      {titleValue}
                    </div>
                  </div>

                  {statusValue && (
                    <div className="shrink-0 pt-0.5">
                      {statusValue}
                    </div>
                  )}
                </div>

                {/* Card Fields Grid */}
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 text-xs pt-1">
                  {detailColumns.map((col) => {
                    const val = getValue(item, col, idx);
                    if (val === null || val === undefined || val === '') return null;

                    return (
                      <div key={col.id} className="space-y-0.5 min-w-0">
                        <span className="text-[10px] font-mono text-gray-400 tracking-tight block">
                          {col.header}:
                        </span>
                        <div className="text-gray-200 font-medium truncate">
                          {val}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile Card Actions Footer */}
                {(actionValue || onRowClick) && (
                  <div className="border-t border-brand-border/40 pt-2.5 flex items-center justify-between gap-2">
                    {actionValue ? (
                      <div className="w-full flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        {actionValue}
                      </div>
                    ) : onRowClick ? (
                      <div className="w-full flex items-center justify-between text-[11px] font-mono text-cyan-400">
                        <span>View Details</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer Controls */}
      {showPagination && totalItems > 0 && !isLoading && (
        <div className="flex flex-col xs:flex-row items-center justify-between gap-3 bg-gray-900/30 p-3 rounded-xl border border-brand-border text-xs font-mono">
          <div className="text-gray-400 text-center xs:text-left">
            Showing <span className="text-gray-200 font-bold">{Math.min(totalItems, (currentPage - 1) * currentPageSize + 1)}</span> to{' '}
            <span className="text-gray-200 font-bold">{Math.min(totalItems, currentPage * currentPageSize)}</span> of{' '}
            <span className="text-cyan-400 font-bold">{totalItems}</span> records
          </div>

          <div className="flex items-center gap-2">
            <select
              value={currentPageSize}
              onChange={(e) => setCurrentPageSize(Number(e.target.value))}
              className="bg-gray-950 border border-brand-border text-gray-300 px-2 py-1 rounded-lg text-xs"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-brand-border bg-gray-950 text-gray-300 disabled:opacity-40 hover:enabled:border-cyan-500/40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-gray-300 font-bold">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-brand-border bg-gray-950 text-gray-300 disabled:opacity-40 hover:enabled:border-cyan-500/40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
