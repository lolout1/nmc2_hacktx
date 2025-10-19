/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 */

import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Report to error tracking service if configured
    if (typeof window !== "undefined" && window.errorTracker) {
      window.errorTracker.report(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Optionally reload the page
    if (this.props.resetOnError) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div
          style={{
            width: "100vw",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-4)",
            textAlign: "center",
          }}
        >
          <h1 style={{ marginBottom: "var(--space-4)", color: "red" }}>
            ⚠️ Something went wrong
          </h1>
          <p style={{ marginBottom: "var(--space-3)", maxWidth: "600px" }}>
            {this.props.errorMessage ||
              "An unexpected error occurred. Please try refreshing the page."}
          </p>
          
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details
              style={{
                marginBottom: "var(--space-4)",
                maxWidth: "800px",
                textAlign: "left",
                backgroundColor: "var(--colour-offset)",
                padding: "var(--space-3)",
                borderRadius: "4px",
                overflow: "auto",
              }}
            >
              <summary style={{ cursor: "pointer", marginBottom: "var(--space-2)" }}>
                Error Details (Development Mode)
              </summary>
              <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>
                {this.state.error.toString()}
                {"\n\n"}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button onClick={this.handleReset}>
              Try Again
            </button>
            <button onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

