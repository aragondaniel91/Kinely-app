import React from "react";
import { Home, RefreshCw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";

class RouteErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Route render failed:", error, errorInfo);
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <RouteErrorFallback
          error={this.state.error}
          onReset={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

function RouteErrorFallback({ error, onReset }) {
  const message = error?.message || "Unknown route error";

  return (
    <div className="kinely-gradient-bg flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/80 bg-white p-6 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <RefreshCw className="h-5 w-5" />
        </div>

        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
          This space needs a quick reset
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Something interrupted this family space. You can try again or return home while we keep the rest of the app available.
        </p>

        {import.meta.env.DEV && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-2xl bg-slate-950 p-3 text-left text-xs font-semibold text-slate-100">
            {message}
          </pre>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            type="button"
            onClick={onReset}
            className="rounded-full bg-slate-950 px-5 font-black text-white hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>

          <Button
            asChild
            type="button"
            variant="outline"
            className="rounded-full px-5 font-black"
          >
            <Link to="/">
              <Home className="h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RouteErrorBoundary({ children }) {
  const location = useLocation();
  const resetKey = `${location.pathname}${location.search}`;

  return (
    <RouteErrorBoundaryInner resetKey={resetKey}>
      {children}
    </RouteErrorBoundaryInner>
  );
}
