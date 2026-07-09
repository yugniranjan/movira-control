export const THEME_STORAGE_KEY = "movira-theme-preference";

// ─────────────────────────────────────────────────────────────────────
// Theme catalog
//
// Two base themes (per design-pos-theme-system.md):
//   - "light"  → POS Bright   (counter staff: cashier, host)
//   - "dark"   → Admin Glass  (managers, admins, back-office)
//
// "lagoon" / "sunset" / "sprout" are kept as legacy IDs for users
// who already chose them; they will eventually be reclassified as
// brand skins on top of the bright base.
//
// Aliases — `pos-bright` and `admin-glass` map to `light` / `dark` so
// new code (and the design-doc examples) can use the canonical names
// without breaking the existing CSS attribute selectors.
// ─────────────────────────────────────────────────────────────────────

export const themeOptions = [
  {
    id: "dark",
    label: "Night Jump",
    shortLabel: "Dark",
    swatch: "linear-gradient(135deg, var(--surface-panel), var(--brand-primary))",
    canonical: "admin-glass",
  },
  {
    id: "light",
    label: "Day Pass",
    shortLabel: "Bright",
    swatch: "linear-gradient(135deg, #F8FBFF, #F45B0A)",
    canonical: "pos-bright",
  },
  {
    id: "lagoon",
    label: "Lagoon",
    shortLabel: "Lagoon",
    swatch: "linear-gradient(135deg, var(--surface-panel), var(--brand-secondary))",
  },
  {
    id: "sunset",
    label: "Sunset",
    shortLabel: "Sunset",
    swatch: "linear-gradient(135deg, #FFF7ED, #F97316)",
  },
  {
    id: "sprout",
    label: "Sprout",
    shortLabel: "Sprout",
    swatch: "linear-gradient(135deg, #F0FDF4, #22C55E)",
  },
];

const fallbackTheme = "dark";
const themeIds = new Set(themeOptions.map((theme) => theme.id));

// Aliases — accept canonical names and resolve to existing theme IDs.
const themeAliases = {
  "pos-bright": "light",
  "admin-glass": "dark",
};

export const normalizeTheme = (theme) => {
  if (!theme) return fallbackTheme;
  if (themeIds.has(theme)) return theme;
  if (themeAliases[theme]) return themeAliases[theme];
  return fallbackTheme;
};

// ─── Role-aware default ────────────────────────────────────────────────
// Counter staff (cashiers, hosts, front-desk) get the bright theme by
// default for high-contrast under bright location lighting. Managers and
// admins get the glass theme — better for long sessions in dim offices.
//
// Roles considered "counter" if their lowercased name contains any of
// these substrings. Conservative — only matches obvious counter roles.
const COUNTER_ROLE_KEYWORDS = ["cashier", "host", "front desk", "front-desk", "counter"];

export const isCounterRole = (role) => {
  if (!role) return false;
  const r = String(role).toLowerCase();
  return COUNTER_ROLE_KEYWORDS.some((k) => r.includes(k));
};

export const defaultThemeForRole = (role) => (isCounterRole(role) ? "light" : "dark");

// Whether a user is allowed to override the default. Counter staff can
// be locked to the bright theme later via location config; for now everyone
// can override. Wire location config in here when that ships.
export const canOverrideTheme = () => true;

// ─── Storage + apply ──────────────────────────────────────────────────

export const getStoredTheme = () => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored ? normalizeTheme(stored) : null;
  } catch {
    return null;
  }
};

/**
 * Resolve the theme that should be active for a user.
 * 1. If user has a stored preference and may override → use it.
 * 2. Otherwise use role-based default.
 * 3. Fallback to dark.
 */
export const resolveThemeForUser = (user) => {
  const role = user?.role;
  const stored = getStoredTheme();
  if (stored && canOverrideTheme(role)) return stored;
  return defaultThemeForRole(role);
};

export const applyTheme = (theme) => {
  const nextTheme = normalizeTheme(theme);
  document.documentElement.dataset.theme = nextTheme;
  return nextTheme;
};

export const persistTheme = (theme) => {
  const nextTheme = applyTheme(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch (error) {
    console.error("Failed to persist theme preference:", error);
  }
  return nextTheme;
};
