import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useLoginMutation } from "../../features/auth/authApi";
import {
  FiArrowRight,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiShield,
} from "react-icons/fi";
import { toast } from "sonner";
import {
  applyTheme,
  getStoredTheme,
  persistTheme,
  resolveThemeForUser,
  themeOptions,
} from "../../lib/theme";

const trustNotes = [
  "Manage SaaS parks, plans, billing, and onboarding.",
  "Review venue payment routing and gateway health.",
  "Only sections assigned to your role are shown.",
];

const REMEMBERED_EMAIL_KEY = "moviraRememberedLoginEmail";

export default function MoviraLogin() {
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const { token } = useSelector((state) => state.auth);

  const [email, setEmail] = useState(
    () => localStorage.getItem(REMEMBERED_EMAIL_KEY) || ""
  );
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(() =>
    Boolean(localStorage.getItem(REMEMBERED_EMAIL_KEY))
  );
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [theme, setTheme] = useState(() => getStoredTheme() || "dark");

  useEffect(() => {
    if (token) navigate("/movira-control/parks", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const isFormValid = email && password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error("Please enter both email and password.");
      return;
    }
    try {
      const res = await login({ email, password }).unwrap();
      toast.success(res?.message || "Signed in successfully.");
      if (rememberEmail) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      if (!getStoredTheme()) {
        const nextTheme = resolveThemeForUser(res?.user);
        setTheme(applyTheme(nextTheme));
      }
      navigate("/movira-control/parks", { replace: true });
    } catch (err) {
      const code = err?.data?.code || err?.data?.reason;
      if (code === "saas_payment_required") {
        toast.error("Payment required before login", {
          description:
            err?.data?.message ||
            "Please complete your first SaaS payment to unlock your Movira workspace.",
          duration: 7000,
        });
        return;
      }
      toast.error(err?.data?.message || "Login failed.");
    }
  };

  const handleThemeChange = (nextTheme) => {
    setTheme(persistTheme(nextTheme));
  };

  return (
    <main data-app="admin" className="login-shell">
      <header className="login-admin-header">
        <div className="login-brand-lockup" aria-label="Movira360">
          <div className="login-brand-badge">
            <img src="/branding/movira360-mark.png" alt="" />
          </div>
          <span>Movira360</span>
        </div>

        <div className="login-theme-switcher" aria-label="Choose theme">
          {themeOptions.map((option) => {
            const isActive = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleThemeChange(option.id)}
                className={`login-theme-button ${isActive ? "is-active" : ""}`}
                aria-pressed={isActive}
                title={option.label}
              >
                <span
                  className="login-theme-swatch"
                  style={{ background: option.swatch }}
                />
                <span>{option.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="login-admin-body">
        <section className="login-copy" aria-label="Welcome">
          <span className="login-eyebrow">Admin Access</span>
          <h1>Good to see you.</h1>
          <p>
            Sign in to manage parks, subscriptions, onboarding, and payment
            operations from one control workspace.
          </p>

          <div className="login-note">
            <span className="login-note-icon">
              <FiShield />
            </span>
            <div>
              <strong>Private workspace</strong>
              <span>Use your team credentials to continue.</span>
            </div>
          </div>

          <ul className="login-checklist">
            {trustNotes.map((note) => (
              <li key={note}>
                <FiCheckCircle />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="login-card" aria-labelledby="login-title">
          <div className="login-card-header">
            <span className="login-secure-chip">
              <FiShield />
              Secure sign in
            </span>
            <span className="login-admin-chip">Admin</span>
          </div>

          <h2 id="login-title">Sign in</h2>
          <p className="login-card-copy">
            Enter your Movira credentials. We&apos;ll take you straight to the
            admin workspace.
          </p>

          <form onSubmit={handleSubmit} autoComplete="on" className="login-form">
            <div className="login-form-row">
              <label htmlFor="login-email">Email address</label>
              <div className="login-input-wrap">
                <FiMail className="login-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  placeholder="you@aerosports.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-field"
                  required
                />
              </div>
            </div>

            <div className="login-form-row">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <FiLock className="login-input-icon" />
                <input
                  id="login-password"
                  type={passwordVisible ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-field"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((v) => !v)}
                  className="login-password-toggle"
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                  aria-pressed={passwordVisible}
                >
                  {passwordVisible ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
              />
              <span>Remember email on this device</span>
            </label>

            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="login-submit"
            >
              {isLoading ? (
                <>
                  <span className="login-spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <FiArrowRight />
                </>
              )}
            </button>
          </form>
        </section>
      </div>

      <footer className="login-footer">
        Movira Admin Platform &copy; {new Date().getFullYear()}
      </footer>
    </main>
  );
}
