// Venue → Terminal → Reader tree for POS card payments.
//
// A venue has many Terminals (tills / checkout stations); each Terminal has one
// or more Readers (the physical card machine — a Stripe reader or a Nuvei TID),
// one marked default for charges. Backed by:
//   GET    /payments/config/locations/:locationId/pos-tree
//   POST   /payments/config/locations/:locationId/terminals/:posDeviceId/readers
//   PATCH  /payments/config/readers/:terminalId   (rename / set default)
//   DELETE /payments/config/readers/:terminalId
//   POST   /pos/devices                           (create a Terminal/till)
//   POST   /pos/devices/:id/regenerate-pairing-code
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiCpu,
  FiPlus,
  FiStar,
  FiTrash2,
  FiCreditCard,
  FiRefreshCw,
  FiAlertTriangle,
  FiCheckCircle,
} from "react-icons/fi";
import { api } from "../api";
import { Button, Input, Spinner, Badge } from "./ui";
import { PanelShimmer } from "../../components/Shimmer";

export default function PosCardTree({ locationId }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getPosTree(locationId);
      setTree(data);
    } catch (err) {
      setError(err?.message || "Could not load terminals.");
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    load();
  }, [load]);

  const enrollment = tree?.enrollment; // "cloud-readers" (Stripe) | "tid-per-till" (Nuvei)
  const provider = tree?.provider;
  const supported = enrollment === "cloud-readers" || enrollment === "tid-per-till";

  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err?.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--stroke-soft)] bg-[var(--surface-panel)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[var(--text-strong)] font-display font-bold">
            <FiCreditCard /> Card terminals
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            Each <strong>terminal</strong> (till) has one or more <strong>card readers</strong>; one is the
            default used for charges.
            {provider && (
              <>
                {" "}
                This venue's POS routes through <strong>{provider}</strong>
                {enrollment === "tid-per-till"
                  ? " — add each reader by its Nuvei Terminal ID (TID)."
                  : enrollment === "cloud-readers"
                  ? " — readers register with the provider."
                  : ""}
              </>
            )}
          </div>
        </div>
        {!loading && !error && tree?.routed && supported ? (
          <AddTerminal locationId={locationId} busy={busy} onDone={() => load()} setError={setError} />
        ) : null}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-[var(--err)] bg-red-50 rounded-lg p-2.5">
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <PanelShimmer rows={3} className="mt-4" />
      ) : !tree?.routed ? (
        <div className="mt-4 text-sm text-amber-800 bg-amber-50 rounded-lg p-3 flex items-start gap-2">
          <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-600" />
          <span>
            POS isn't routed to a card provider for this venue yet. Route the <strong>POS</strong> channel
            first, then add terminals + readers here.
          </span>
        </div>
      ) : !supported ? (
        <div className="mt-4 text-sm text-[var(--text-muted)] italic">
          {provider || "This provider"} has no card-present support.
        </div>
      ) : (tree.terminals || []).length === 0 ? (
        <div className="mt-4 text-sm text-[var(--text-muted)] italic">
          No terminals yet. Add a terminal (till), then attach its card reader.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {tree.terminals.map((t) => (
            <TerminalRow
              key={t.posDeviceId}
              locationId={locationId}
              terminal={t}
              enrollment={enrollment}
              busy={busy}
              run={run}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddTerminal({ locationId, busy, onDone, setError }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.createTerminal({ locationId: locationId, name: name.trim() });
      setName("");
      setOpen(false);
      onDone();
    } catch (err) {
      setError(err?.message || "Could not create the terminal.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={busy}>
        <FiPlus /> Add terminal
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Terminal name (e.g. Front Desk 1)"
        autoFocus
      />
      <Button size="sm" onClick={save} disabled={saving || !name.trim()}>
        {saving ? <Spinner /> : "Create"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

function TerminalRow({ locationId, terminal, enrollment, busy, run }) {
  const readers = terminal.readers || [];
  return (
    <div className="rounded-xl border border-[var(--stroke-soft)] p-3">
      <div className="flex items-center gap-2">
        <FiCpu className="text-[var(--brand-primary-deep)]" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--text-strong)] truncate">{terminal.name}</div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Terminal #{terminal.posDeviceId}
            {terminal.pairingCode ? (
              <>
                {" · "}
                pairing code <code className="font-mono">{terminal.pairingCode}</code>
              </>
            ) : (
              " · paired"
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          title="Regenerate pairing code"
          disabled={busy}
          onClick={() => run(() => api.regenerateTerminalPairing(terminal.posDeviceId))}
        >
          <FiRefreshCw />
        </Button>
      </div>

      <div className="mt-2 pl-6 space-y-1.5">
        {readers.length === 0 ? (
          <div className="text-xs text-[var(--text-muted)] italic">No reader attached yet.</div>
        ) : (
          readers.map((r) => (
            <div key={r.terminalId} className="flex items-center gap-2 text-sm">
              <FiCreditCard className="text-[var(--text-muted)] shrink-0" />
              <span className="font-medium text-[var(--text-base)] truncate">{r.displayName}</span>
              <code className="font-mono text-[11px] text-[var(--text-muted)] truncate">
                {r.providerTerminalId}
                {r.registerId ? ` · ${r.registerId}` : ""}
              </code>
              {r.simulated && <Badge tone="blue">Simulator</Badge>}
              {r.isDefault ? (
                <Badge tone="brand">
                  <FiStar size={10} /> Default
                </Badge>
              ) : (
                <Badge tone={r.status === "online" ? "green" : "neutral"}>{r.status}</Badge>
              )}
              <div className="ml-auto flex items-center gap-1">
                {!r.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Make default"
                    disabled={busy}
                    onClick={() => run(() => api.updateReader(r.terminalId, { makeDefault: true }))}
                  >
                    <FiStar />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  title="Remove reader"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Remove reader "${r.displayName}"?`)) {
                      run(() => api.removeReaderRow(r.terminalId));
                    }
                  }}
                >
                  <FiTrash2 className="text-[var(--err)]" />
                </Button>
              </div>
            </div>
          ))
        )}
        <AddReader locationId={locationId} terminal={terminal} enrollment={enrollment} busy={busy} run={run} />
      </div>
    </div>
  );
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function AddReader({ locationId, terminal, enrollment, busy, run }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [tid, setTid] = useState("");
  const [registerId, setRegisterId] = useState("");
  const [authKey, setAuthKey] = useState("");
  const [code, setCode] = useState("");
  const isNuvei = enrollment === "tid-per-till";

  // Nuvei's provider sandbox simulator is enrolled exactly like hardware: it
  // needs the Nuvei-issued TID, Register ID and Register Auth Key. The removed
  // AeroSports emulator must not be offered as a credential-free shortcut.
  const authKeyValid = !authKey.trim() || UUID_RE.test(authKey.trim());
  const canSave = useMemo(() => {
    if (isNuvei) return tid.trim() && registerId.trim() && authKey.trim() && authKeyValid;
    return code.trim();
  }, [isNuvei, tid, registerId, authKey, authKeyValid, code]);

  async function add() {
    await run(() =>
      api.addReader({
        locationId: locationId,
        posDeviceId: terminal.posDeviceId,
        label: label.trim() || undefined,
        makeDefault: (terminal.readers || []).length === 0, // first reader = default
        deviceKind: "real",
        providerTerminalId: isNuvei && tid.trim() ? tid.trim() : undefined,
        registerId: isNuvei && registerId.trim() ? registerId.trim() : undefined,
        registerAuthKey: isNuvei ? authKey.trim() : undefined,
        registrationCode: !isNuvei && code.trim() ? code.trim() : undefined,
      })
    );
    setLabel("");
    setTid("");
    setRegisterId("");
    setAuthKey("");
    setCode("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs font-semibold text-[var(--brand-primary-deep)] inline-flex items-center gap-1 hover:underline mt-1"
        onClick={() => setOpen(true)}
        disabled={busy}
      >
        <FiPlus size={12} /> Add reader
      </button>
    );
  }
  return (
    <div className="mt-2 rounded-lg bg-[var(--surface-muted)]/60 p-2.5 space-y-2">
      <div>
        <div className="text-[11px] text-[var(--text-muted)] mt-1">
          {isNuvei
            ? "Enter Nuvei-issued TID, Register ID and Register Auth Key. The same fields are required for Nuvei's sandbox terminal simulator."
            : "Enter the Stripe reader's pairing/registration code."}
        </div>
      </div>

      <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Reader label (optional)" />

      {isNuvei && (
        <>
          <Input
            value={tid}
            onChange={(e) => setTid(e.target.value)}
            placeholder="Terminal ID (TID) — e.g. AeroSportsTerm2"
          />
          <Input
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
            placeholder="Register ID — e.g. AeroSportsReg1"
          />
          <Input
            type="password"
            value={authKey}
            onChange={(e) => setAuthKey(e.target.value)}
            placeholder="Register Auth Key (UUID) — NOT the Terminal Auth Key"
          />
          <div className="text-[11px] text-[var(--text-muted)]">
            Use the <strong>Register</strong> auth key (for the POS/register). The <strong>Terminal</strong> auth key goes in the pin-pad, not here.
          </div>
          {!authKeyValid && (
            <div className="text-[11px] text-[var(--err)]">
              Register Auth Key must be the UUID supplied by Nuvei.
            </div>
          )}
        </>
      )}

      {!isNuvei && (
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Stripe reader registration/pairing code"
        />
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={add} disabled={busy || !canSave}>
          {busy ? <Spinner /> : <><FiCheckCircle /> Add reader</>}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
