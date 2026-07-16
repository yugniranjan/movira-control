import { createPortal } from "react-dom";
import { Children, useEffect } from "react";
import { FiX } from "react-icons/fi";
import { providerByKey } from "../constants/providers";
import SearchableSelect from "../../components/common/SearchableSelect";

export function Button({ variant = "primary", size = "md", className = "", ...props }) {
  const base =
    "inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-black shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-primary)]/15";
  const sizes = {
    sm: "min-h-8 px-2.5 py-1 text-xs",
    md: "min-h-9 px-3 py-1.5 text-sm",
    lg: "min-h-10 px-4 py-2 text-sm",
  };
  const variants = {
    primary: "btn-nexus",
    secondary:
      "border border-[var(--stroke-soft)] bg-[var(--surface-panel)] text-[var(--text-base)] hover:border-[var(--brand-primary-border)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-strong)]",
    outline:
      "border border-[var(--stroke-soft)] bg-[var(--surface-panel)] text-[var(--text-strong)] hover:border-[var(--brand-primary-border)] hover:bg-[var(--brand-primary-soft)]",
    ghost:
      "border border-transparent bg-transparent text-[var(--text-base)] shadow-none hover:bg-[var(--surface-muted)] hover:text-[var(--text-strong)]",
    danger: "border border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100",
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", children }) {
  return (
    <div
      className={`min-w-0 rounded-lg border border-[var(--stroke-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-[var(--surface-muted)] text-[var(--text-base)]",
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  brand: "bg-orange-50 text-[var(--brand-primary-deep)]",
  indigo: "bg-indigo-50 text-indigo-700",
  blue: "bg-blue-50 text-blue-700",
};

export function Badge({ tone = "neutral", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function ProviderBadge({ provider, size = 40 }) {
  const p = providerByKey[provider];
  if (!p) return null;
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg font-display font-black text-white shrink-0 shadow-sm"
      style={{ background: p.accent, width: size, height: size, fontSize: size * 0.45 }}
      title={p.name}
    >
      {p.monogram}
    </span>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-semibold text-[var(--text-strong)]">{label}</span>}
      {children}
      {hint && !error && <span className="block text-xs text-[var(--text-muted)] mt-1">{hint}</span>}
      {error && <span className="block text-xs text-[var(--err)] mt-1">{error}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border-2 border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm font-semibold text-[var(--text-strong)] placeholder:text-[var(--input-placeholder)] shadow-[0_2px_0_rgba(23,21,18,0.08)] transition focus:border-[var(--brand-primary-border)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/15";

export function Input({ className = "", ...props }) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

export function Select({ className = "", children, value, onChange, ...props }) {
  const options = Children.toArray(children)
    .filter((child) => child?.type === "option")
    .map((child) => {
      const label = Children.toArray(child.props.children).join("");
      return {
        value: String(child.props.value ?? ""),
        label,
        disabled: child.props.disabled,
      };
    });

  return (
    <SearchableSelect
      {...props}
      value={value}
      onChange={(nextValue) => onChange?.({ target: { value: nextValue } })}
      className={className}
      buttonClassName="min-h-10 py-2"
      menuMinWidth={320}
      options={options.filter((option) => !option.disabled)}
    />
  );
}

export function Modal({ open, onClose, title, subtitle, children, maxWidth = "max-w-lg" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const root =
    document.getElementById("modal-root") ||
    document.querySelector('[data-app="admin"]') ||
    document.getElementById("root") ||
    document.body;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-3 text-[var(--text-strong)] sm:p-5">
      <div
        className="fixed inset-0"
        style={{
          background: "var(--modal-backdrop, rgba(15, 23, 42, 0.42))",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          transform: "translateZ(0)",
          willChange: "backdrop-filter",
        }}
        onClick={onClose}
      />
      <div
        className={`relative flex max-h-[calc(100vh-32px)] w-full ${maxWidth} flex-col overflow-hidden rounded-lg border border-[var(--stroke-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-soft)]`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--stroke-soft)] bg-[var(--surface-panel-strong)] px-4 py-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-black leading-tight text-[var(--text-strong)]">{title}</h3>
            {subtitle && <p className="mt-1 max-w-3xl text-sm font-semibold leading-5 text-[var(--text-base)]">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--stroke-soft)] bg-[var(--surface-panel)] text-[var(--text-base)] shadow-sm transition hover:border-[var(--stroke-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-strong)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/15"
            aria-label="Close"
          >
            <FiX size={22} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-160px)] overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>,
    root
  );
}

export function PageShell({ eyebrow = "Payment Console", title, description, actions, children }) {
  return (
    <section className="space-y-3">
      <div className="rounded-lg border border-[var(--stroke-soft)] bg-[var(--surface-panel)] px-3 py-2.5 shadow-[var(--shadow-card)] sm:px-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="section-kicker">{eyebrow}</p>
            <h1 className="mt-0.5 break-words font-display text-lg font-black tracking-tight text-[var(--text-strong)] sm:text-xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-0.5 max-w-3xl text-sm font-semibold text-[var(--text-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function Spinner({ className = "" }) {
  return (
    <span
      className={`inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}

export function EmptyState({ icon, title, children }) {
  return (
    <div className="px-5 py-9 text-center">
      {icon && <div className="mx-auto mb-3 text-[var(--text-muted)]">{icon}</div>}
      <p className="font-semibold text-[var(--text-strong)]">{title}</p>
      {children && <p className="text-sm text-[var(--text-base)] mt-1 max-w-sm mx-auto">{children}</p>}
    </div>
  );
}
