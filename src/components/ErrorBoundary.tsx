import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#09090b] text-white flex flex-col items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full bg-[#121216] border border-white/[0.1] rounded-3xl p-8 text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Something went wrong.
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                The application encountered an unexpected error. You can reload the page or reset the local session to recover.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-white text-black font-semibold text-xs rounded-xl hover:bg-zinc-200 transition flex items-center justify-center gap-2 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>

              <button
                onClick={this.handleResetSession}
                className="px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 border border-white/[0.08]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Local Session</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
