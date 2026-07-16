import { useEffect } from "react";

const PageLayout = ({
  heading,
  breadcrumb = [],
  topButton,
  headerbar,
  bottomButton,
  headingClassName = "",
  sectionKicker = "Command Center",
  headerScrolls = false,
  children,
}) => {
  useEffect(() => {
    if (!bottomButton) return undefined;
    document.body.classList.add("has-admin-bottom-bar");
    return () => {
      document.body.classList.remove("has-admin-bottom-bar");
    };
  }, [bottomButton]);

  const header = (
    <div
      className="z-20 min-w-0 rounded-lg px-3 py-2 sm:px-3.5"
      style={{
        background: "var(--surface-panel)",
        border: "1px solid var(--stroke-soft)",
        boxShadow: "var(--shadow-header)",
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="section-kicker">{sectionKicker}</p>
          <h1
            className={`mt-0.5 break-words font-display text-lg font-black tracking-tight sm:text-xl ${headingClassName}`}
            style={{ color: "var(--text-strong)" }}
          >
            {heading}
          </h1>
          {breadcrumb.length > 0 && (
            <nav className="mt-0.5 flex flex-wrap items-center gap-y-1 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              {breadcrumb.map((item, idx) => (
                <span key={idx} className="flex items-center">
                  {item.link ? (
                    <a
                      href={item.link}
                      tabIndex={item.tabIndex}
                      className="hover:underline transition-colors"
                      style={{ color: "var(--brand-primary)" }}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span>{item.label}</span>
                  )}
                  {idx < breadcrumb.length - 1 && (
                    <span className="mx-2 opacity-30">/</span>
                  )}
                </span>
              ))}
            </nav>
          )}
        </div>
        {topButton && (
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end [&>*]:min-w-0">
            {topButton}
          </div>
        )}
      </div>

      {headerbar && <div className="mt-1.5">{headerbar}</div>}
    </div>
  );

  return (
    <section
      className="relative flex min-h-full flex-col"
      style={{ color: "var(--text-strong)" }}
    >
      {!headerScrolls && header}

      <div className="flex-1">
        {headerScrolls && header}
        <div className="py-2.5">{children}</div>
      </div>

      {bottomButton && (
        <div
          className="page-layout-bottom-bar sticky bottom-0 left-0 right-0 z-20 px-3 py-2.5 backdrop-blur-xl sm:px-4 sm:py-3"
          style={{
            background: "var(--surface-bottom)",
            borderTop: "1px solid var(--stroke-soft)",
          }}
        >
          <div className="flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
            {bottomButton}
          </div>
        </div>
      )}
    </section>
  );
};

export default PageLayout;
