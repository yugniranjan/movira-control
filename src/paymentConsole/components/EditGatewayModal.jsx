import { useEffect, useMemo, useState } from "react";
import {
  FiTrash2,
  FiExternalLink,
  FiGlobe,
  FiMapPin,
  FiClock,
  FiChevronDown,
  FiChevronRight,
  FiAlertTriangle,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import { providerByKey } from "../constants/providers";
import { Modal, Button, Field, Input, Select, Spinner, ProviderBadge, Badge } from "./ui";
import { api } from "../api";
import { validateAll } from "./AddGatewayModal";
import TestConnectionResult from "./TestConnectionResult";

const ACTION_TONE = {
  created: "indigo",
  updated: "neutral",
  rotated: "amber",
  deleted: "red",
};

function formatAuditTimestamp(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// Render one diff entry. Secret fields show "Rotated", non-secret show the new value.
function AuditChange({ field, value }) {
  if (value && typeof value === "object" && value.rotated === true) {
    return (
      <span className="text-xs">
        <span className="text-[var(--text-muted)]">{field}</span>{" "}
        <span className="font-semibold text-amber-700">rotated</span>
      </span>
    );
  }
  const display = value == null ? "—" : String(value);
  return (
    <span className="text-xs">
      <span className="text-[var(--text-muted)]">{field}</span>{" "}
      <span className="font-mono text-[var(--text-base)] break-all">{display}</span>
    </span>
  );
}

export default function EditGatewayModal({ open, onClose, credential, schema, onUpdated, onDeleted, venues = [] }) {
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState("sandbox");
  const [status, setStatus] = useState("active");
  const [rotating, setRotating] = useState(false);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  // Audit log state — lazy-loaded on first expand so the modal opens
  // instantly even for credentials with long histories.
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [auditRows, setAuditRows] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

  // Inline validation + Test connection during rotation. Same shape the
  // AddGatewayModal uses, so the UX is identical between create + rotate.
  const [fieldErrors, setFieldErrors] = useState({});
  const [test, setTest] = useState(null);
  const [testing, setTesting] = useState(false);

  // Re-run field validation on every keystroke while in rotate mode.
  const liveValidation = useMemo(() => {
    if (!rotating || !schema) return { ok: true, fieldErrors: {} };
    return validateAll(schema, values, { mode });
  }, [rotating, schema, values, mode]);

  // Re-seed form whenever a different credential is opened.
  useEffect(() => {
    if (!credential) return;
    setLabel(credential.label || "");
    // Backend canonicalizes legacy "test" → "sandbox"; surface as "sandbox" here too.
    setMode(credential.mode === "test" ? "sandbox" : credential.mode || "sandbox");
    setStatus(credential.status || "active");
    setRotating(false);
    setConfirmDelete(false);
    setError("");
    // Reset audit state — it's per-credential and lazy-loaded.
    setAuditExpanded(false);
    setAuditRows(null);
    setAuditError("");
    // Clear inline validation + test state.
    setFieldErrors({});
    setTest(null);
    // Pre-fill non-secret fields from the masked view; secrets stay blank.
    const seed = {};
    if (schema) {
      for (const f of schema.fields) {
        seed[f.key] = f.secret ? "" : credential.masked?.[f.key] ?? f.default ?? "";
      }
    }
    setValues(seed);
  }, [credential, schema]);

  // Lazy-load audit log the first time the section is expanded. Reloads
  // if a save/rotate just happened (auditRows reset to null in onUpdated
  // → useEffect re-runs because credential identity changes).
  useEffect(() => {
    if (!auditExpanded || auditRows != null || !credential?.credentialId) return;
    let cancelled = false;
    setAuditLoading(true);
    setAuditError("");
    (async () => {
      try {
        const rows = await api.getCredentialAuditLog(credential.credentialId);
        if (cancelled) return;
        setAuditRows(rows || []);
      } catch (err) {
        if (cancelled) return;
        setAuditError(err?.message || "Could not load audit log.");
        setAuditRows([]);
      } finally {
        if (!cancelled) setAuditLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auditExpanded, auditRows, credential]);

  // When rotating, the new values must pass the SAME validation the backend
  // applies — required fields present + valid format. OPTIONAL fields (e.g.
  // Nuvei's in-person Omni-Channel block) may be left blank, so we reuse
  // validateAll (which honors required:false) instead of demanding every field.
  // (Previously this required every field, so an online-only venue couldn't
  // rotate without inventing in-person values.)
  const rotateReady = liveValidation.ok;

  if (!credential) return null;
  const provider = providerByKey[credential.provider];
  const scopedVenue =
    credential.locationId != null
      ? venues.find((v) => Number(v.locationId) === Number(credential.locationId))
      : null;
  const isOrgWide = credential.locationId == null;

  function setField(key, val) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function save() {
    setError("");
    // Re-validate the new values when rotating; label/mode/status changes
    // don't need field-level checks.
    if (rotating && schema) {
      const check = validateAll(schema, values, { mode });
      if (!check.ok) {
        setFieldErrors(check.fieldErrors);
        setError("Please correct the highlighted fields.");
        return;
      }
      setFieldErrors({});
    }
    setSaving(true);
    try {
      const payload = { label, mode, status };
      if (rotating) payload.values = values;
      const updated = await api.updateCredential(credential.credentialId, payload);
      onUpdated(updated);
      onClose();
    } catch (err) {
      // Surface backend field-level errors inline (same shape as Add).
      // Map by `item.key` so the message attaches to the right input.
      if (err?.status === 400 && Array.isArray(err?.detail?.invalid)) {
        const next = {};
        for (const item of err.detail.invalid) {
          const fieldKey = item.key || item.field;
          if (fieldKey) next[fieldKey] = item.message || "Invalid value.";
        }
        setFieldErrors(next);
      }
      setError(err.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  // Test connection during rotation. Same backend handler the Add modal uses.
  async function runTest() {
    setTesting(true);
    setTest(null);
    try {
      const res = await api.testConnection({ provider: credential.provider, values });
      setTest(res);
    } catch (err) {
      setTest({ ok: false, message: err?.message || "Test failed." });
    } finally {
      setTesting(false);
    }
  }

  async function remove() {
    setDeleting(true);
    setError("");
    try {
      await api.deleteCredential(credential.credentialId);
      onDeleted(credential.credentialId);
      onClose();
    } catch (err) {
      setError(err.message || "Could not delete gateway.");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${provider?.name || "gateway"}`}
      subtitle="Update settings, rotate credentials, or remove this gateway."
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-muted)]">
          <ProviderBadge provider={credential.provider} size={36} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[var(--text-strong)]">{provider?.name}</div>
            {schema?.docsUrl && (
              <a
                href={schema.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--brand-primary-deep)] inline-flex items-center gap-1 hover:underline"
              >
                Gateway dashboard <FiExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        {/* Scope is part of the row's identity — display only, not editable.
            To change scope, delete this row and create a new one. */}
        <div className="flex items-center gap-2 text-xs">
          {isOrgWide ? (
            <FiGlobe className="text-[var(--brand-primary-deep)]" />
          ) : (
            <FiMapPin className="text-[var(--brand-primary-deep)]" />
          )}
          <span className="text-[var(--text-muted)] font-semibold uppercase tracking-wide">Scope:</span>
          <span className="font-semibold text-[var(--text-strong)] truncate">
            {isOrgWide
              ? "Organization-wide"
              : scopedVenue
              ? `${scopedVenue.name}${scopedVenue.city ? ` · ${scopedVenue.city}` : ""}`
              : `Venue #${credential.locationId}`}
          </span>
          <Badge tone={isOrgWide ? "indigo" : "brand"} className="ml-auto">
            {isOrgWide ? "Org default" : "Venue override"}
          </Badge>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Display label">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field
            label="Mode"
            hint="Sandbox uses the provider's test environment; Live moves real money."
          >
            <Select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="sandbox">Sandbox</option>
              <option value="live">Live</option>
            </Select>
          </Field>
        </div>

        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </Select>
        </Field>

        {/* Non-secret values are shown for reference; secrets are write-only. */}
        {!rotating ? (
          <div className="rounded-xl border border-[var(--stroke-soft)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text-strong)]">Credentials</div>
                <div className="text-xs text-[var(--text-muted)]">Secrets are hidden. Rotate to replace them.</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setRotating(true)}>
                Replace credentials
              </Button>
            </div>
            <dl className="mt-3 space-y-1">
              {schema?.fields.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-[var(--text-muted)]">{f.label}</dt>
                  <dd className="font-mono text-[var(--text-base)] truncate max-w-[55%]">
                    {credential.masked?.[f.key] || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--brand-primary)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[var(--text-strong)]">Replace credentials</div>
              <button
                onClick={() => setRotating(false)}
                className="text-xs font-semibold text-[var(--text-base)] hover:text-[var(--text-strong)]"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Enter all fields to rotate the credentials.</p>
            {schema?.fields.map((f) => {
              const hasValue = values[f.key] != null && values[f.key] !== "";
              const liveError = hasValue ? liveValidation.fieldErrors[f.key] : null;
              const submitAttemptedError = fieldErrors[f.key];
              const showError = submitAttemptedError || liveError;
              return (
                <Field
                  key={f.key}
                  label={f.required === false ? `${f.label} (optional)` : f.label}
                  hint={f.hint}
                  error={showError}
                >
                  {f.type === "select" ? (
                    <Select value={values[f.key]} onChange={(e) => setField(f.key, e.target.value)}>
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={f.secret ? "password" : "text"}
                      value={values[f.key]}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.secret ? "Enter new value" : f.placeholder}
                      autoComplete="off"
                      className={showError ? "border-[var(--err)]" : undefined}
                    />
                  )}
                </Field>
              );
            })}

            {/* Test connection during rotation — same backend handler the Add
                modal uses. Hits the provider's API with the values you've
                typed so you can verify before committing. */}
            {test && <TestConnectionResult result={test} dense />}
            <Button
              variant="outline"
              size="sm"
              onClick={runTest}
              disabled={!liveValidation.ok || testing}
            >
              {testing ? <Spinner /> : "Test connection"}
            </Button>
          </div>
        )}

        {error && (
          <div className="text-sm font-medium text-[var(--err)] bg-red-50 rounded-lg p-3">{error}</div>
        )}

        {/* Audit log — lazy-loaded on expand. Super-admin only on the
            backend; the 403 message flows through to the panel here. */}
        <div className="rounded-xl border border-[var(--stroke-soft)]">
          <button
            type="button"
            onClick={() => setAuditExpanded((v) => !v)}
            className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-[var(--surface-muted)]/50 rounded-xl"
          >
            <span className="flex items-center gap-2">
              <FiClock className="text-[var(--text-muted)]" />
              <span className="text-sm font-semibold text-[var(--text-strong)]">Audit log</span>
              <span className="text-xs text-[var(--text-muted)]">
                {auditRows == null
                  ? "Who changed what, when"
                  : `${auditRows.length} ${auditRows.length === 1 ? "entry" : "entries"}`}
              </span>
            </span>
            {auditExpanded ? (
              <FiChevronDown className="text-[var(--text-muted)]" />
            ) : (
              <FiChevronRight className="text-[var(--text-muted)]" />
            )}
          </button>
          {auditExpanded && (
            <div className="px-3 pb-3 border-t border-[var(--stroke-soft)]">
              {auditLoading && (
                <div className="flex items-center justify-center py-6 text-[var(--text-muted)]">
                  <Spinner />
                </div>
              )}
              {!auditLoading && auditError && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 text-amber-800">
                  <FiAlertTriangle className="mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <div className="font-semibold">Could not load audit log</div>
                    <div className="mt-0.5 break-words">{auditError}</div>
                    {/^403\b|access required|forbidden/i.test(auditError) && (
                      <div className="mt-1 italic">
                        Audit log requires super-admin access.
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!auditLoading && !auditError && auditRows && auditRows.length === 0 && (
                <div className="text-xs text-[var(--text-muted)] py-4 text-center italic">
                  No history yet. Changes to this gateway will appear here.
                </div>
              )}
              {!auditLoading && !auditError && auditRows && auditRows.length > 0 && (
                <ul className="mt-3 space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {auditRows.map((row) => (
                    <li
                      key={row.auditId}
                      className="rounded-lg bg-[var(--surface-muted)]/40 p-2.5"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone={ACTION_TONE[row.action] || "neutral"}>{row.action}</Badge>
                        <span className="text-xs font-semibold text-[var(--text-strong)] truncate">
                          {row.actorEmail || row.actorRole || `user #${row.actorUserId || "?"}`}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] ml-auto whitespace-nowrap">
                          {formatAuditTimestamp(row.createdAt)}
                        </span>
                      </div>
                      {row.changes && Object.keys(row.changes).length > 0 && (
                        <div className="mt-1.5 flex flex-col gap-0.5">
                          {Object.entries(row.changes).map(([field, value]) => (
                            <AuditChange key={field} field={field} value={value} />
                          ))}
                        </div>
                      )}
                      {row.metadata?.ip && (
                        <div className="text-[10px] text-[var(--text-muted)] mt-1.5">
                          from {row.metadata.ip}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-base)]">Delete?</span>
              <Button variant="danger" size="sm" onClick={remove} disabled={deleting}>
                {deleting ? <Spinner /> : "Confirm"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                No
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-[var(--err)]">
              <FiTrash2 /> Delete
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !rotateReady}>
              {saving ? <Spinner /> : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
