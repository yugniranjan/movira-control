import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiAlertCircle, FiExternalLink, FiGlobe, FiMapPin } from "react-icons/fi";
import { PROVIDERS, providerByKey } from "../constants/providers";
import { Modal, Button, Field, Input, Select, Spinner, ProviderBadge } from "./ui";
import { api } from "../api";
import TestConnectionResult from "./TestConnectionResult";

function initialValues(schema) {
  const v = {};
  for (const f of schema.fields) v[f.key] = f.default ?? "";
  return v;
}

// Per-field client-side validation. Mirrors providerFields.validateValues
// on the backend — running it here too means the user gets immediate
// inline feedback instead of a 400 round-trip. Exported for reuse by
// EditGatewayModal during rotation.
export function validateField(field, value, { mode } = {}) {
  // Trim surrounding whitespace — copy-paste from a wiki / browser
  // dev-tools / Stripe dashboard often picks up a trailing newline.
  // Backend also trims at validation time (providerFields.validateValues).
  const trimmed = value == null ? "" : String(value).trim();
  const isEmpty = trimmed === "";
  const isRequired = field.required !== false;
  if (isEmpty) {
    if (isRequired) return { ok: false, message: "Required." };
    return { ok: true };
  }
  if (field.validate?.pattern) {
    const re = new RegExp(field.validate.pattern);
    if (!re.test(trimmed)) {
      return { ok: false, message: field.validate.message || "Invalid format." };
    }
    if (field.validate.modeAware && mode) {
      const expected = mode === "live" ? "live_" : "test_";
      const ok =
        trimmed.startsWith(`pk_${expected}`) ||
        trimmed.startsWith(`sk_${expected}`) ||
        trimmed.startsWith(`rzp_${expected}`) ||
        trimmed.startsWith(`whsec_`); // webhook secrets aren't mode-prefixed
      if (!ok) {
        return {
          ok: false,
          message:
            mode === "live"
              ? "Looks like a sandbox/test key — switch Mode to Sandbox or paste a live key."
              : "Looks like a live key — switch Mode to Live or paste a test key.",
        };
      }
    }
  }
  return { ok: true };
}

export function validateAll(schema, values, ctx) {
  const errors = {};
  for (const field of schema.fields) {
    if (field.type === "select") continue;
    const res = validateField(field, values[field.key], ctx);
    if (!res.ok) errors[field.key] = res.message;
  }
  return { ok: Object.keys(errors).length === 0, fieldErrors: errors };
}

/**
 * AddGatewayModal
 *
 * Props:
 *   - venues          (optional) — full venue list. Required when scope=venue.
 *                                  PaymentsPage loads it once; VenueDetailPage
 *                                  can pass [thisVenue] when it pre-locks the
 *                                  picker.
 *   - defaultLocationId (optional) — when set, the modal opens with scope locked
 *                                    to that venue (used from VenueDetailPage).
 */
