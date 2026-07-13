import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[Error Boundary Caught] Error in module: ${this.props.moduleName || 'Unknown'}`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-2xl bg-[#14121a] border border-rose-500/20 shadow-xl space-y-4 max-w-2xl mx-auto my-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 mx-auto animate-pulse">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-gray-200">
              Module Encountered an Uncaught Exception
            </h3>
            <p className="text-[11px] text-gray-500 font-mono">
              Module Context: {this.props.moduleName || 'Active View Workspace Component'}
            </p>
          </div>
          
          <div className="bg-gray-950/40 border border-brand-border/60 rounded-lg p-3 text-left font-mono text-[10px] text-rose-300 max-h-40 overflow-y-auto divide-y divide-brand-border/30">
            <div className="pb-1.5 font-bold">Error: {this.state.error?.message || 'Unknown render error'}</div>
            {this.state.error?.stack && (
              <div className="pt-1.5 opacity-60 text-[9px] leading-relaxed whitespace-pre-wrap">
                {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
              </div>
            )}
          </div>

          <div className="flex justify-center gap-3 font-sans">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/30 border border-rose-500/30 text-rose-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
              <span>Retry Rendering Component</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-850 border border-brand-border text-gray-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Reload Entire System</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
