import React from "react";

// App-level error boundary: catches render/lifecycle errors anywhere in the
// tree, logs them, and shows a centered recovery screen instead of a blank page.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--ink-900, #1f2937)" }}>
            Something went wrong
          </h1>
          <p style={{ maxWidth: 420, color: "var(--ink-700, #4b5563)" }}>
            An unexpected error occurred. Reloading the page usually fixes it.
          </p>
          <button
            type="button"
            className="a-btn a-btn--primary"
            onClick={this.handleReload}
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              color: "#fff",
              background: "var(--brand-primary, #FF7A24)",
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
