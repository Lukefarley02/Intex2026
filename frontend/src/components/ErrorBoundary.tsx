import { Component, type ErrorInfo, type ReactNode } from "react";
import { Flame } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catch-all error boundary that wraps the entire route tree.
 *
 * If any child component throws during render, this shows a friendly
 * fallback instead of a white screen. The user can reload or navigate
 * home to recover. The raw error message is shown in a collapsible
 * <details> block so developers can diagnose without opening DevTools.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    // Reset the boundary state so the home page can render cleanly
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center bg-background p-8"
          role="alert"
        >
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center">
                <Flame className="w-8 h-8 text-primary" aria-hidden="true" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Something went wrong
              </h1>
              <p className="text-muted-foreground text-sm">
                An unexpected error occurred. You can try reloading the page or
                returning to the home page.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Reload page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2 rounded-lg border font-medium text-sm hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Go to home
              </button>
            </div>

            {this.state.error && (
              <details className="text-left rounded-lg border bg-muted/50 p-3">
                <summary className="text-xs font-medium text-muted-foreground cursor-pointer">
                  Error details
                </summary>
                <pre className="mt-2 text-xs text-destructive whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
