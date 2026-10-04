export const THEME_STORAGE_KEY = "movira-control-color-mode";

export const themeOptions = [
  { id: "light", label: "Light", shortLabel: "Light" },
  { id: "dark", label: "Dark", shortLabel: "Dark" },
];

const themeIds = new Set(themeOptions.map((theme) => theme.id));

export const getSystemTheme = () => {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const normalizeTheme = (theme) => (themeIds.has(theme) ? theme : getSystemTheme());

export const getStoredTheme = () => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return themeIds.has(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const defaultThemeForRole = () => getSystemTheme();
export const isCounterRole = () => false;
export const canOverrideTheme = () => true;

export const resolveThemeForUser = (user) => {
  void user;
  return getStoredTheme() || getSystemTheme();
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
