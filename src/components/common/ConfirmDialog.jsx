import { FaExclamationTriangle, FaInfoCircle, FaTimes, FaTrash } from "react-icons/fa";

const toneMap = {
  danger: {
    icon: FaTrash,
    iconWrap: "bg-red-50 text-red-700",
    eyebrow: "text-red-600",
    confirm: "border border-red-600 bg-red-600 text-white hover:bg-red-700",
  },
  warning: {
    icon: FaExclamationTriangle,
    iconWrap: "bg-amber-50 text-amber-700",
    eyebrow: "text-amber-700",
    confirm: "border border-orange-600 bg-orange-600 text-white hover:bg-orange-700",
  },
  info: {
    icon: FaInfoCircle,
    iconWrap: "bg-blue-50 text-blue-700",
    eyebrow: "text-blue-700",
    confirm: "btn-nexus",
  },
};

export default function ConfirmDialog({
  open,
  tone = "warning",
  eyebrow = "Please confirm",
  title,
  message,
  details = [],
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  confirmText,
  confirmValue,
  requireConfirmTextForPrimary = Boolean(confirmText),
  extraActions = [],
  children,
  onConfirm,
  onClose,
  loading = false,
  confirmDisabled = false,
}) {
  if (!open) return null;

  const config = toneMap[tone] || toneMap.warning;
  const Icon = config.icon;
  const canConfirm = !confirmText || !requireConfirmTextForPrimary || confirmValue === confirmText;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/45 px-4 py-6 backdrop-blur-[2px]" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4 border-b border-stone-200 p-5">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${config.iconWrap}`}>
            <Icon />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-black uppercase tracking-[0.18em] ${config.eyebrow}`}>{eyebrow}</p>
            <h3 className="mt-1 text-xl font-black leading-tight text-stone-950">{title}</h3>
            {message ? <p className="mt-2 text-sm font-semibold leading-6 text-stone-600 whitespace-pre-line">{message}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {details.length ? (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <ul className="space-y-2 text-sm font-semibold text-stone-600">
                {details.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {children ? <div>{children}</div> : null}

          {confirmText ? (
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">Type {confirmText} to confirm</span>
              <input
                value={confirmValue || ""}
                onChange={(event) => onConfirm?.({ type: "input", value: event.target.value })}
                placeholder={confirmText}
                className="input-nexus mt-2 w-full px-3 py-2.5 text-sm"
              />
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50"
          >
            {cancelLabel}
          </button>
          {extraActions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={action.disabled || action.loading}
              onClick={action.onClick}
              className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 ${
                action.tone === "danger"
                  ? "border border-red-600 bg-red-600 text-white hover:bg-red-700"
                  : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              {action.loading ? "Working..." : action.label}
            </button>
          ))}
          <button
            type="button"
            disabled={!canConfirm || loading || confirmDisabled}
            onClick={() => onConfirm?.({ type: "confirm" })}
            className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 ${config.confirm}`}
          >
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
