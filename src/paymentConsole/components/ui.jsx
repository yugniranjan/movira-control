import { createPortal } from "react-dom";
import { Children, useEffect } from "react";
import { FiX } from "react-icons/fi";
import { providerByKey } from "../constants/providers";
import SearchableSelect from "../../components/common/SearchableSelect";

export function Button({ variant = "primary", size = "md", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 font-black rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-primary)]";
  const sizes = {
    sm: "text-xs min-h-9 px-3 py-1.5",
    md: "text-sm min-h-10 px-4 py-2",
    lg: "text-base min-h-11 px-5 py-2.5",
  };
  const variants = {
    primary: "btn-nexus",
    secondary: "border border-stone-200 bg-white text-stone-700 shadow-sm hover:bg-stone-50",
    outline: "border border-stone-300 bg-white text-stone-800 shadow-sm hover:border-orange-300 hover:bg-orange-50",
    ghost: "border border-transparent text-stone-700 hover:bg-stone-100",
    danger: "border border-red-200 bg-red-50 text-red-700 shadow-sm hover:bg-red-100",
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", children }) {
  return (
    <div
      className={`bg-white border border-stone-200 rounded-lg shadow-[0_8px_20px_rgba(38,25,12,0.06)] ${className}`}
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
      {label && <span className="block text-sm font-semibold text-[var(--text-strong)] mb-1.5">{label}</span>}
      {children}
      {hint && !error && <span className="block text-xs text-[var(--text-muted)] mt-1">{hint}</span>}
      {error && <span className="block text-xs text-[var(--err)] mt-1">{error}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border-2 border-[#d6c8b8] bg-white px-3 py-2.5 text-sm font-semibold text-stone-950 placeholder:text-stone-400 shadow-[0_2px_0_rgba(23,21,18,0.08)] focus:outline-none focus:border-stone-950 focus:ring-4 focus:ring-orange-500/15";

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
      buttonClassName="min-h-11 py-2.5"
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4 text-stone-950 sm:p-8"
      style={{
        "--surface-panel": "#ffffff",
        "--surface-muted": "#fffaf2",
        "--stroke-soft": "#e4d8c9",
        "--text-strong": "#111111",
        "--text-base": "#3f3a34",
        "--text-muted": "#6c6257",
        "--brand-primary": "#ff6a13",
        "--brand-primary-deep": "#c2410c",
        "--err": "#b91c1c",
      }}
    >
      <div
        className="fixed inset-0"
        style={{
          backgroundColor: "rgba(255, 250, 242, 0.34)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          transform: "translateZ(0)",
          willChange: "backdrop-filter",
        }}
        onClick={onClose}
      />
      <div
        className={`relative flex max-h-[calc(100vh-48px)] w-full ${maxWidth} flex-col overflow-hidden rounded-lg border border-[#d6c8b8] bg-white shadow-[0_18px_50px_rgba(38,25,12,0.18)]`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 bg-[#fffaf2] px-5 py-4">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-black leading-tight text-stone-950">{title}</h3>
            {subtitle && <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-stone-600">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-stone-200 bg-white text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus:ring-4 focus:ring-orange-500/15"
            aria-label="Close"
          >
            <FiX size={22} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-190px)] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    root
  );
}

export function PageShell({ eyebrow = "Payment Console", title, description, actions, children }) {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(38,25,12,0.06)] sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="section-kicker">{eyebrow}</p>
            <h1 className="mt-1 truncate font-display text-2xl font-black tracking-tight text-stone-950">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 max-w-3xl text-sm font-semibold text-stone-500">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
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
    <div className="text-center py-12 px-6">
      {icon && <div className="mx-auto mb-3 text-[var(--text-muted)]">{icon}</div>}
      <p className="font-semibold text-[var(--text-strong)]">{title}</p>
      {children && <p className="text-sm text-[var(--text-base)] mt-1 max-w-sm mx-auto">{children}</p>}
    </div>
  );
}
