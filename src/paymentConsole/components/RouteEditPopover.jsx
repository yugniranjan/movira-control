// Inline editor for a single (venue, channel) route. Used by RoutingMatrix
// and VenueDetailPage's per-channel list.
//
// Backend mapping: this writes one row to location_payment_settings via
// PUT /api/payments/config/routes/venue/:locationId/:channel with:
//   { provider, mode, adapterKey, priority }
//
// Adapter is derived from (channel × provider) via the compatibility map —
// the user doesn't see the adapter_key string, they see "Nuvei (terminal)"
// vs "Nuvei (online)" when a provider has multiple adapters.

import { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiCheck, FiTrash2, FiX } from "react-icons/fi";
import { PROVIDERS, providerByKey } from "../constants/providers";
import { channelByKey } from "../constants/channels";
import { providersForChannel, adapterFor, STATUS_LABEL, STATUS_TONE } from "../constants/compatibility";
import { Badge, Button, ProviderBadge, Spinner } from "./ui";
import { resolveCredentialFor } from "../lib/paymentHealth";

const MODES = [
  { value: "live", label: "Live" },
  { value: "sandbox", label: "Sandbox" },
];

export default function RouteEditPopover({
  open,
  onClose,
  channel, // channel key
  locationId,
  currentRoute, // { provider, mode, adapterKey, priority } | null
  credentials, // full credential list (for resolved-credential preview)
  venueLabel,
  onSave, // ({ provider, mode, adapterKey }) => Promise<void>
  onClear, // () => Promise<void>
}) {
  const channelMeta = channelByKey[channel];
  const allowedProviders = providersForChannel(channel);

  const [provider, setProvider] = useState(currentRoute?.provider || "");
  const [mode, setMode] = useState(currentRoute?.mode || "live");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  // Re-seed whenever a different cell opens the popover.
  useEffect(() => {
    if (!open) return;
    setProvider(currentRoute?.provider || "");
    setMode(currentRoute?.mode || "live");
    setError("");
  }, [open, currentRoute]);

  const adapterEntry = useMemo(
    () => (provider ? adapterFor(channel, provider) : null),
    [channel, provider]
  );

  // Preview which credential would resolve at runtime. Same precedence as
  // services/payments/selectAdapter.js loadCredentials(). `source` tells the
  // UI whether this venue has its own override or is inheriting org-wide.
  const resolvedCredential = useMemo(() => {
    const cred = resolveCredentialFor({ provider, locationId, mode, credentials });
    if (!cred) return null;
    return {
      ...cred,
      source: Number(cred.locationId) === Number(locationId) ? "venue" : "org",
    };
  }, [provider, mode, locationId, credentials]);

  // A card-present (terminal) route needs more than a resolvable credential:
  // Nuvei Omni-Channel requires the in-person fields (Register ID + Auth Key)
  // ON the credential, or POS card payments fail at the till. Surface that so
  // the route doesn't read as fully-configured when it isn't (a green
  // "Resolves to …" while the in-person block is blank = false confidence).
  const terminalConfigMissing = useMemo(() => {
    if (!resolvedCredential || adapterEntry?.adapterKey !== "nuvei.terminal") return false;
    const m = resolvedCredential.masked || {};
    return !m.terminalRegisterId || !m.terminalRegisterAuthKey;
  }, [resolvedCredential, adapterEntry]);

  const canSave =
    !!provider && !!mode && !!adapterEntry && adapterEntry.status !== "phase4" && adapterEntry.status !== "phase5";

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      await onSave({
        provider,
        mode,
        adapterKey: adapterEntry.adapterKey,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setClearing(true);
    setError("");
    try {
      await onClear();
      onClose();
    } catch (err) {
      setError(err.message || "Could not clear route.");
    } finally {
      setClearing(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-[var(--surface-panel)] rounded-2xl shadow-xl border border-[var(--stroke-soft)]">
        <div className="flex items-start justify-between p-4 border-b border-[var(--stroke-soft)]">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Route
            </div>
            <div className="font-display font-bold text-[var(--text-strong)] truncate">
              {venueLabel} · {channelMeta?.label}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              Tender: {channelMeta?.tenderType} · writes to
              <code className="font-mono mx-1">location_payment_settings</code>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-strong)]"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Provider picker — only the providers compatible with this channel */}
          <div>
            <div className="text-xs font-semibold text-[var(--text-strong)] mb-1.5">Provider</div>
            <div className="space-y-1.5">
              {PROVIDERS.filter((p) => allowedProviders.includes(p.key)).map((p) => {
                const a = adapterFor(channel, p.key);
                const isSelected = provider === p.key;
                const disabled = a?.status === "phase4" || a?.status === "phase5";
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => !disabled && setProvider(p.key)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? "border-[var(--brand-primary)] bg-orange-50/60"
                        : "border-[var(--stroke-soft)] hover:border-[var(--stroke-strong)]"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <ProviderBadge provider={p.key} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-strong)]">{p.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">{a?.adapterKey}</div>
                    </div>
                    {a?.status && <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>}
                    {isSelected && <FiCheck className="text-[var(--brand-primary-deep)]" />}
                  </button>
                );
              })}
              {allowedProviders.length === 0 && (
                <div className="text-xs text-[var(--text-muted)] italic px-1">
                  No providers compatible with this channel yet.
                </div>
              )}
            </div>
          </div>

          {/* Mode picker — selects which credential row gets resolved */}
          <div>
            <div className="text-xs font-semibold text-[var(--text-strong)] mb-1.5">Mode</div>
            <div className="inline-flex p-1 rounded-lg bg-[var(--surface-muted)]">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    mode === m.value
                      ? "bg-[var(--surface-panel)] text-[var(--text-strong)] shadow-sm"
                      : "text-[var(--text-base)] hover:text-[var(--text-strong)]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">
              Backend resolves credential by (provider, location, mode), so this picks which key answers.
            </div>
          </div>

          {/* Resolved credential preview — same logic as backend's selectAdapter */}
          {provider && mode && (
            <div className="rounded-lg border border-[var(--stroke-soft)] p-3">
              <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
                Resolves to
              </div>
              {resolvedCredential ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <ProviderBadge provider={resolvedCredential.provider} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-strong)] truncate">
                        {resolvedCredential.label}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {providerByKey[resolvedCredential.provider]?.name} · {resolvedCredential.mode}
                        {" · "}
                        {resolvedCredential.source === "venue" ? "venue override" : "org-wide"}
                      </div>
                    </div>
                  </div>
                  {terminalConfigMissing && (
                    <div className="mt-2 flex items-start gap-2 text-xs text-amber-800 border-t border-[var(--stroke-soft)] pt-2">
                      <FiAlertTriangle className="mt-0.5 text-amber-600 shrink-0" />
                      <span>
                        This credential has <strong>no in-person setup</strong>. Add the Omni-Channel
                        <strong> Register ID</strong> and <strong>Register Auth Key</strong> on the Nuvei
                        gateway — without them, POS card payments will fail at the till even though this
                        route saves.
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-2 text-xs text-amber-800">
                  <FiAlertTriangle className="mt-0.5 text-amber-600" />
                  <span>
                    No credential matches <strong>{provider}</strong> · <strong>{mode}</strong> for this
                    venue or org-wide. The route can be saved but will fail at request time until a
                    credential is added.
                  </span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm font-medium p-2.5 rounded-lg bg-red-50 text-[var(--err)]">
              <FiAlertTriangle />
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-4 border-t border-[var(--stroke-soft)]">
          {currentRoute ? (
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={clearing || saving}>
              {clearing ? <Spinner /> : <FiTrash2 />}
              Remove route
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave || saving}>
              {saving ? <Spinner /> : "Save route"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
