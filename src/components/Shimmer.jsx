import React from "react";

export function ShimmerBlock({ className = "" }) {
  return <span aria-hidden="true" className={`movira-shimmer ${className}`} />;
}

export function PanelShimmer({ rows = 4, className = "" }) {
  return (
    <div className={`rounded-xl border border-[var(--stroke-soft)] bg-[var(--surface-panel)] p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <ShimmerBlock className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <ShimmerBlock className="h-3 w-2/5" />
          <ShimmerBlock className="h-2.5 w-3/5" />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <ShimmerBlock className="h-8 w-8 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <ShimmerBlock className={`h-2.5 ${index % 2 ? "w-3/4" : "w-5/6"}`} />
              <ShimmerBlock className={`h-2 ${index % 2 ? "w-1/2" : "w-2/3"}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageShimmer({ compact = false, className = "" }) {
  return (
    <div
      className={`movira-page-shimmer ${compact ? "movira-page-shimmer--compact" : ""} ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading content</span>
      <div className="rounded-xl border border-[var(--stroke-soft)] bg-[var(--surface-panel)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <ShimmerBlock className="h-2.5 w-24" />
            <ShimmerBlock className="h-5 w-56 max-w-[72%]" />
            <ShimmerBlock className="h-2.5 w-80 max-w-[88%]" />
          </div>
          <ShimmerBlock className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {!compact ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="rounded-xl border border-[var(--stroke-soft)] bg-[var(--surface-panel)] p-3"
            >
              <ShimmerBlock className="h-8 w-8 rounded-lg" />
              <ShimmerBlock className="mt-3 h-5 w-16" />
              <ShimmerBlock className="mt-2 h-2.5 w-24 max-w-full" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <PanelShimmer rows={compact ? 2 : 4} />
        <PanelShimmer rows={compact ? 2 : 4} />
      </div>
    </div>
  );
}

export default PageShimmer;
