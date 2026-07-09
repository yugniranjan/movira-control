import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiAlertCircle, FiExternalLink, FiGlobe, FiMapPin } from "react-icons/fi";
import { PROVIDERS, providerByKey } from "../constants/providers";
import { Modal, Button, Field, Input, Select, Spinner, ProviderBadge } from "./ui";
import { api } from "../api";
import TestConnectionResult from "./TestConnectionResult";
import { validateAll } from "./gatewayValidation";

function initialValues(schema) {
  const v = {};
  for (const f of schema.fields) v[f.key] = f.default ?? "";
  return v;
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
  allowedProviderKeys = null,
  forceScope = null,
  title = null,
  subtitle = null,
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
  const scopeLocked = defaultLocationId != null || forceScope === "org";
  const providerOptions = useMemo(
    () =>
      allowedProviderKeys?.length
        ? PROVIDERS.filter((p) => allowedProviderKeys.includes(p.key))
        : PROVIDERS,
    [allowedProviderKeys]
  );

  // Seed scope from props every time the modal opens.
  useEffect(() => {
    if (!open) return;
    if (forceScope === "org") {
      setScope("org");
      setLocationId(null);
    } else if (defaultLocationId != null) {
      setScope("venue");
      setLocationId(Number(defaultLocationId));
    } else {
      setScope("org");
      setLocationId(null);
    }
  }, [open, defaultLocationId, forceScope]);

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
    setScope(forceScope === "org" ? "org" : defaultLocationId != null ? "venue" : "org");
    setLocationId(forceScope === "org" ? null : defaultLocationId != null ? Number(defaultLocationId) : null);
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
      maxWidth="max-w-2xl"
      title={provider ? `Connect ${providerByKey[provider].name}` : title || "Add a payment gateway"}
      subtitle={
        provider
          ? subtitle || "Enter the credentials from your gateway dashboard. Secrets are encrypted at rest."
          : subtitle || "Pick the provider you want to connect."
      }
    >
      {!provider ? (
        <div className="space-y-3">
          {providerOptions.map((p) => (
            <button
              key={p.key}
              onClick={() => pickProvider(p.key)}
              className="group flex w-full items-center gap-4 rounded-lg border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-orange-300 hover:bg-orange-50/60 focus:outline-none focus:ring-4 focus:ring-orange-500/15"
            >
              <ProviderBadge provider={p.key} size={44} />
              <div className="min-w-0">
                <div className="font-display text-base font-black text-stone-950">{p.name}</div>
                <div className="mt-0.5 text-sm font-semibold leading-6 text-stone-600">{p.blurb}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-orange-100 bg-orange-50/60 p-3">
            <ProviderBadge provider={provider} size={36} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-black text-stone-950">{providerByKey[provider].name}</div>
              <a
                href={schema.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 hover:underline"
              >
                Where do I find these? <FiExternalLink size={11} />
              </a>
            </div>
            <button onClick={reset} className="text-sm font-black text-stone-600 hover:text-stone-950">
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

          {forceScope === "org" ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-stone-700">
              <span className="inline-flex items-center gap-1.5">
                <FiGlobe size={14} className="text-orange-700" />
                Movira-owned credential. It is not tied to any venue or location.
              </span>
            </div>
          ) : (
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
          )}

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
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
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
