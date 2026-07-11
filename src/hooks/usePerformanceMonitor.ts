import { useEffect, useRef } from 'react';

export interface PerformanceMetric {
  moduleName: string;
  loadTimeMs: number;
  timestamp: number;
  type: 'mount' | 'fetch' | 'update';
}

export interface UsePerformanceMonitorOptions {
  /**
   * If the module performs async loading, pass its loading state here (e.g. isLoading).
   * Changing from true to false will trigger a "fetch" measurement.
   */
  isLoading?: boolean;
  /**
   * Optional dependencies to track update render performance.
   */
  deps?: any[];
}

/**
 * A lightweight performance monitoring hook that measures and logs
 * the load/render/fetch times of each dashboard module to identify bottlenecks.
 */
export function usePerformanceMonitor(moduleName: string, options: UsePerformanceMonitorOptions = {}) {
  const { isLoading, deps = [] } = options;
  const mountTimeRef = useRef<number>(performance.now());
  const startLoadingTimeRef = useRef<number | null>(null);

  // Measure initial component mount/load time
  useEffect(() => {
    const end = performance.now();
    const duration = end - mountTimeRef.current;

    if (typeof window !== 'undefined') {
      const win = window as any;
      win.__dashboardPerformanceMetrics = win.__dashboardPerformanceMetrics || [];
      win.__dashboardPerformanceMetrics.push({
        moduleName,
        loadTimeMs: duration,
        timestamp: Date.now(),
        type: 'mount'
      });
    }

    console.log(
      `%c[Perf] ⚡ "${moduleName}" initial mount completed in ${duration.toFixed(2)}ms`,
      'color: #06b6d4; font-weight: bold; background: rgba(6, 182, 212, 0.1); padding: 2px 6px; border-radius: 4px;'
    );
  }, [moduleName]);

  // Measure async data fetching/loading duration
  useEffect(() => {
    if (isLoading === true) {
      startLoadingTimeRef.current = performance.now();
    } else if (isLoading === false && startLoadingTimeRef.current !== null) {
      const end = performance.now();
      const duration = end - startLoadingTimeRef.current;
      startLoadingTimeRef.current = null; // reset timer

      if (typeof window !== 'undefined') {
        const win = window as any;
        win.__dashboardPerformanceMetrics = win.__dashboardPerformanceMetrics || [];
        win.__dashboardPerformanceMetrics.push({
          moduleName,
          loadTimeMs: duration,
          timestamp: Date.now(),
          type: 'fetch'
        });
      }

      console.log(
        `%c[Perf] 📥 "${moduleName}" async data load completed in ${duration.toFixed(2)}ms`,
        'color: #10b981; font-weight: bold; background: rgba(16, 185, 129, 0.1); padding: 2px 6px; border-radius: 4px;'
      );
    }
  }, [isLoading, moduleName]);

  // Track updates based on dependency changes
  const prevDepsRef = useRef<any[]>(deps);
  useEffect(() => {
    if (deps.length > 0) {
      const isChanged = deps.some((dep, idx) => dep !== prevDepsRef.current[idx]);
      if (isChanged) {
        const startUpdate = performance.now();
        // Measure render-to-commit duration
        const duration = performance.now() - startUpdate;
        prevDepsRef.current = deps;

        if (typeof window !== 'undefined') {
          const win = window as any;
          win.__dashboardPerformanceMetrics = win.__dashboardPerformanceMetrics || [];
          win.__dashboardPerformanceMetrics.push({
            moduleName,
            loadTimeMs: duration,
            timestamp: Date.now(),
            type: 'update'
          });
        }

        console.log(
          `%c[Perf] 🔄 "${moduleName}" state updated in ${duration.toFixed(4)}ms`,
          'color: #a855f7; font-weight: bold; background: rgba(168, 85, 247, 0.1); padding: 2px 6px; border-radius: 4px;'
        );
      }
    }
  });
}
