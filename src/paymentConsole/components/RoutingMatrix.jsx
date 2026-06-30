// Routing matrix: every venue × every channel, with the resolved gateway in
// each cell and inline editing via RouteEditPopover.
//
// Each row is one location_payment_settings configuration. There's no
// "organization default" row — backend doesn't have one. To set up a new
// venue: open the cell, pick a provider+mode.
//
// Phase 4/5 channel columns are visually present but locked so users see
// the full landscape without being able to misconfigure something that
// won't fire yet.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiAlertTriangle,
  FiChevronRight,
  FiCornerDownRight,
  FiLock,
  FiMapPin,
  FiPlus,
} from "react-icons/fi";
import { CHANNELS, AVAILABILITY_TONE, isChannelEditable } from "../constants/channels";
import { providerByKey } from "../constants/providers";
import { Badge, ProviderBadge } from "./ui";
import RouteEditPopover from "./RouteEditPopover";
import { resolveCredentialFor } from "../lib/paymentHealth";

function RouteCell({ venue, channel, route, credentials, onClick }) {
  const editable = isChannelEditable(channel.key);
  if (!editable) {
    return (
      <div className="px-2 py-2 text-xs text-[var(--text-muted)] flex items-center gap-1">
        <FiLock size={11} /> Locked
      </div>
    );
  }
  if (!route) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left px-2 py-2 rounded-md border border-dashed border-[var(--stroke-soft)] hover:border-[var(--brand-primary)] hover:bg-orange-50/40 text-xs text-[var(--text-muted)] flex items-center gap-1.5 transition-colors"
      >
        <FiPlus size={11} /> Add route
      </button>
    );
  }

  const cred = resolveCredentialFor({
    provider: route.provider,
    locationId: venue.locationId,
    mode: route.mode,
    credentials,
  });
  const providerMeta = providerByKey[route.provider];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-2 py-2 rounded-md hover:bg-[var(--surface-muted)] transition-colors group"
    >
      <div className="flex items-center gap-2 min-w-0">
        <ProviderBadge provider={route.provider} size={22} />
        <div className="min-w-0 flex-1">
          {cred ? (
            <>
              <div className="text-xs font-semibold text-[var(--text-strong)] truncate">{cred.label}</div>
              <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                {Number(cred.locationId) === Number(venue.locationId) ? (
                  <span className="text-[var(--brand-primary-deep)] font-semibold">venue</span>
                ) : (
                  <span className="inline-flex items-center gap-0.5">
                    <FiCornerDownRight size={10} /> org
                  </span>
                )}
                <span>· {route.mode}</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold text-[var(--text-strong)] truncate">
                {providerMeta?.name || route.provider}
              </div>
              <div className="text-[10px] text-amber-700 flex items-center gap-1">
                <FiAlertTriangle size={10} /> no credential
              </div>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

export default function RoutingMatrix({
  venues,
  credentials,
  venueRoutes, // { [locationId]: { [channel]: route } }
  onUpsertRoute, // ({ locationId, channel, provider, mode, adapterKey }) => Promise<void>
  onDeleteRoute, // ({ locationId, channel }) => Promise<void>
}) {
  const [editing, setEditing] = useState(null); // { venue, channel }

  const channels = CHANNELS;

  const venueLabel = (v) => v.name;

  function openEditor(venue, channel) {
    if (!isChannelEditable(channel.key)) return;
    setEditing({ venue, channel });
  }

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full border-separate border-spacing-0 min-w-[900px]">
        <thead>
          <tr>
            <th className="sticky left-0 bg-[var(--surface-panel)] text-left align-bottom pb-3 pr-4 z-10 border-b border-[var(--stroke-soft)]">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Venue
              </span>
            </th>
            {channels.map((c) => (
              <th
                key={c.key}
                className="text-left align-bottom pb-3 pr-3 border-b border-[var(--stroke-soft)] min-w-[180px]"
              >
                <div className="flex items-center gap-1.5">
                  <div className="text-xs font-semibold text-[var(--text-strong)]">{c.label}</div>
                  {c.availability !== "live" && (
                    <Badge tone={AVAILABILITY_TONE[c.availability]}>{c.phaseNote || c.availability}</Badge>
                  )}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-normal mt-0.5">
                  tender: {c.tenderType}
                </div>
              </th>
            ))}
            <th className="border-b border-[var(--stroke-soft)] pb-3" />
          </tr>
        </thead>
        <tbody>
          {venues.map((v) => (
            <tr key={v.locationId} className="hover:bg-[var(--surface-muted)]/30">
              <td className="sticky left-0 bg-[var(--surface-panel)] align-middle py-3 pr-4 border-b border-[var(--stroke-soft)] z-10">
                <div className="flex items-center gap-2 min-w-[180px]">
                  <FiMapPin className="text-[var(--brand-primary-deep)]" />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-strong)]">{v.name}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {[v.city, v.country].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
              </td>
              {channels.map((c) => {
                const route = venueRoutes[v.locationId]?.[c.key] || null;
                return (
                  <td key={c.key} className="py-2 pr-2 border-b border-[var(--stroke-soft)] align-middle">
                    <RouteCell
                      venue={v}
                      channel={c}
                      route={route}
                      credentials={credentials}
                      onClick={() => openEditor(v, c)}
                    />
                  </td>
                );
              })}
              <td className="border-b border-[var(--stroke-soft)] align-middle pr-1">
                <Link
                  to={`/payment-console/venues/${v.locationId}`}
                  className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--brand-primary-deep)] hover:underline whitespace-nowrap"
                >
                  Detail <FiChevronRight size={12} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <RouteEditPopover
          open
          channel={editing.channel.key}
          locationId={editing.venue.locationId}
          currentRoute={venueRoutes[editing.venue.locationId]?.[editing.channel.key] || null}
          credentials={credentials}
          venueLabel={venueLabel(editing.venue)}
          onSave={async (input) => {
            await onUpsertRoute({
              locationId: editing.venue.locationId,
              channel: editing.channel.key,
              ...input,
            });
          }}
          onClear={async () => {
            await onDeleteRoute({
              locationId: editing.venue.locationId,
              channel: editing.channel.key,
            });
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
