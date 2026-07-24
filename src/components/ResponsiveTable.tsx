import React, { useState, useEffect, ReactNode } from 'react';
import { LayoutGrid, Table as TableIcon, ChevronRight, Info } from 'lucide-react';

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
  emptyMessage = "No records found.",
  onRowClick,
  mobileBreakpoint = 768,
  className = "",
  tableClassName = "",
  cardClassName = "",
  actions,
  showViewToggle = true,
  accentColor = "text-cyan-400"
}: ResponsiveTableProps<T>) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < mobileBreakpoint;
    }
    return false;
  });

  const [forceViewMode, setForceViewMode] = useState<'auto' | 'card' | 'table'>('auto');

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

  const titleColumn = columns.find(c => c.isTitle) || columns[0];
  const statusColumn = columns.find(c => c.isStatus);
  const actionColumn = columns.find(c => c.isAction);
  const detailColumns = columns.filter(c => !c.isTitle && !c.isStatus && !c.isAction && !c.hideOnMobile);

  return (
    <div className={`w-full space-y-3 font-sans ${className}`}>
      {/* Table / Card Header Controls Bar */}
      {(title || subtitle || actions || showViewToggle) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-900/40 p-3.5 rounded-xl border border-brand-border">
          <div>
            {title && <div className="text-sm font-bold text-gray-100 flex items-center gap-2">{title}</div>}
            {subtitle && <div className="text-xs text-gray-400 font-mono mt-0.5">{subtitle}</div>}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {actions}

            {showViewToggle && (
              <div className="flex items-center bg-gray-950 p-1 rounded-lg border border-brand-border text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setForceViewMode('table')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition ${
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
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition ${
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
      )}

      {/* Empty State */}
      {data.length === 0 ? (
        <div className="glass-panel p-8 rounded-xl text-center border border-brand-border space-y-2">
          <Info className="w-8 h-8 text-gray-500 mx-auto opacity-60" />
          <div className="text-sm text-gray-400 font-medium">{emptyMessage}</div>
        </div>
      ) : effectiveMode === 'table' ? (
        /* Desktop Table View */
        <div className="w-full overflow-x-auto rounded-xl border border-brand-border glass-panel">
          <table className={`w-full text-left border-collapse text-xs ${tableClassName}`}>
            <thead>
              <tr className="border-b border-brand-border bg-gray-950/60 font-mono text-[11px] text-gray-400 uppercase tracking-wider">
                {columns.map((col) => (
                  <th key={col.id} className={`p-3.5 font-semibold ${col.headerClassName || col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60 text-gray-200">
              {data.map((item, idx) => (
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
          {data.map((item, idx) => {
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
                      <div className="w-full flex items-center gap-2 justify-end">
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
    </div>
  );
}
