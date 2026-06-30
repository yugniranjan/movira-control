// Renders the response from POST /api/payments/config/test-connection.
//
// Backend shape (services/payments/testConnection.js):
//   {
//     ok:      boolean,          // false only when a hard check failed
//     level:   "ok"|"warning"|"fail",
//     message: string,           // one-line headline
//     checks:  [
//       { name, level: "ok"|"warning"|"fail", message }
//     ],
//   }
//
// Old shape (pre-three-tier): { ok, message }. We render that too —
// `checks` is optional and an absent `level` is inferred from `ok`.
//
// The headline banner picks a tone from the overall `level`:
//   ok       → green   (everything passed)
//   warning  → amber   (credential authenticates, but a soft check failed)
//   fail     → red     (hard failure — credential won't work)
//
// Below the banner we list each individual check so the user can see
// which ones are warnings vs which are okay. A common case: Stripe key
// authenticates ✓, but no webhook endpoint is registered on this
// BASE_URL → overall warning, user sees the auth ✓ + webhook ⚠️.

import { FiAlertCircle, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";

const TONE = {
  ok:      { wrap: "bg-green-50 text-green-700",     icon: FiCheckCircle  },
  warning: { wrap: "bg-amber-50 text-amber-800",     icon: FiAlertTriangle},
  fail:    { wrap: "bg-red-50 text-red-700",         icon: FiAlertCircle  },
};

const INLINE_TONE = {
  ok:      "text-green-700",
  warning: "text-amber-700",
  fail:    "text-red-700",
};

const INLINE_ICON = {
  ok:      FiCheckCircle,
  warning: FiAlertTriangle,
  fail:    FiAlertCircle,
};

function inferLevel(result) {
  if (result.level) return result.level;
  return result.ok ? "ok" : "fail";
}

// Generate a SHORT headline summary based on the per-check breakdown.
// When there's only one check, we use its message verbatim (the whole
// result is just that one line). When there are multiple, we summarise
// by count so the headline doesn't visually duplicate any specific
// check's text — the per-check list below carries the details.
function headlineFor(level, checks, fallback) {
  if (checks.length <= 1) return fallback || "";
  const fails = checks.filter((c) => (c.level || (c.ok ? "ok" : "fail")) === "fail").length;
  const warns = checks.filter((c) => c.level === "warning").length;
  const total = checks.length;
  if (level === "fail") {
    return fails === 1
      ? "Connection failed — 1 hard error found below."
      : `Connection failed — ${fails} hard errors found below.`;
  }
  if (level === "warning") {
    return warns === 1
      ? "Credential authenticates, but 1 check needs attention."
      : `Credential authenticates, but ${warns} checks need attention.`;
  }
  return `All ${total} checks passed.`;
}

export default function TestConnectionResult({ result, dense = false }) {
  if (!result) return null;
  const level = inferLevel(result);
  const tone = TONE[level] || TONE.fail;
  const HeaderIcon = tone.icon;
  const checks = Array.isArray(result.checks) ? result.checks : [];
  const headline = headlineFor(level, checks, result.message);

  return (
    <div className={`flex flex-col gap-1.5 rounded-lg p-3 ${tone.wrap}`}>
      <div className={`flex items-start gap-2 ${dense ? "text-xs" : "text-sm"} font-semibold`}>
        <HeaderIcon className="mt-0.5 shrink-0" />
        <span className="flex-1 break-words">{headline || "(no message)"}</span>
      </div>
      {checks.length > 1 && (
        // Always show the per-check breakdown when there's more than one
        // probe — even on full success — so the user can see exactly what
        // was verified (account match, webhook endpoint, etc.).
        <ul className="mt-1 space-y-1 pl-6">
          {checks.map((c, i) => {
            const lvl = c.level || (c.ok ? "ok" : "fail");
            const Icon = INLINE_ICON[lvl] || FiAlertCircle;
            return (
              <li
                key={`${c.name || i}`}
                className={`flex items-start gap-1.5 text-xs ${INLINE_TONE[lvl] || "text-[var(--text-base)]"}`}
              >
                <Icon size={12} className="mt-0.5 shrink-0" />
                <span className="break-words break-all">{c.message}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
