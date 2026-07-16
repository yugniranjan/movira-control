import { Children, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FaCheckCircle,
  FaCreditCard,
  FaExclamationTriangle,
  FaGlobe,
  FaMapMarkerAlt,
  FaPlus,
  FaRedo,
  FaSave,
  FaStar,
  FaTrash,
  FaTimes,
} from "react-icons/fa";
import {
  useAddVenueReaderMutation,
  useCreatePaymentCredentialMutation,
  useCreateVenueTerminalMutation,
  useDeletePaymentCredentialMutation,
  useDeleteVenuePaymentRouteMutation,
  useDeleteVenueReaderMutation,
  useGetPaymentCompatibilityQuery,
  useGetPaymentCredentialsQuery,
  useGetPaymentProviderSchemasQuery,
  useGetVenuePaymentRoutesQuery,
  useGetVenuePosTreeQuery,
  useRegenerateVenueTerminalPairingMutation,
  useTestPaymentCredentialMutation,
  useUpdatePaymentCredentialMutation,
  useUpdateVenueReaderMutation,
  useUpsertVenuePaymentRouteMutation,
} from "../../features/saas/moviraControlApi";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import SearchableSelect from "../../components/common/SearchableSelect";

const providers = [
  { key: "stripe", name: "Stripe", short: "S", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { key: "nuvei", name: "Nuvei", short: "N", color: "bg-red-50 text-red-700 border-red-200" },
  { key: "razorpay", name: "Razorpay", short: "R", color: "bg-sky-50 text-sky-700 border-sky-200" },
];

const providerMap = Object.fromEntries(providers.map((provider) => [provider.key, provider]));

const channels = [
  { key: "online_booking", label: "Online booking", detail: "Customer booking portal checkout.", capability: "online" },
  { key: "payment_link", label: "Payment links", detail: "Admin-sent payment requests.", capability: "online" },
  { key: "kiosk", label: "Kiosk", detail: "Self-serve on-site checkout.", capability: "online" },
  { key: "pos", label: "POS / card terminal", detail: "Cashier card-present payments.", capability: "terminal" },
  { key: "recurring", label: "Recurring memberships", detail: "Card-on-file billing.", capability: "recurring" },
];

const fallbackCompatibility = {
  online_booking: {
    stripe: { adapterKey: "stripe.online", status: "live" },
    nuvei: { adapterKey: "nuvei.online", status: "live" },
  },
  payment_link: {
    stripe: { adapterKey: "stripe.online", status: "live" },
    nuvei: { adapterKey: "nuvei.online", status: "live" },
  },
  kiosk: {
    stripe: { adapterKey: "stripe.online", status: "live" },
    nuvei: { adapterKey: "nuvei.online", status: "live" },
  },
  pos: {
    stripe: { adapterKey: "stripe.terminal", status: "beta" },
    nuvei: { adapterKey: "nuvei.terminalCloud", status: "beta" },
  },
  recurring: {
    stripe: { adapterKey: "stripe.online", status: "live" },
    nuvei: { adapterKey: "nuvei.online", status: "live" },
  },
};

function Badge({ children, tone = "stone" }) {
  const tones = {
    stone: "border-stone-200 bg-stone-50 text-stone-600",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black uppercase ${tones[tone] || tones.stone}`}>
      {children}
    </span>
  );
}

function ProviderMark({ provider, size = "md" }) {
  const item = providerMap[provider] || { short: "?", name: provider, color: "bg-stone-50 text-stone-700 border-stone-200" };
  const sizes = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <span className={`grid shrink-0 place-items-center rounded-lg border font-black ${sizes} ${item.color}`}>
      {item.short}
    </span>
  );
}

function resolveCredential({ provider, locationId, mode, credentials }) {
  if (!provider || !mode) return null;
  return (
    credentials.find((item) => item.provider === provider && Number(item.locationId) === Number(locationId) && item.mode === mode) ||
    credentials.find((item) => item.provider === provider && item.locationId == null && item.mode === mode) ||
    null
  );
}

function Input({ className = "", ...props }) {
  return <input className={`input-nexus w-full px-3 py-2.5 text-sm ${className}`} {...props} />;
}

function Select({ className = "", value, onChange, children, ...props }) {
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
      options={options.filter((option) => !option.disabled)}
    />
  );
}

function Field({ label, children, hint, error }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-stone-500">{label}</span>
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 text-xs font-semibold text-stone-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs font-bold text-red-600">{error}</p> : null}
    </label>
  );
}

function Modal({ title, subtitle, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "var(--modal-backdrop, rgba(15, 23, 42, 0.42))" }}
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg border border-[var(--stroke-soft)] bg-[var(--surface-panel)] text-[var(--text-strong)] shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--stroke-soft)] bg-[var(--surface-panel-strong)] p-5">
          <div>
            <h3 className="text-xl font-black text-[var(--text-strong)]">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm font-semibold text-[var(--text-base)]">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--stroke-soft)] bg-[var(--surface-panel)] text-[var(--text-base)] shadow-sm transition hover:border-[var(--stroke-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-strong)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/15"
          >
            <FaTimes />
          </button>
        </div>
        <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function AddGatewayModal({ park, schemas, onClose }) {
  const [provider, setProvider] = useState("stripe");
  const [mode, setMode] = useState("sandbox");
  const [label, setLabel] = useState("");
  const [values, setValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [createCredential, createState] = useCreatePaymentCredentialMutation();
  const [testCredential, testState] = useTestPaymentCredentialMutation();
  const schema = schemas?.[provider];
  const fields = schema?.fields || [];

  function setField(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
    setTestResult(null);
  }

  function validate() {
    const errors = {};
    fields.forEach((field) => {
      if (field.type !== "select" && field.required !== false && !String(values[field.key] || "").trim()) {
        errors[field.key] = "Required.";
      }
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function runTest() {
    if (!validate()) return;
    try {
      const result = await testCredential({ provider, values }).unwrap();
      setTestResult(result?.data || result);
    } catch (err) {
      toast.error(err?.data?.message || "Connection test failed.");
    }
  }

  async function save() {
    if (!validate()) return;
    try {
      await createCredential({
        provider,
        mode,
        label: label.trim() || `${providerMap[provider]?.name || provider} - ${park.name}`,
        values,
        locationId: park.locationId,
      }).unwrap();
      toast.success("Gateway added.");
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to add gateway.");
    }
  }

  return (
    <Modal title="Add park gateway" subtitle="Credentials are saved against this park only." onClose={onClose}>
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          {providers.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setProvider(item.key);
                setValues({});
                setFieldErrors({});
                setTestResult(null);
              }}
              className={`rounded-xl border p-4 text-left transition ${provider === item.key ? "border-orange-300 bg-orange-50" : "border-stone-200 bg-white hover:bg-stone-50"}`}
            >
              <ProviderMark provider={item.key} />
              <p className="mt-3 font-black text-stone-950">{item.name}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Display label">
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder={`${providerMap[provider]?.name || provider} - ${park.name}`} />
          </Field>
          <Field label="Mode">
            <Select value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="sandbox">Sandbox</option>
              <option value="live">Live</option>
            </Select>
          </Field>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm font-semibold text-orange-800">
          <FaMapMarkerAlt className="mr-2 inline" />
          Scope: {park.name}. This will not become an organization-wide gateway.
        </div>

        {fields.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <Field key={field.key} label={field.required === false ? `${field.label} (optional)` : field.label} hint={field.hint} error={fieldErrors[field.key]}>
                {field.type === "select" ? (
                  <Select value={values[field.key] || field.default || ""} onChange={(event) => setField(field.key, event.target.value)}>
                    {(field.options || []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    type={field.secret ? "password" : "text"}
                    value={values[field.key] || ""}
                    onChange={(event) => setField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    autoComplete="off"
                  />
                )}
              </Field>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            Provider schema could not be loaded.
          </div>
        )}

        {testResult ? (
          <div className={`rounded-xl border p-3 text-sm font-bold ${testResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {testResult.message || (testResult.ok ? "Connection test passed." : "Connection test failed.")}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 pt-4">
          <button type="button" onClick={runTest} disabled={testState.isLoading || !fields.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-black text-stone-700 disabled:opacity-50">
            {testState.isLoading ? "Testing..." : "Test connection"}
          </button>
          <button type="button" onClick={save} disabled={createState.isLoading || !fields.length} className="btn-nexus inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-black disabled:opacity-50">
            <FaSave /> {createState.isLoading ? "Saving..." : "Save gateway"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RouteModal({ park, channel, currentRoute, credentials, compatibility, onClose }) {
  const available = compatibility[channel.key] || {};
  const providerKeys = Object.keys(available);
  const [provider, setProvider] = useState(currentRoute?.provider || providerKeys[0] || "");
  const [mode, setMode] = useState(currentRoute?.mode || "sandbox");
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const selectedAdapter = available[provider];
  const resolved = resolveCredential({ provider, mode, locationId: park.locationId, credentials });
  const [upsertRoute, upsertState] = useUpsertVenuePaymentRouteMutation();
  const [deleteRoute, deleteState] = useDeleteVenuePaymentRouteMutation();

  async function save() {
    if (!provider || !selectedAdapter?.adapterKey) return;
    try {
      await upsertRoute({
        locationId: park.locationId,
        channel: channel.key,
        provider,
        mode,
        adapterKey: selectedAdapter.adapterKey,
        priority: 100,
      }).unwrap();
      toast.success("Route saved.");
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save route.");
    }
  }

  async function clear(event) {
    if (event?.type && event.type !== "confirm") return;
    try {
      await deleteRoute({ locationId: park.locationId, channel: channel.key }).unwrap();
      toast.success("Route removed.");
      setClearConfirmOpen(false);
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to remove route.");
    }
  }

  return (
    <Modal title={`Configure ${channel.label}`} subtitle="Select the gateway and mode this channel should use." onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {providerKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setProvider(key)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${provider === key ? "border-orange-300 bg-orange-50" : "border-stone-200 hover:bg-stone-50"}`}
            >
              <ProviderMark provider={key} />
              <div>
                <p className="font-black text-stone-950">{providerMap[key]?.name || key}</p>
                <p className="text-xs font-semibold text-stone-500">{available[key]?.adapterKey}</p>
              </div>
              <Badge tone={available[key]?.status === "live" ? "green" : "blue"}>{available[key]?.status || "available"}</Badge>
            </button>
          ))}
        </div>

        <Field label="Mode">
          <Select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="sandbox">Sandbox</option>
            <option value="live">Live</option>
          </Select>
        </Field>

        <div className={`rounded-xl border p-4 ${resolved ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <p className={`text-sm font-black ${resolved ? "text-emerald-800" : "text-amber-800"}`}>
            {resolved ? `Resolves to ${resolved.label}` : "No matching credential found"}
          </p>
          <p className="mt-1 text-xs font-semibold text-stone-600">
            {resolved
              ? `${providerMap[resolved.provider]?.name || resolved.provider} · ${resolved.mode} · ${Number(resolved.locationId) === Number(park.locationId) ? "park gateway" : "organization gateway"}`
              : `Add a ${provider || "provider"} ${mode} credential before this route can process payments.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-4">
          {currentRoute ? (
            <button type="button" onClick={() => setClearConfirmOpen(true)} disabled={deleteState.isLoading} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-700">
              <FaTrash /> Remove route
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={save} disabled={!provider || upsertState.isLoading} className="btn-nexus inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-black disabled:opacity-50">
            <FaSave /> Save route
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={clearConfirmOpen}
        tone="danger"
        eyebrow="Remove payment route"
        title={`Remove ${channel.label} route?`}
        message="This channel will stop using its configured gateway until another route is saved."
        details={[
          "Checkout or POS flows that depend on this channel may stop accepting payments.",
          "Gateway credentials are not deleted.",
        ]}
        confirmLabel="Remove route"
        loading={deleteState.isLoading}
        onConfirm={clear}
        onClose={() => setClearConfirmOpen(false)}
      />
    </Modal>
  );
}

function EditGatewayModal({ credential, onClose }) {
  const [form, setForm] = useState({
    label: credential.label || "",
    mode: credential.mode || "sandbox",
    status: credential.status || "active",
  });
  const [updateCredential, updateState] = useUpdatePaymentCredentialMutation();

  async function save() {
    try {
      await updateCredential({ credentialId: credential.credentialId, ...form }).unwrap();
      toast.success("Gateway updated.");
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update gateway.");
    }
  }

  return (
    <Modal title="Edit gateway" subtitle="Update the operational settings for this credential." onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
          <ProviderMark provider={credential.provider} />
          <div>
            <p className="font-black text-stone-950">{providerMap[credential.provider]?.name || credential.provider}</p>
            <p className="text-xs font-semibold text-stone-500">Credential #{credential.credentialId}</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Display label">
            <Input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
          </Field>
          <Field label="Mode">
            <Select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}>
              <option value="sandbox">Sandbox</option>
              <option value="live">Live</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </Select>
          </Field>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          Secret key rotation is intentionally kept out of this quick edit panel. Add a new gateway or use the dedicated rotation flow when changing live keys.
        </div>
        <div className="flex justify-end border-t border-stone-200 pt-4">
          <button type="button" onClick={save} disabled={updateState.isLoading || !form.label.trim()} className="btn-nexus inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-black disabled:opacity-50">
            <FaSave /> Save gateway
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PosTree({ park }) {
  const { data: tree = {}, isLoading, isError } = useGetVenuePosTreeQuery(park.locationId);
  const [terminalName, setTerminalName] = useState("");
  const [readerDraft, setReaderDraft] = useState({});
  const [removeReaderTarget, setRemoveReaderTarget] = useState(null);
  const [createTerminal, createTerminalState] = useCreateVenueTerminalMutation();
  const [regeneratePairing] = useRegenerateVenueTerminalPairingMutation();
  const [addReader] = useAddVenueReaderMutation();
  const [updateReader] = useUpdateVenueReaderMutation();
  const [deleteReader, deleteReaderState] = useDeleteVenueReaderMutation();

  async function createTill() {
    if (!terminalName.trim()) return;
    try {
      await createTerminal({ locationId: park.locationId, name: terminalName.trim() }).unwrap();
      setTerminalName("");
      toast.success("Terminal created.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to create terminal.");
    }
  }

  async function createReader(terminal) {
    const draft = readerDraft[terminal.posDeviceId] || {};
    try {
      await addReader({
        locationId: park.locationId,
        posDeviceId: terminal.posDeviceId,
        label: draft.label || undefined,
        makeDefault: (terminal.readers || []).length === 0,
        deviceKind: draft.deviceKind || "simulator",
        providerTerminalId: draft.providerTerminalId || undefined,
        registerId: draft.registerId || undefined,
        registerAuthKey: draft.registerAuthKey || undefined,
        registrationCode: draft.registrationCode || undefined,
      }).unwrap();
      setReaderDraft((current) => ({ ...current, [terminal.posDeviceId]: {} }));
      toast.success("Reader added.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to add reader.");
    }
  }

  async function removeReader(event) {
    if (!removeReaderTarget || event?.type !== "confirm") return;
    try {
      await deleteReader({
        terminalId: removeReaderTarget.reader.terminalId,
        locationId: park.locationId,
      }).unwrap();
      toast.success("Reader removed.");
      setRemoveReaderTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to remove reader.");
    }
  }

  const terminals = tree.terminals || [];
  const routed = Boolean(tree.routed);

  return (
    <>
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-orange-700">Card terminals</p>
          <h3 className="mt-1 break-words text-lg font-black text-stone-950">Tills and card readers</h3>
          <p className="mt-1 text-sm font-semibold text-stone-500">POS readers are available after the POS channel is routed.</p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:min-w-[280px] sm:flex-row">
          <Input value={terminalName} onChange={(event) => setTerminalName(event.target.value)} placeholder="Terminal name" />
          <button type="button" onClick={createTill} disabled={createTerminalState.isLoading || !terminalName.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-black text-stone-700 disabled:opacity-50">
            <FaPlus /> Add
          </button>
        </div>
      </div>

      {isLoading ? <p className="mt-4 text-sm font-bold text-stone-500">Loading terminals...</p> : null}
      {isError ? <p className="mt-4 text-sm font-bold text-red-600">Terminals could not be loaded.</p> : null}
      {!isLoading && !routed ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
          Route the POS / card terminal channel first, then attach card readers.
        </div>
      ) : null}
      {!isLoading && routed && terminals.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm font-bold text-stone-500">No terminals yet.</p>
      ) : null}

      <div className="mt-4 space-y-3">
        {terminals.map((terminal) => {
          const draft = readerDraft[terminal.posDeviceId] || {};
          return (
            <div key={terminal.posDeviceId} className="rounded-xl border border-stone-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-black text-stone-950">{terminal.name}</p>
                  <p className="text-xs font-semibold text-stone-500">
                    Terminal #{terminal.posDeviceId}
                    {terminal.pairingCode ? ` · pairing ${terminal.pairingCode}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await regeneratePairing(terminal.posDeviceId).unwrap();
                    toast.success("Pairing code regenerated.");
                  }}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-black text-stone-700"
                >
                  <FaRedo /> Pairing
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {(terminal.readers || []).map((reader) => (
                  <div key={reader.terminalId} className="flex flex-wrap items-center gap-2 rounded-lg bg-stone-50 p-2">
                    <FaCreditCard className="text-orange-700" />
                    <span className="font-bold text-stone-800">{reader.displayName}</span>
                    <code className="text-xs font-semibold text-stone-500">{reader.providerTerminalId || "simulated"}</code>
                    {reader.isDefault ? <Badge tone="orange"><FaStar /> Default</Badge> : null}
                    <div className="ml-auto flex gap-1">
                      {!reader.isDefault ? (
                        <button
                          type="button"
                          onClick={() => updateReader({ terminalId: reader.terminalId, locationId: park.locationId, makeDefault: true })}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-black text-stone-700"
                        >
                          Default
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setRemoveReaderTarget({ terminal, reader })}
                        className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-black text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {routed ? (
                <div className="mt-3 grid gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 md:grid-cols-5">
                  <Select value={draft.deviceKind || "simulator"} onChange={(event) => setReaderDraft((current) => ({ ...current, [terminal.posDeviceId]: { ...draft, deviceKind: event.target.value } }))}>
                    <option value="simulator">Simulator</option>
                    <option value="real">Real device</option>
                  </Select>
                  <Input value={draft.label || ""} onChange={(event) => setReaderDraft((current) => ({ ...current, [terminal.posDeviceId]: { ...draft, label: event.target.value } }))} placeholder="Reader label" />
                  <Input value={draft.providerTerminalId || ""} onChange={(event) => setReaderDraft((current) => ({ ...current, [terminal.posDeviceId]: { ...draft, providerTerminalId: event.target.value } }))} placeholder="TID / reader id" />
                  <Input value={draft.registrationCode || ""} onChange={(event) => setReaderDraft((current) => ({ ...current, [terminal.posDeviceId]: { ...draft, registrationCode: event.target.value } }))} placeholder="Stripe code" />
                  <button type="button" onClick={() => createReader(terminal)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-black text-stone-700">
                    <FaPlus /> Reader
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
    <ConfirmDialog
      open={Boolean(removeReaderTarget)}
      tone="danger"
      eyebrow="Remove card reader"
      title={removeReaderTarget ? `Remove ${removeReaderTarget.reader.displayName}?` : "Remove reader?"}
      message="This reader will be detached from the terminal and can no longer be used for POS payments until added again."
      details={[
        removeReaderTarget ? `Terminal: ${removeReaderTarget.terminal.name}` : "Selected terminal reader.",
        "Use this only when the hardware reader should no longer accept payments for this park.",
      ]}
      confirmLabel="Remove reader"
      loading={deleteReaderState.isLoading}
      onConfirm={removeReader}
      onClose={() => setRemoveReaderTarget(null)}
    />
    </>
  );
}

export default function ParkPaymentConsole({ park }) {
  const locationId = park.locationId || park.id;
  const scopedPark = { ...park, locationId };
  const [addGatewayOpen, setAddGatewayOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState(null);
  const [routeEditing, setRouteEditing] = useState(null);
  const [deleteGatewayTarget, setDeleteGatewayTarget] = useState(null);
  const { data: schemas = {}, isLoading: schemasLoading } = useGetPaymentProviderSchemasQuery();
  const { data: compatibilityData = {} } = useGetPaymentCompatibilityQuery();
  const { data: credentials = [], isLoading: credentialsLoading } = useGetPaymentCredentialsQuery();
  const { data: routes = {}, isLoading: routesLoading } = useGetVenuePaymentRoutesQuery(locationId);
  const [deleteCredential] = useDeletePaymentCredentialMutation();
  const compatibility = Object.keys(compatibilityData || {}).length ? compatibilityData : fallbackCompatibility;

  const parkCredentials = useMemo(
    () => credentials.filter((credential) => Number(credential.locationId) === Number(locationId)),
    [credentials, locationId]
  );
  const inheritedCredentials = useMemo(
    () => credentials.filter((credential) => credential.locationId == null),
    [credentials]
  );
  const configuredChannels = channels.filter((channel) => routes[channel.key]).length;
  const unresolvedChannels = channels.filter((channel) => {
    const route = routes[channel.key];
    return route && !resolveCredential({ provider: route.provider, mode: route.mode, locationId, credentials });
  });

  async function removeCredential(credential) {
    try {
      await deleteCredential(credential.credentialId).unwrap();
      toast.success("Gateway deleted.");
      setDeleteGatewayTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete gateway.");
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-orange-700">Guest payment console</p>
            <h3 className="mt-1 text-lg font-black text-stone-950">Gateway credentials and payment routes</h3>
            <p className="mt-1 text-sm font-semibold text-stone-500">
              Payment Console features scoped to {park.name}. Routes write to this park's payment settings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={unresolvedChannels.length ? "red" : configuredChannels ? "green" : "stone"}>
              {configuredChannels}/{channels.length} routes
            </Badge>
            <button type="button" onClick={() => setAddGatewayOpen(true)} className="btn-nexus inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-black">
              <FaPlus /> Add gateway
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-stone-500">Park gateways</p>
              <h3 className="mt-1 text-lg font-black text-stone-950">Credentials</h3>
            </div>
            {credentialsLoading || schemasLoading ? <Badge>Loading</Badge> : null}
          </div>

          <div className="mt-4 divide-y divide-stone-100">
            {parkCredentials.map((credential) => (
              <div key={credential.credentialId} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ProviderMark provider={credential.provider} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-black text-stone-950">{credential.label}</p>
                      <Badge tone={credential.mode === "live" ? "green" : "orange"}>{credential.mode}</Badge>
                      {credential.status === "disabled" ? <Badge>disabled</Badge> : null}
                    </div>
                    <p className="text-xs font-semibold text-stone-500">{providerMap[credential.provider]?.name || credential.provider} · park-specific</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditingGateway(credential)} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-black text-stone-700 hover:bg-stone-50">
                    Edit
                  </button>
                  <button type="button" onClick={() => setDeleteGatewayTarget(credential)} className="grid h-9 w-9 place-items-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50">
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
            {!parkCredentials.length ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm font-bold text-stone-500">
                No park-specific gateway yet. This park can still inherit organization gateways.
              </div>
            ) : null}
          </div>
        </section>

        <aside className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-stone-500">Inherited gateways</p>
          <div className="mt-3 space-y-2">
            {inheritedCredentials.map((credential) => (
              <div key={credential.credentialId} className="flex items-center gap-2 rounded-lg bg-stone-50 p-2">
                <ProviderMark provider={credential.provider} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-stone-900">{credential.label}</p>
                  <p className="text-xs font-semibold text-stone-500">{credential.mode} · org-wide</p>
                </div>
                <FaGlobe className="ml-auto text-stone-400" />
              </div>
            ))}
            {!inheritedCredentials.length ? <p className="text-sm font-bold text-stone-500">No organization gateway configured.</p> : null}
          </div>
        </aside>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-orange-700">Channel routing</p>
            <h3 className="mt-1 text-lg font-black text-stone-950">Where each payment channel sends money</h3>
          </div>
          {routesLoading ? <Badge>Loading routes</Badge> : null}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {channels.map((channel) => {
            const route = routes[channel.key];
            const resolved = route ? resolveCredential({ provider: route.provider, mode: route.mode, locationId, credentials }) : null;
            return (
              <button key={channel.key} type="button" onClick={() => setRouteEditing(channel)} className="rounded-xl border border-stone-200 p-4 text-left transition hover:border-orange-200 hover:bg-orange-50/40">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-orange-50 text-orange-700">
                    {route ? <ProviderMark provider={route.provider} size="sm" /> : <FaCreditCard />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-stone-950">{channel.label}</p>
                      {route ? <Badge tone={resolved ? "green" : "red"}>{resolved ? "configured" : "missing credential"}</Badge> : <Badge>not configured</Badge>}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-stone-500">{channel.detail}</p>
                    {route ? (
                      <p className="mt-2 text-xs font-bold text-stone-600">
                        {providerMap[route.provider]?.name || route.provider} · {route.mode} · {route.adapterKey}
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {unresolvedChannels.length ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            <FaExclamationTriangle className="mr-2 inline" />
            {unresolvedChannels.length} route{unresolvedChannels.length === 1 ? "" : "s"} will fail until matching credentials are added.
          </div>
        ) : null}
      </section>

      <PosTree park={scopedPark} />

      {addGatewayOpen ? <AddGatewayModal park={scopedPark} schemas={schemas} onClose={() => setAddGatewayOpen(false)} /> : null}
      {editingGateway ? <EditGatewayModal credential={editingGateway} onClose={() => setEditingGateway(null)} /> : null}
      {routeEditing ? (
        <RouteModal
          park={scopedPark}
          channel={routeEditing}
          currentRoute={routes[routeEditing.key]}
          credentials={credentials}
          compatibility={compatibility}
          onClose={() => setRouteEditing(null)}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(deleteGatewayTarget)}
        tone="danger"
        eyebrow="Delete gateway"
        title={deleteGatewayTarget ? `Delete ${deleteGatewayTarget.label}?` : "Delete gateway?"}
        message="This gateway credential will be removed from the payment console."
        details={[
          "Routes using this gateway may stop processing payments.",
          "Inherited organization gateways are not affected.",
        ]}
        confirmLabel="Delete gateway"
        onConfirm={({ type }) => {
          if (type === "confirm") removeCredential(deleteGatewayTarget);
        }}
        onClose={() => setDeleteGatewayTarget(null)}
      />
    </div>
  );
}
