import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";
import {
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  persistTheme,
} from "../lib/theme";

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme || getStoredTheme() || getSystemTheme()
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncWithSystem = () => {
      if (getStoredTheme()) return;
      setTheme(applyTheme(media.matches ? "dark" : "light"));
    };

    syncWithSystem();
    media.addEventListener("change", syncWithSystem);
    return () => media.removeEventListener("change", syncWithSystem);
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? FiSun : FiMoon;

  return (
    <button
      type="button"
      onClick={() => setTheme(persistTheme(nextTheme))}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--stroke-soft)] bg-[var(--surface-panel-strong)] text-[var(--text-base)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand-primary-border)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--brand-primary-deep)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/15 ${className}`}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}
