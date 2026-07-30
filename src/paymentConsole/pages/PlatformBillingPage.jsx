import { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiCheckCircle, FiCreditCard, FiPlus } from "react-icons/fi";
import { api } from "../api";
import { providerByKey } from "../constants/providers";
import { Badge, Button, Card, EmptyState, PageShell, ProviderBadge, Select, Spinner } from "../components/ui";
import AddGatewayModal from "../components/AddGatewayModal";
import { PageShimmer } from "../../components/Shimmer";

const SAAS_BILLING_PROVIDERS = new Set(["stripe", "razorpay"]);
const CURRENCY_OPTIONS = [
  { value: "", label: "Any currency" },
  { value: "CAD", label: "CAD - Canadian dollar" },
  { value: "USD", label: "USD - US dollar" },
  { value: "INR", label: "INR - Indian rupee" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British pound" },
  { value: "AUD", label: "AUD - Australian dollar" },
];

function PlatformBillingGatewayPanel({ credentials, platformGateway, onSave, saving }) {
  const [selected, setSelected] = useState("");
  const [currency, setCurrency] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState("");

  const orgCredentials = useMemo(() => {
    const seen = new Set();
    return (credentials || [])
      .filter((c) => c.locationId == null && SAAS_BILLING_PROVIDERS.has(c.provider) && c.status !== "disabled")
      .sort((a, b) => `${a.provider}:${a.mode}:${a.label || ""}`.localeCompare(`${b.provider}:${b.mode}:${b.label || ""}`))
      .filter((credential) => {
        const key = `${credential.provider}:${credential.mode}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [credentials]);

  const active = platformGateway?.active || null;
  const activeKey = active?.providerKey && active?.mode ? `${active.providerKey}:${active.mode}` : "";
  const activeCurrency = active?.currency || "";
  const activeEnabled = active ? Boolean(active.enabled) : true;

  useEffect(() => {
    const fallback = orgCredentials[0] ? `${orgCredentials[0].provider}:${orgCredentials[0].mode}` : "";
    setSelected(activeKey || fallback);
    setCurrency(activeCurrency);
    setEnabled(activeEnabled);
    setError("");
  }, [activeKey, activeCurrency, activeEnabled, orgCredentials]);

  const selectedCredential = orgCredentials.find((c) => `${c.provider}:${c.mode}` === selected) || null;
  const provider = selectedCredential ? providerByKey[selectedCredential.provider] : providerByKey[active?.providerKey];
  const ready = Boolean(active?.credential);
  const configured = Boolean(active);

  useEffect(() => {
    if (selectedCredential?.provider === "razorpay" && !currency) {
      setCurrency("INR");
    }
  }, [currency, selectedCredential?.provider]);

  async function handleSave() {
    setError("");
    if (!selectedCredential) {
      setError("Add an organization-wide Stripe or Razorpay credential first.");
      return;
    }
    try {
      await onSave({
        providerKey: selectedCredential.provider,
        adapterKey: `${selectedCredential.provider}.online`,
        mode: selectedCredential.mode,
        channel: "payment_link",
        currency: currency || null,
        enabled,
      });
    } catch (err) {
      setError(err.message || "Failed to save SaaS billing gateway.");
    }
  }

  return (
    <Card className="overflow-visible p-3 sm:p-4">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {provider ? (
            <ProviderBadge provider={provider.key} size={38} />
          ) : (
            <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-700">
              <FiCreditCard size={18} />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-black text-stone-950">Movira SaaS billing gateway</h2>
              {configured ? (
                ready ? (
                  <Badge tone="green"><FiCheckCircle size={11} /> Ready</Badge>
                ) : (
                  <Badge tone="amber"><FiAlertTriangle size={11} /> Credential missing</Badge>
                )
              ) : (
                <Badge tone="neutral">Not configured</Badge>
              )}
            </div>
            <p className="mt-0.5 max-w-3xl text-xs font-semibold text-stone-500">
              This is Movira's own collection route for SaaS invoices. Venue/guest payment gateways stay separate.
            </p>
          </div>
        </div>

        <div className="grid w-full min-w-0 gap-2 sm:grid-cols-2 xl:max-w-5xl xl:grid-cols-[minmax(240px,1fr)_minmax(180px,220px)_minmax(120px,140px)_minmax(96px,120px)]">
          <Select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={orgCredentials.length === 0}
            aria-label="Movira SaaS billing credential"
            className="min-w-0"
          >
            {orgCredentials.length === 0 ? (
              <option value="">No Movira org-wide Stripe/Razorpay credential</option>
            ) : (
              orgCredentials.map((credential) => {
                const p = providerByKey[credential.provider];
                return (
                  <option key={`${credential.provider}:${credential.mode}`} value={`${credential.provider}:${credential.mode}`}>
                    {p?.name || credential.provider} · {credential.mode} · latest Movira credential
                  </option>
                );
              })
            )}
          </Select>
          <Select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Currency"
            searchPlaceholder="Search currency..."
            className="min-w-0"
          >
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option.value || "any"} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className={`min-h-11 w-full rounded-lg border px-3 text-sm font-black transition-colors ${
              enabled
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-stone-200 bg-white text-stone-500"
            }`}
          >
            {enabled ? "Enabled" : "Disabled"}
          </button>
          <Button onClick={handleSave} disabled={saving || orgCredentials.length === 0} className="w-full min-w-0">
            {saving ? <Spinner /> : null}
            Save
          </Button>
        </div>
      </div>

      {error ? <p className="mt-3 text-xs font-semibold text-red-700">{error}</p> : null}
      {configured && !ready ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Add an organization-wide {active.providerName || active.providerKey} credential in {active.mode} mode, then Movira invoice payment links will start using it.
        </p>
      ) : null}
    </Card>
  );
}

export default function PlatformBillingPage() {
  const [credentials, setCredentials] = useState(null);
  const [platformGateway, setPlatformGateway] = useState(null);
  const [schemas, setSchemas] = useState(null);
  const [adding, setAdding] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [credsRes, gatewayRes, schemasRes] = await Promise.allSettled([
        api.getPlatformBillingCredentials(),
        api.getPlatformBillingGateway(),
        api.getPlatformBillingProviderSchemas(),
      ]);
      if (cancelled) return;
      setCredentials(credsRes.status === "fulfilled" ? credsRes.value : []);
      setPlatformGateway(gatewayRes.status === "fulfilled" ? gatewayRes.value || {} : {});
      setSchemas(schemasRes.status === "fulfilled" ? schemasRes.value || {} : {});
      const failures = [
        credsRes.status === "rejected" ? `credentials: ${credsRes.reason?.message || "failed"}` : null,
        gatewayRes.status === "rejected" ? `billing gateway: ${gatewayRes.reason?.message || "failed"}` : null,
        schemasRes.status === "rejected" ? `provider fields: ${schemasRes.reason?.message || "failed"}` : null,
      ].filter(Boolean);
      setLoadError(failures.join(" · "));
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function handleSave(payload) {
    setSaving(true);
    try {
      const saved = await api.upsertPlatformBillingGateway(payload);
      setPlatformGateway((prev) => ({
        ...(prev || {}),
        active: saved,
        gateways: [saved, ...((prev?.gateways || []).filter((g) => g.gatewayId !== saved.gatewayId))],
      }));
      setReloadKey((key) => key + 1);
    } finally {
      setSaving(false);
    }
  }

  if (!credentials) {
    return <PageShimmer />;
  }

  return (
    <PageShell
      eyebrow="Movira Collections"
      title="SaaS Billing"
      description="Add Movira-owned gateway credentials and choose how Movira collects subscription invoices from park owners."
      actions={
        <>
          <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>Refresh</Button>
          <Button onClick={() => setAdding(true)} disabled={!schemas?.stripe && !schemas?.razorpay}>
            <FiPlus /> Add Movira credential
          </Button>
        </>
      }
    >
      {loadError ? (
        <Card className="border-amber-300 bg-amber-50/60 p-4">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-amber-900">Billing gateway data did not fully load</div>
              <div className="mt-0.5 break-words text-xs text-amber-800">{loadError}</div>
            </div>
          </div>
        </Card>
      ) : null}

      <PlatformBillingGatewayPanel
        credentials={credentials}
        platformGateway={platformGateway}
        onSave={handleSave}
        saving={saving}
      />

      {credentials.filter((c) => c.locationId == null && SAAS_BILLING_PROVIDERS.has(c.provider)).length === 0 ? (
        <Card>
          <EmptyState icon={<FiCreditCard size={30} />} title="No Movira collection credential yet">
            Add a Movira-owned Stripe or Razorpay credential here. It will not be tied to any venue or location.
          </EmptyState>
        </Card>
      ) : null}

      <AddGatewayModal
        open={adding}
        onClose={() => setAdding(false)}
        schemas={schemas || {}}
        venues={[]}
        allowedProviderKeys={["stripe", "razorpay"]}
        forceScope="org"
        title="Add Movira collection credential"
        subtitle="These credentials belong to Movira and are used only to collect SaaS invoices from customers."
        createCredential={api.createPlatformBillingCredential}
        testConnection={api.testPlatformBillingConnection}
        onCreated={(created) => {
          setCredentials((list) => [created, ...(list || [])]);
          setAdding(false);
        }}
      />
    </PageShell>
  );
}