export default function AddGatewayModal({
  open,
  onClose,
  schemas,
  onCreated,
  venues = [],
  defaultLocationId = null,
}) {
  const [provider, setProvider] = useState(null);
  const [label, setLabel] = useState("");
  // "sandbox" / "live" — the values selectAdapter looks up. The legacy
  // "test" alias is gone here; the backend still accepts it transparently
  // for any old client.
  const [mode, setMode] = useState("sandbox");
  const [scope, setScope] = useState("org"); // 'org' | 'venue'
  const [locationId, setLocationId] = useState(null);
  const [values, setValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [test, setTest] = useState(null); // { ok, message } | null
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const schema = provider ? schemas?.[provider] : null;
  const scopeLocked = defaultLocationId != null;

  // Seed scope from props every time the modal opens.
  useEffect(() => {
    if (!open) return;
    if (defaultLocationId != null) {
      setScope("venue");
      setLocationId(Number(defaultLocationId));
    } else {
      setScope("org");
      setLocationId(null);
    }
  }, [open, defaultLocationId]);

  // Live field-level validation against the schema. Re-runs when values
  // or mode change so format errors clear as the user types.
  const liveValidation = useMemo(() => {
    if (!schema) return { ok: false, fieldErrors: {} };
    return validateAll(schema, values, { mode });
  }, [schema, values, mode]);

  const requiredFilled = useMemo(() => {
    if (!schema) return false;
    const fieldsOk = schema.fields.every((f) => f.type === "select" || values[f.key]);
    const scopeOk = scope === "org" || locationId != null;
    return fieldsOk && scopeOk && liveValidation.ok;
  }, [schema, values, scope, locationId, liveValidation]);

  function reset() {
    setProvider(null);
    setLabel("");
    setMode("sandbox");
    setScope(defaultLocationId != null ? "venue" : "org");
    setLocationId(defaultLocationId != null ? Number(defaultLocationId) : null);
    setValues({});
    setFieldErrors({});
    setTest(null);
    setError("");
  }

  function close() {
    reset();
    onClose();
  }

  function pickProvider(key) {
    setProvider(key);
    setValues(initialValues(schemas[key]));
    setLabel(`${providerByKey[key].name} — `);
    setTest(null);
    setError("");
  }

  function setField(key, val) {
    setValues((v) => ({ ...v, [key]: val }));
    setTest(null);
  }

  function pickScope(nextScope) {
    if (scopeLocked) return;
    setScope(nextScope);
    if (nextScope === "org") setLocationId(null);
  }

  async function runTest() {
    setTesting(true);
    setTest(null);
    try {
      const res = await api.testConnection({ provider, values });
      setTest(res);
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    setError("");
    // Final client-side check — surface any errors inline before round-tripping
    // to the backend. Same regex/pattern the backend validates against.
    const check = validateAll(schema, values, { mode });
    if (!check.ok) {
      setFieldErrors(check.fieldErrors);
      setError("Please correct the highlighted fields.");
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      const created = await api.createCredential({
        provider,
        label,
        mode,
        values,
        locationId: scope === "venue" ? locationId : null,
      });
      onCreated(created);
      close();
    } catch (err) {
      // If backend returns 400 with detail.invalid, surface each field's
      // message inline. Backend sends `{key, label, message}` per entry —
      // map by `key` to match the form's input names.
      if (err?.status === 400 && Array.isArray(err?.detail?.invalid)) {
        const next = {};
        for (const item of err.detail.invalid) {
          const fieldKey = item.key || item.field;
          if (fieldKey) next[fieldKey] = item.message || "Invalid value.";
        }
        setFieldErrors(next);
      }
      setError(err.message || "Could not save gateway.");
    } finally {
      setSaving(false);
    }
  }

  const selectedVenue = venues.find((v) => Number(v.locationId) === Number(locationId));

  return (
    <Modal
      open={open}
      onClose={close}
      title={provider ? `Connect ${providerByKey[provider].name}` : "Add a payment gateway"}
      subtitle={
        provider
          ? "Enter the credentials from your gateway dashboard. Secrets are encrypted at rest."
          : "Pick the provider you want to connect."
      }
    >
      {!provider ? (
        <div className="grid sm:grid-cols-1 gap-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.key}
              onClick={() => pickProvider(p.key)}
              className="flex items-center gap-4 text-left p-4 rounded-xl border border-[var(--stroke-soft)] hover:border-[var(--brand-primary)] hover:bg-orange-50/40 transition-colors"
            >
              <ProviderBadge provider={p.key} size={44} />
              <div className="min-w-0">
                <div className="font-semibold text-[var(--text-strong)]">{p.name}</div>
                <div className="text-sm text-[var(--text-base)]">{p.blurb}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-muted)]">
            <ProviderBadge provider={provider} size={36} />
            <div className="flex-1">
              <div className="font-semibold text-[var(--text-strong)]">{providerByKey[provider].name}</div>
              <a
                href={schema.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--brand-primary-deep)] inline-flex items-center gap-1 hover:underline"
              >
                Where do I find these? <FiExternalLink size={11} />
              </a>
            </div>
            <button onClick={reset} className="text-sm font-semibold text-[var(--text-base)] hover:text-[var(--text-strong)]">
              Change
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Display label">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. North America" />
            </Field>
            <Field label="Mode" hint="Sandbox uses the provider's test environment; Live moves real money.">
              <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="sandbox">Sandbox</option>
                <option value="live">Live</option>
              </Select>
            </Field>
          </div>

          <Field
            label="Scope"
            hint={
              scope === "org"
                ? "This gateway is the default for every venue."
                : scopeLocked
                ? "Only this venue uses these credentials."
                : "Only the selected venue uses these credentials. Other venues keep the org default."
            }
          >
            <div className="flex flex-col gap-2.5">
              {/* Segmented pill control — tighter than two large cards */}
              <div
                role="tablist"
                className="inline-flex p-1 rounded-lg bg-[var(--surface-muted)] self-start"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={scope === "org"}
                  onClick={() => pickScope("org")}
                  disabled={scopeLocked}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                    scope === "org"
                      ? "bg-[var(--surface-panel)] text-[var(--text-strong)] shadow-sm"
                      : "text-[var(--text-base)] hover:text-[var(--text-strong)]"
                  } ${scopeLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <FiGlobe size={14} /> Organization-wide
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={scope === "venue"}
                  onClick={() => pickScope("venue")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                    scope === "venue"
                      ? "bg-[var(--surface-panel)] text-[var(--text-strong)] shadow-sm"
                      : "text-[var(--text-base)] hover:text-[var(--text-strong)]"
                  }`}
                >
                  <FiMapPin size={14} /> Specific venue
                </button>
              </div>

              {scope === "venue" && (
                scopeLocked && selectedVenue ? (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50/60 border border-[var(--brand-primary)]/30 text-sm self-start">
                    <FiMapPin className="text-[var(--brand-primary-deep)]" />
                    <span className="font-semibold text-[var(--text-strong)]">{selectedVenue.name}</span>
                    {selectedVenue.city && (
                      <span className="text-[var(--text-muted)]">· {selectedVenue.city}</span>
                    )}
                  </div>
                ) : (
                  <Select
                    value={locationId ?? ""}
                    onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Pick a venue…</option>
                    {venues.map((v) => (
                      <option key={v.locationId} value={v.locationId}>
                        {v.name}
                        {v.city ? ` · ${v.city}` : ""}
                      </option>
                    ))}
                  </Select>
                )
              )}
            </div>
          </Field>

          {schema.fields.map((f) => {
            // Only show errors AFTER the user has typed something into the
            // field — silent until they engage so the form doesn't yell
            // before they've started.
            const hasValue = values[f.key] != null && values[f.key] !== "";
            const liveError = hasValue ? liveValidation.fieldErrors[f.key] : null;
            // After the first submit attempt we expose all errors so they
            // can see what's blocking the save button.
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
                  placeholder={f.placeholder}
                  autoComplete="off"
                  className={showError ? "border-[var(--err)]" : undefined}
                />
              )}
            </Field>
            );
          })}

          {test && <TestConnectionResult result={test} />}

          {error && (
            <div className="flex items-center gap-2 text-sm font-medium p-3 rounded-lg bg-red-50 text-[var(--err)]">
              <FiAlertCircle />
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="outline" onClick={runTest} disabled={!requiredFilled || testing}>
              {testing ? <Spinner /> : "Test connection"}
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button onClick={save} disabled={!requiredFilled || saving}>
                {saving ? <Spinner /> : "Save gateway"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
