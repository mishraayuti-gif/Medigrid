import React from 'react';
import { RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('MindCare AI UI error boundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB] dark:bg-[#0A0F1C] px-6 py-12">
          <div className="max-w-md w-full rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-8 text-center space-y-4">
            <h1 className="font-display text-2xl font-medium text-slate-900 dark:text-white">
              Something interrupted your session
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload MindCare AI
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
